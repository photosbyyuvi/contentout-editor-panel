import 'dotenv/config'
import http from 'node:http'
import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { WebSocketServer } from 'ws'
import { repo, defaultNotificationPrefs } from './db.js'

const PORT = Number(process.env.PORT || 8787)
const DEFAULT_SECRET = 'contentout-dev-secret-change-in-prod'
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_SECRET
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const RESEND_API_KEY = process.env.RESEND_API_KEY
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
const ALLOW_SIGNUP = process.env.ALLOW_SIGNUP !== 'false'
const AI_MODEL = 'claude-sonnet-4-6'

if (process.env.NODE_ENV === 'production' && JWT_SECRET === DEFAULT_SECRET) {
  throw new Error('Set a strong JWT_SECRET in production (see DEPLOYMENT.md).')
}

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean)

const app = express()
app.disable('x-powered-by')
app.use(cors(allowedOrigins.length > 0 ? { origin: allowedOrigins } : {}))
app.use(express.json())
app.use((_req, res, nextFn) => {
  res.set('X-Content-Type-Options', 'nosniff')
  res.set('X-Frame-Options', 'DENY')
  res.set('Referrer-Policy', 'no-referrer')
  nextFn()
})

const loginAttempts = new Map()
function rateLimitLogin(req, res, nextFn) {
  const key = req.ip || 'unknown'
  const nowMs = Date.now()
  const entry = loginAttempts.get(key) || { count: 0, resetAt: nowMs + 15 * 60 * 1000 }
  if (nowMs > entry.resetAt) {
    entry.count = 0
    entry.resetAt = nowMs + 15 * 60 * 1000
  }
  entry.count += 1
  loginAttempts.set(key, entry)
  if (entry.count > 30) {
    return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' })
  }
  nextFn()
}

const uid = (p) => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
const now = () => new Date().toISOString()

const isOwner = (u) => u?.role === 'owner'
const isManager = (u) => u?.role === 'owner' || u?.role === 'admin'
const canSeeProject = (u, p) => isManager(u) || p.assignedEditorId === u.id

function sanitizeUser(viewer, user) {
  const canSeePay = isOwner(viewer) || viewer.id === user.id
  const { passwordHash, ...rest } = user
  void passwordHash
  return canSeePay ? rest : { ...rest, payModel: null, hourlyRate: null, flatRates: null }
}

// ── WebSocket live notifications (always-on infra) ──
const wsClients = new Map() // userId -> Set<ws>
function pushLive(userId, payload) {
  const set = wsClients.get(userId)
  if (!set) {
    return
  }
  const message = JSON.stringify(payload)
  for (const ws of set) {
    if (ws.readyState === ws.OPEN) {
      ws.send(message)
    }
  }
}

async function sendChannel(channel, user, body) {
  try {
    if (channel === 'email' && RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'Contentout <portal@contentout.co>', to: user.email, subject: body, text: body }),
      })
    } else if (channel === 'discord' && DISCORD_WEBHOOK_URL) {
      await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: `**${user.fullName}** — ${body}` }),
      })
    } else {
      console.info(`[notify:${channel}] -> ${user.email}: ${body}`)
    }
  } catch (error) {
    console.warn(`[notify:${channel}] failed: ${error.message}`)
  }
}

async function createNotification(recipientUserId, type, projectId, body) {
  const recipient = await repo.getUser(recipientUserId)
  if (!recipient) {
    return
  }
  const prefs = recipient.notificationPrefs ?? defaultNotificationPrefs()
  // Sensible default: a missing event pref is treated as ON; only an explicit false opts out.
  if (prefs.events && prefs.events[type] === false) {
    return
  }
  const channels = Object.keys(prefs.channels || {}).filter((c) => prefs.channels[c])
  const notification = { id: uid('nf'), recipientUserId, type, projectId, body, createdAt: now(), readAt: null, channelsSent: channels }
  await repo.addNotification(notification)
  for (const channel of channels.filter((c) => c !== 'portal')) {
    sendChannel(channel, recipient, body)
  }
  pushLive(recipientUserId, { kind: 'notification', notification })
}

async function logActivity(actorUserId, action, targetId) {
  await repo.addActivity({ id: uid('al'), actorUserId, action, targetType: 'project', targetId, createdAt: now() })
}

async function managerIds(exceptId) {
  return (await repo.listUsers()).filter((u) => isManager(u) && u.id !== exceptId).map((u) => u.id)
}

async function authUser(token) {
  if (!token) {
    return null
  }
  try {
    const { sub } = jwt.verify(token, JWT_SECRET)
    const user = await repo.getUser(sub)
    return user && user.status !== 'disabled' ? user : null
  } catch {
    return null
  }
}

async function auth(req, res, nextFn) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.query.token
  const user = await authUser(token)
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  req.user = user
  nextFn()
}

const wrap = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((error) => {
  console.error(error)
  res.status(500).json({ error: 'Server error' })
})

app.get('/api/health', (_req, res) => res.json({ ok: true, ai: Boolean(ANTHROPIC_API_KEY), signup: ALLOW_SIGNUP }))

app.post('/api/auth/login', rateLimitLogin, wrap(async (req, res) => {
  const { email, password } = req.body || {}
  const user = await repo.getUserByEmail(String(email || ''))
  if (!user || user.status === 'disabled' || !bcrypt.compareSync(String(password || ''), user.passwordHash)) {
    return res.status(401).json({ error: 'Those credentials don\'t match an active profile.' })
  }
  await repo.touchActive(user.id)
  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '12h' })
  res.json({ token, user: sanitizeUser(user, user) })
}))

app.post('/api/auth/signup', rateLimitLogin, wrap(async (req, res) => {
  if (!ALLOW_SIGNUP) {
    return res.status(403).json({ error: 'Sign-up is disabled. Ask an admin for an invite.' })
  }
  const { fullName, email, password } = req.body || {}
  if (!String(fullName || '').trim() || !String(email || '').trim()) {
    return res.status(400).json({ error: 'Name and email are required.' })
  }
  if (String(password || '').length < 8) {
    return res.status(400).json({ error: 'Choose a password of at least 8 characters.' })
  }
  if (await repo.getUserByEmail(email)) {
    return res.status(409).json({ error: 'An account with that email already exists.' })
  }
  const initials = String(fullName).split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || 'NA'
  const user = await repo.addUser({
    id: uid('u'), fullName: String(fullName).trim(), email: String(email).trim(), passwordHash: bcrypt.hashSync(String(password), 10),
    role: 'editor', status: 'active', avatarInitials: initials, timezone: 'America/Toronto',
    payModel: 'hourly', hourlyRate: 20, flatRates: null, createdAt: now(), lastActiveAt: now(), notificationPrefs: defaultNotificationPrefs(),
  })
  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '12h' })
  for (const mid of await managerIds(user.id)) {
    await createNotification(mid, 'assignment', null, `${user.fullName} joined the team`)
  }
  res.json({ token, user: sanitizeUser(user, user) })
}))

app.post('/api/auth/change-password', auth, wrap(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  if (!bcrypt.compareSync(String(currentPassword || ''), req.user.passwordHash)) {
    return res.status(400).json({ error: 'Current password is incorrect.' })
  }
  if (String(newPassword || '').length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' })
  }
  await repo.setPassword(req.user.id, bcrypt.hashSync(String(newPassword), 10))
  res.json({ ok: true })
}))

app.post('/api/auth/claim', wrap(async (req, res) => {
  const { token, password, fullName, avatarInitials, timezone } = req.body || {}
  let payload
  try {
    payload = jwt.verify(String(token || ''), JWT_SECRET)
  } catch {
    return res.status(400).json({ error: 'This invite link is invalid or has expired.' })
  }
  if (payload.purpose !== 'claim') {
    return res.status(400).json({ error: 'Invalid invite token.' })
  }
  const user = await repo.getUser(payload.sub)
  if (!user) {
    return res.status(404).json({ error: 'Profile not found.' })
  }
  if (String(password || '').length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' })
  }
  await repo.updateUser(user.id, { fullName: fullName || user.fullName, avatarInitials: avatarInitials || user.avatarInitials, timezone: timezone || user.timezone, status: 'active' })
  await repo.setPassword(user.id, bcrypt.hashSync(String(password), 10))
  await repo.touchActive(user.id)
  const fresh = await repo.getUser(user.id)
  const authToken = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '12h' })
  res.json({ token: authToken, user: sanitizeUser(fresh, fresh) })
}))

app.get('/api/auth/invite/:token', wrap(async (req, res) => {
  try {
    const payload = jwt.verify(req.params.token, JWT_SECRET)
    if (payload.purpose !== 'claim') {
      throw new Error('bad')
    }
    const user = await repo.getUser(payload.sub)
    if (!user) {
      throw new Error('missing')
    }
    res.json({ fullName: user.fullName, email: user.email, role: user.role })
  } catch {
    res.status(400).json({ error: 'Invalid or expired invite.' })
  }
}))

app.get('/api/bootstrap', auth, wrap(async (req, res) => {
  const me = req.user
  const manager = isManager(me)
  const allProjects = await repo.listProjects()
  const projects = manager ? allProjects : allProjects.filter((p) => p.assignedEditorId === me.id)
  const allTime = await repo.listTimeEntries()
  const timeEntries = manager ? allTime : allTime.filter((t) => t.editorId === me.id)
  res.json({
    currentUser: sanitizeUser(me, me),
    users: (await repo.listUsers()).map((u) => sanitizeUser(me, u)),
    clients: await repo.listClients(),
    projects,
    timeEntries,
    notifications: await repo.listNotificationsFor(me.id),
    activityLog: manager ? await repo.listActivity() : [],
  })
}))

function resolveOpenRevisions(project) {
  project.revisions = project.revisions.map((r) => (r.resolvedAt === null ? { ...r, resolvedAt: now() } : r))
}

app.post('/api/projects/:id/start', auth, wrap(async (req, res) => {
  const project = await repo.getProject(req.params.id)
  if (!project) {
    return res.status(404).json({ error: 'Not found' })
  }
  if (project.assignedEditorId !== req.user.id && !isManager(req.user)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  project.status = 'editing'
  await repo.saveProject(project)
  res.json({ project })
}))

app.post('/api/projects/:id/submit', auth, wrap(async (req, res) => {
  const project = await repo.getProject(req.params.id)
  if (!project) {
    return res.status(404).json({ error: 'Not found' })
  }
  if (project.assignedEditorId !== req.user.id && !isManager(req.user)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  const { fileLink, note } = req.body || {}
  if (!fileLink || !String(fileLink).trim()) {
    return res.status(400).json({ error: 'A delivery link is required.' })
  }
  const wasRevisions = project.status === 'revisions_requested'
  const version = project.deliveries.length + 1
  project.deliveries.push({
    id: uid('dl'), projectId: project.id, editorId: project.assignedEditorId ?? req.user.id,
    fileLink: String(fileLink).trim(), note: String(note || '').trim(), version, submittedAt: now(),
    reviewedByUserId: null, outcome: 'pending', reviewedAt: null,
  })
  project.deliveryLink = String(fileLink).trim()
  project.status = 'submitted'
  project.approvedAt = null
  resolveOpenRevisions(project)
  await repo.saveProject(project)
  await logActivity(req.user.id, `submitted delivery v${version}`, project.id)
  for (const rid of new Set([project.createdByUserId, ...(await managerIds(req.user.id))])) {
    if (rid && rid !== req.user.id) {
      await createNotification(rid, 'delivery_received', project.id, `${req.user.fullName} delivered ${project.title} (v${version})`)
    }
  }
  res.json({ project, toast: wasRevisions ? 'Resubmitted' : 'Submitted for review' })
}))

app.post('/api/projects/:id/review', auth, wrap(async (req, res) => {
  if (!isManager(req.user)) {
    return res.status(403).json({ error: 'Only reviewers can review deliveries.' })
  }
  const project = await repo.getProject(req.params.id)
  if (!project) {
    return res.status(404).json({ error: 'Not found' })
  }
  const { outcome, notes } = req.body || {}
  const latest = project.deliveries.reduce((a, b) => (!a || b.version > a.version ? b : a), null)
  const stamp = now()
  if (outcome === 'approved') {
    project.status = 'approved'
    project.approvedAt = stamp
    if (latest) {
      latest.outcome = 'approved'
      latest.reviewedByUserId = req.user.id
      latest.reviewedAt = stamp
    }
    await repo.saveProject(project)
    await logActivity(req.user.id, `approved delivery v${latest?.version ?? ''}`, project.id)
    if (project.assignedEditorId) {
      await createNotification(project.assignedEditorId, 'approval', project.id, `${project.title} approved 🎉`)
    }
  } else {
    const clean = (notes || []).map((n) => String(n).trim()).filter(Boolean)
    if (clean.length === 0) {
      return res.status(400).json({ error: 'Add at least one change note.' })
    }
    project.status = 'revisions_requested'
    project.approvedAt = null
    if (latest) {
      latest.outcome = 'changes_requested'
      latest.reviewedByUserId = req.user.id
      latest.reviewedAt = stamp
    }
    project.revisions.push({ round: project.revisions.length + 1, notes: clean, requestedByUserId: req.user.id, requestedAt: stamp, resolvedAt: null })
    await repo.saveProject(project)
    await logActivity(req.user.id, 'requested changes', project.id)
    if (project.assignedEditorId) {
      await createNotification(project.assignedEditorId, 'revision', project.id, `Changes requested on ${project.title}`)
    }
  }
  res.json({ project })
}))

app.post('/api/projects/:id/comments', auth, wrap(async (req, res) => {
  const project = await repo.getProject(req.params.id)
  if (!project) {
    return res.status(404).json({ error: 'Not found' })
  }
  if (!canSeeProject(req.user, project)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  const body = String(req.body?.body || '').trim()
  if (!body) {
    return res.status(400).json({ error: 'Empty comment' })
  }
  project.comments.push({ id: uid('cm'), authorUserId: req.user.id, authorName: req.user.fullName, body, createdAt: now() })
  await repo.saveProject(project)
  for (const u of await repo.listUsers()) {
    const first = u.fullName.split(' ')[0].toLowerCase()
    if (u.id !== req.user.id && body.toLowerCase().includes(`@${first}`)) {
      await createNotification(u.id, 'mention', project.id, `${req.user.fullName} mentioned you on ${project.title}`)
    }
  }
  res.json({ project })
}))

app.patch('/api/projects/:id', auth, wrap(async (req, res) => {
  if (!isManager(req.user)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  const project = await repo.getProject(req.params.id)
  if (!project) {
    return res.status(404).json({ error: 'Not found' })
  }
  if (typeof req.body?.title === 'string' && req.body.title.trim()) {
    project.title = req.body.title.trim()
  }
  if (typeof req.body?.brief === 'string' && req.body.brief.trim()) {
    project.brief = req.body.brief.trim()
  }
  await repo.saveProject(project)
  res.json({ project })
}))

app.post('/api/time', auth, wrap(async (req, res) => {
  const { projectId, hours, date } = req.body || {}
  const project = await repo.getProject(projectId)
  if (!project || !canSeeProject(req.user, project)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  const value = Number(hours)
  if (!Number.isFinite(value) || value < 0.1 || value > 24) {
    return res.status(400).json({ error: 'Enter hours between 0.1 and 24.' })
  }
  const entry = { id: uid('te'), projectId, editorId: req.user.id, hours: value, date: date || now().slice(0, 10), rateApplied: req.user.hourlyRate ?? 0 }
  await repo.addTimeEntry(entry)
  res.json({ entry })
}))

app.post('/api/users/invite', auth, wrap(async (req, res) => {
  if (!isManager(req.user)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  const { fullName, email, role } = req.body || {}
  if (role !== 'editor' && req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Admins can invite editors only.' })
  }
  const initials = String(fullName || '').split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || 'NA'
  const user = await repo.addUser({
    id: uid('u'), fullName, email, passwordHash: bcrypt.hashSync(uid('tmp'), 10), role, status: 'invited',
    avatarInitials: initials, timezone: 'America/Toronto', payModel: role === 'editor' ? 'hourly' : null,
    hourlyRate: role === 'editor' ? 20 : null, flatRates: null, createdAt: now(), lastActiveAt: now(), notificationPrefs: defaultNotificationPrefs(),
  })
  const claimToken = jwt.sign({ sub: user.id, purpose: 'claim' }, JWT_SECRET, { expiresIn: '7d' })
  res.json({ user: sanitizeUser(req.user, user), inviteUrl: `${FRONTEND_URL}/claim?token=${claimToken}` })
}))

app.post('/api/clients', auth, wrap(async (req, res) => {
  if (!isManager(req.user)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  const name = String(req.body?.name || '').trim()
  if (!name) {
    return res.status(400).json({ error: 'Client name is required.' })
  }
  const palette = ['#3B82F6', '#22C55E', '#A855F7', '#F5A623', '#EC4899', '#14B8A6']
  const client = await repo.addClient({ id: uid('c'), name, accentColor: req.body?.accentColor || palette[(await repo.listClients()).length % palette.length] })
  res.json({ client })
}))

app.delete('/api/clients/:id', auth, wrap(async (req, res) => {
  if (!isManager(req.user)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  const clients = await repo.listClients()
  const client = clients.find((c) => c.id === req.params.id)
  if (!client) {
    return res.status(404).json({ error: 'Client not found.' })
  }
  const projects = (await repo.listProjects()).filter((p) => p.clientId === req.params.id)
  // Never orphan data: if projects are attached, require explicit cascade confirmation.
  if (projects.length > 0 && req.query.cascade !== 'true') {
    return res.status(409).json({ error: 'Client has attached projects.', projectCount: projects.length })
  }
  const projectIds = projects.map((p) => p.id)
  await repo.deleteTimeEntriesForProjects(projectIds)
  await repo.deleteNotificationsForProjects(projectIds)
  for (const p of projects) {
    await repo.deleteProject(p.id)
  }
  await repo.deleteClient(req.params.id)
  await logActivity(req.user.id, `deleted client ${client.name}`, req.params.id)
  res.json({ ok: true, deletedProjects: projects.length })
}))

app.post('/api/projects', auth, wrap(async (req, res) => {
  if (!isManager(req.user)) {
    return res.status(403).json({ error: 'Only managers can create projects.' })
  }
  const { title, clientId, deliverableType, assignedEditorId, dueDate, brief, specs } = req.body || {}
  if (!String(title || '').trim() || !clientId) {
    return res.status(400).json({ error: 'Title and client are required.' })
  }
  const defaultSpecs = { aspectRatio: '9:16', resolution: '1080x1920', bitrate: '12 Mbps H.264', fileNaming: `${String(title).replace(/\s+/g, '_')}_v{n}.mp4` }
  const project = await repo.addProject({
    id: uid('p'), clientId, title: String(title).trim(), deliverableType: deliverableType || 'reel',
    assignedEditorId: assignedEditorId || null, createdByUserId: req.user.id, status: 'not_started',
    dueDate: dueDate || new Date(Date.now() + 7 * 86400000).toISOString(), deliveryLink: null, approvedAt: null,
    brief: String(brief || '').trim(), specs: specs || defaultSpecs, assetLinks: [], deliveries: [], revisions: [], comments: [],
  })
  await logActivity(req.user.id, 'created project', project.id)
  if (project.assignedEditorId) {
    await createNotification(project.assignedEditorId, 'assignment', project.id, `New project assigned: ${project.title}`)
  }
  res.json({ project })
}))

app.patch('/api/users/:id', auth, wrap(async (req, res) => {
  if (req.params.id !== req.user.id && !isOwner(req.user)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  res.json({ user: sanitizeUser(req.user, await repo.updateUser(req.params.id, req.body || {})) })
}))

app.post('/api/users/:id/role', auth, wrap(async (req, res) => {
  if (!isOwner(req.user)) {
    return res.status(403).json({ error: 'Only the owner can change roles.' })
  }
  res.json({ user: sanitizeUser(req.user, await repo.updateUser(req.params.id, { role: req.body?.role })) })
}))

app.post('/api/users/:id/status', auth, wrap(async (req, res) => {
  if (!isOwner(req.user)) {
    return res.status(403).json({ error: 'Only the owner can disable profiles.' })
  }
  res.json({ user: sanitizeUser(req.user, await repo.updateUser(req.params.id, { status: req.body?.status })) })
}))

app.post('/api/notifications/read-all', auth, wrap(async (req, res) => {
  await repo.markAllRead(req.user.id)
  res.json({ ok: true })
}))
app.post('/api/notifications/:id/read', auth, wrap(async (req, res) => {
  await repo.markRead(req.params.id, req.user.id)
  res.json({ ok: true })
}))

// ── AI (Anthropic server-side; graceful fallback) ──
async function callAnthropic(system, userText) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: AI_MODEL, max_tokens: 1000, system, messages: [{ role: 'user', content: userText }] }),
  })
  if (!response.ok) {
    throw new Error(`Anthropic ${response.status}`)
  }
  const data = await response.json()
  return data.content?.[0]?.text ?? ''
}

function fallbackBrief(input) {
  const goal = (input.goal || '').trim() || 'drive awareness and trust'
  return `${input.clientName} ${String(input.deliverableType).replace('_', ' ')}. Goal: ${goal}. Open on the strongest moment, no slow intro, land the point in the first two seconds. Keep the cut clean and confident with one accent color and motion that guides. Close on a clear payoff: the offer, the result, or the call to action.`
}
const fallbackSummary = (notes) => (notes || []).map((n) => String(n).replace(/\.$/, '')).filter(Boolean)
function fallbackChat(input) {
  const c = input.context || {}
  const last = (input.messages?.[input.messages.length - 1]?.content || '').toLowerCase()
  if (last.includes('due') || last.includes('today')) {
    const parts = []
    if (c.overdueTitles?.length) {
      parts.push(`Overdue: ${c.overdueTitles.join(', ')}.`)
    }
    if (c.dueTodayTitles?.length) {
      parts.push(`Due soon: ${c.dueTodayTitles.join(', ')}.`)
    }
    return parts.join(' ') || `Nothing is due today, ${c.firstName || 'there'}. You're clear.`
  }
  if (last.includes('review')) {
    return c.inReviewTitles?.length ? `In review: ${c.inReviewTitles.join(', ')}.` : 'Nothing is in review.'
  }
  if (last.includes('status') || last.includes('update')) {
    return `Draft status update: wrapped the priority cuts, ${c.inReviewTitles?.length ?? 0} in review and ${c.overdueTitles?.length ?? 0} needing attention. Will deliver the rest on schedule.`
  }
  return `Here to help, ${c.firstName || 'there'}. Ask what's due, what's in review, or to draft a status update.`
}

app.post('/api/ai', auth, wrap(async (req, res) => {
  const { kind, input } = req.body || {}
  try {
    if (!ANTHROPIC_API_KEY) {
      throw new Error('no key')
    }
    if (kind === 'brief') {
      return res.json({ result: await callAnthropic("You write in Contentout's voice: direct, concrete, no fluff, no AI-sounding phrases, no em dashes. Given client + deliverable type + goal, output a short project brief.", `Client: ${input.clientName}\nDeliverable: ${input.deliverableType}\nGoal: ${input.goal}`), source: 'anthropic' })
    }
    if (kind === 'summary') {
      const text = await callAnthropic('Condense this feedback into a short, actionable checklist of changes for the editor. Output a JSON array of strings only.', (input.notes || []).join('\n'))
      let parsed
      try {
        parsed = JSON.parse(text)
      } catch {
        parsed = fallbackSummary(input.notes)
      }
      return res.json({ result: parsed, source: 'anthropic' })
    }
    return res.json({ result: await callAnthropic("You are the Contentout assistant. Answer briefly about the user's work.", (input.messages || []).map((m) => `${m.role}: ${m.content}`).join('\n')), source: 'anthropic' })
  } catch {
    if (kind === 'brief') {
      return res.json({ result: fallbackBrief(input), source: 'fallback' })
    }
    if (kind === 'summary') {
      return res.json({ result: fallbackSummary(input.notes), source: 'fallback' })
    }
    return res.json({ result: fallbackChat(input), source: 'fallback' })
  }
}))

// Streaming chat: tokens stream to the client as they arrive (always-on infra).
app.post('/api/ai/stream', auth, wrap(async (req, res) => {
  const { input } = req.body || {}
  res.set({ 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' })
  try {
    if (!ANTHROPIC_API_KEY) {
      throw new Error('no key')
    }
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: AI_MODEL, max_tokens: 1000, stream: true, system: "You are the Contentout assistant. Answer briefly about the user's work.", messages: (input.messages || []).map((m) => ({ role: m.role, content: m.content })) }),
    })
    if (!upstream.ok || !upstream.body) {
      throw new Error('stream failed')
    }
    const reader = upstream.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    for (;;) {
      const { value, done } = await reader.read()
      if (done) {
        break
      }
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const evt = JSON.parse(line.slice(6))
            if (evt.type === 'content_block_delta' && evt.delta?.text) {
              res.write(evt.delta.text)
            }
          } catch {
            // ignore non-JSON keepalive lines
          }
        }
      }
    }
    res.end()
  } catch {
    // graceful fallback — stream the templated answer word by word
    const text = fallbackChat(input)
    for (const word of text.split(' ')) {
      res.write(word + ' ')
      await new Promise((r) => setTimeout(r, 60))
    }
    res.end()
  }
}))

// ── Scheduled digests + deadline reminders (always-on, in-process; no extra Railway service) ──
const DIGEST_HOUR = Number(process.env.DIGEST_HOUR || 8) // editor's local hour

function localDate(tz, d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}
function localHour(tz, d = new Date()) {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false }).format(d))
}

async function runScheduler({ force = false } = {}) {
  const nowMs = Date.now()
  const users = await repo.listUsers()
  const projects = await repo.listProjects()
  let digests = 0
  let reminders = 0

  for (const user of users) {
    if (user.role !== 'editor' || user.status !== 'active') {
      continue
    }
    const tz = user.timezone || 'America/Toronto'
    const today = localDate(tz)
    const mine = projects.filter((p) => p.assignedEditorId === user.id && p.status !== 'approved')

    // ---- Daily digest (once per local day, around DIGEST_HOUR) ----
    const digestKey = `digest:${user.id}:${today}`
    const dueWindow = (p) => (new Date(p.dueDate).getTime() - nowMs) / 36e5
    const overdue = mine.filter((p) => dueWindow(p) < 0)
    const dueSoon = mine.filter((p) => dueWindow(p) >= 0 && dueWindow(p) <= 24)
    const inReview = projects.filter((p) => p.assignedEditorId === user.id && p.status === 'submitted')
    const shouldDigest = force || (localHour(tz) === DIGEST_HOUR && !(await repo.metaGet(digestKey)))
    if (shouldDigest && mine.length > 0) {
      const body = `Daily digest — ${mine.length} active: ${dueSoon.length} due soon, ${overdue.length} overdue, ${inReview.length} in review.`
      await createNotification(user.id, 'digest', null, body)
      digests += 1
    }
    if (!force && localHour(tz) === DIGEST_HOUR) {
      await repo.metaSet(digestKey, new Date().toISOString())
    }

    // ---- Deadline reminders (deduped per project per due-date) ----
    const tomorrow = localDate(tz, new Date(nowMs + 24 * 36e5))
    for (const p of mine) {
      const dueLocal = localDate(tz, new Date(p.dueDate))
      if (dueLocal === tomorrow) {
        const key = `reminder:due_tomorrow:${p.id}:${dueLocal}`
        if (force || !(await repo.metaGet(key))) {
          await createNotification(user.id, 'reminder', p.id, `Due tomorrow: ${p.title}`)
          if (!force) {
            await repo.metaSet(key, new Date().toISOString())
          }
          reminders += 1
        }
      } else if (new Date(p.dueDate).getTime() < nowMs) {
        const key = `reminder:overdue:${p.id}:${dueLocal}`
        if (force || !(await repo.metaGet(key))) {
          await createNotification(user.id, 'reminder', p.id, `Overdue: ${p.title}`)
          if (!force) {
            await repo.metaSet(key, new Date().toISOString())
          }
          reminders += 1
        }
      }
    }
  }
  return { digests, reminders }
}

// Owner-only manual trigger (handy for testing without waiting for the digest hour).
app.post('/api/scheduler/run', auth, wrap(async (req, res) => {
  if (!isOwner(req.user)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  const result = await runScheduler({ force: true })
  res.json(result)
}))

const server = http.createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })
wss.on('connection', async (ws, req) => {
  const url = new URL(req.url, 'http://localhost')
  const user = await authUser(url.searchParams.get('token'))
  if (!user) {
    ws.close(4001, 'unauthorized')
    return
  }
  if (!wsClients.has(user.id)) {
    wsClients.set(user.id, new Set())
  }
  wsClients.get(user.id).add(ws)
  ws.send(JSON.stringify({ kind: 'connected' }))
  ws.on('close', () => wsClients.get(user.id)?.delete(ws))
  ws.on('error', () => wsClients.get(user.id)?.delete(ws))
})

repo
  .init()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Contentout API on http://localhost:${PORT}  (AI: ${ANTHROPIC_API_KEY ? 'live' : 'fallback'}, signup: ${ALLOW_SIGNUP})`)
    })
    // Tick every 15 minutes; digests fire at the editor's local DIGEST_HOUR, deduped per day.
    setInterval(() => {
      runScheduler().catch((error) => console.warn('[scheduler]', error.message))
    }, 15 * 60 * 1000)
  })
  .catch((error) => {
    console.error('Failed to start:', error)
    process.exit(1)
  })
