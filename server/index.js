import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { repo, defaultNotificationPrefs } from './db.js'

const PORT = Number(process.env.PORT || 8787)
const DEFAULT_SECRET = 'contentout-dev-secret-change-in-prod'
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_SECRET
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const RESEND_API_KEY = process.env.RESEND_API_KEY
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
const AI_MODEL = 'claude-sonnet-4-6'

// Refuse to boot in production with the default signing secret.
if (process.env.NODE_ENV === 'production' && JWT_SECRET === DEFAULT_SECRET) {
  throw new Error('Set a strong JWT_SECRET in production (see DEPLOYMENT.md).')
}

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

const app = express()
app.disable('x-powered-by')
app.use(
  cors(
    allowedOrigins.length > 0
      ? { origin: allowedOrigins }
      : {}, // allow all in dev when ALLOWED_ORIGINS is unset
  ),
)
app.use(express.json())

// basic security headers
app.use((_req, res, nextFn) => {
  res.set('X-Content-Type-Options', 'nosniff')
  res.set('X-Frame-Options', 'DENY')
  res.set('Referrer-Policy', 'no-referrer')
  nextFn()
})

// simple in-memory login rate limit (per IP)
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
  if (entry.count > 20) {
    return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' })
  }
  nextFn()
}

const uid = (p) => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
const now = () => new Date().toISOString()

// ── role helpers (mirror /lib/permissions; enforced here at the data layer) ──
const isOwner = (u) => u?.role === 'owner'
const isManager = (u) => u?.role === 'owner' || u?.role === 'admin'
const canSeeProject = (u, p) => isManager(u) || p.assignedEditorId === u.id

function sanitizeUser(viewer, user) {
  const canSeePay = isOwner(viewer) || viewer.id === user.id
  const { passwordHash, ...rest } = user
  void passwordHash
  if (canSeePay) {
    return rest
  }
  return { ...rest, payModel: null, hourlyRate: null, flatRates: null }
}

// ── live notification fan-out (SSE; swap for WebSocket/SSE infra in prod) ──
const sseClients = new Map() // userId -> Set<res>
function pushLive(userId, payload) {
  const set = sseClients.get(userId)
  if (!set) {
    return
  }
  for (const res of set) {
    res.write(`data: ${JSON.stringify(payload)}\n\n`)
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

function createNotification(recipientUserId, type, projectId, body) {
  const recipient = repo.getUser(recipientUserId)
  if (!recipient) {
    return
  }
  const prefs = recipient.notificationPrefs ?? defaultNotificationPrefs()
  if (!prefs.events?.[type]) {
    return
  }
  const channels = Object.keys(prefs.channels || {}).filter((c) => prefs.channels[c])
  const notification = {
    id: uid('nf'), recipientUserId, type, projectId, body, createdAt: now(), readAt: null, channelsSent: channels,
  }
  repo.addNotification(notification)
  for (const channel of channels.filter((c) => c !== 'portal')) {
    sendChannel(channel, recipient, body)
  }
  pushLive(recipientUserId, { kind: 'notification', notification })
}

function logActivity(actorUserId, action, targetId) {
  repo.addActivity({ id: uid('al'), actorUserId, action, targetType: 'project', targetId, createdAt: now() })
}

function managerIds(exceptId) {
  return repo.listUsers().filter((u) => isManager(u) && u.id !== exceptId).map((u) => u.id)
}

// ── auth middleware ──
function auth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.query.token
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  try {
    const { sub } = jwt.verify(token, JWT_SECRET)
    const user = repo.getUser(sub)
    if (!user || user.status === 'disabled') {
      return res.status(401).json({ error: 'Invalid session' })
    }
    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid session' })
  }
}

app.get('/api/health', (_req, res) => res.json({ ok: true, ai: Boolean(ANTHROPIC_API_KEY) }))

app.post('/api/auth/login', rateLimitLogin, (req, res) => {
  const { email, password } = req.body || {}
  const user = repo.getUserByEmail(String(email || ''))
  if (!user || user.status === 'disabled' || !bcrypt.compareSync(String(password || ''), user.passwordHash)) {
    return res.status(401).json({ error: 'Those credentials don\'t match an active profile.' })
  }
  repo.touchActive(user.id)
  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '12h' })
  res.json({ token, user: sanitizeUser(user, user) })
})

app.post('/api/auth/change-password', auth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  if (!bcrypt.compareSync(String(currentPassword || ''), req.user.passwordHash)) {
    return res.status(400).json({ error: 'Current password is incorrect.' })
  }
  if (String(newPassword || '').length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' })
  }
  repo.setPassword(req.user.id, bcrypt.hashSync(String(newPassword), 10))
  res.json({ ok: true })
})

// Accept an invite: set password (+ optional profile) and activate the account.
app.post('/api/auth/claim', (req, res) => {
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
  const user = repo.getUser(payload.sub)
  if (!user) {
    return res.status(404).json({ error: 'Profile not found.' })
  }
  if (String(password || '').length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' })
  }
  repo.updateUser(user.id, {
    fullName: fullName || user.fullName,
    avatarInitials: avatarInitials || user.avatarInitials,
    timezone: timezone || user.timezone,
    status: 'active',
  })
  repo.setPassword(user.id, bcrypt.hashSync(String(password), 10))
  repo.touchActive(user.id)
  const authToken = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '12h' })
  res.json({ token: authToken, user: sanitizeUser(repo.getUser(user.id), repo.getUser(user.id)) })
})

// Preview an invite (name/email) so the claim page can greet the user.
app.get('/api/auth/invite/:token', (req, res) => {
  try {
    const payload = jwt.verify(req.params.token, JWT_SECRET)
    if (payload.purpose !== 'claim') {
      throw new Error('bad')
    }
    const user = repo.getUser(payload.sub)
    if (!user) {
      throw new Error('missing')
    }
    res.json({ fullName: user.fullName, email: user.email, role: user.role })
  } catch {
    res.status(400).json({ error: 'Invalid or expired invite.' })
  }
})

app.get('/api/bootstrap', auth, (req, res) => {
  const me = req.user
  const manager = isManager(me)
  const allProjects = repo.listProjects()
  const projects = manager ? allProjects : allProjects.filter((p) => p.assignedEditorId === me.id)
  const allTime = repo.listTimeEntries()
  const timeEntries = manager ? allTime : allTime.filter((t) => t.editorId === me.id)
  res.json({
    currentUser: sanitizeUser(me, me),
    users: repo.listUsers().map((u) => sanitizeUser(me, u)),
    clients: repo.listClients(),
    projects,
    timeEntries,
    notifications: repo.listNotificationsFor(me.id),
    activityLog: manager ? repo.listActivity() : [],
  })
})

// SSE stream for live notifications
app.get('/api/events', auth, (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
  res.flushHeaders?.()
  res.write(': connected\n\n')
  if (!sseClients.has(req.user.id)) {
    sseClients.set(req.user.id, new Set())
  }
  sseClients.get(req.user.id).add(res)
  const ping = setInterval(() => res.write(': ping\n\n'), 25000)
  req.on('close', () => {
    clearInterval(ping)
    sseClients.get(req.user.id)?.delete(res)
  })
})

function resolveOpenRevisions(project) {
  project.revisions = project.revisions.map((r) => (r.resolvedAt === null ? { ...r, resolvedAt: now() } : r))
}

app.post('/api/projects/:id/start', auth, (req, res) => {
  const project = repo.getProject(req.params.id)
  if (!project) {
    return res.status(404).json({ error: 'Not found' })
  }
  if (project.assignedEditorId !== req.user.id && !isManager(req.user)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  project.status = 'editing'
  repo.saveProject(project)
  res.json({ project })
})

app.post('/api/projects/:id/submit', auth, (req, res) => {
  const project = repo.getProject(req.params.id)
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
  repo.saveProject(project)
  logActivity(req.user.id, `submitted delivery v${version}`, project.id)
  for (const rid of new Set([project.createdByUserId, ...managerIds(req.user.id)])) {
    if (rid && rid !== req.user.id) {
      createNotification(rid, 'delivery_received', project.id, `${req.user.fullName} delivered ${project.title} (v${version})`)
    }
  }
  res.json({ project, toast: wasRevisions ? 'Resubmitted' : 'Submitted for review' })
})

app.post('/api/projects/:id/review', auth, (req, res) => {
  if (!isManager(req.user)) {
    return res.status(403).json({ error: 'Only reviewers can review deliveries.' })
  }
  const project = repo.getProject(req.params.id)
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
    repo.saveProject(project)
    logActivity(req.user.id, `approved delivery v${latest?.version ?? ''}`, project.id)
    if (project.assignedEditorId) {
      createNotification(project.assignedEditorId, 'approval', project.id, `${project.title} approved 🎉`)
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
    repo.saveProject(project)
    logActivity(req.user.id, 'requested changes', project.id)
    if (project.assignedEditorId) {
      createNotification(project.assignedEditorId, 'revision', project.id, `Changes requested on ${project.title}`)
    }
  }
  res.json({ project })
})

app.post('/api/projects/:id/comments', auth, (req, res) => {
  const project = repo.getProject(req.params.id)
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
  repo.saveProject(project)
  for (const u of repo.listUsers()) {
    const first = u.fullName.split(' ')[0].toLowerCase()
    if (u.id !== req.user.id && body.toLowerCase().includes(`@${first}`)) {
      createNotification(u.id, 'mention', project.id, `${req.user.fullName} mentioned you on ${project.title}`)
    }
  }
  res.json({ project })
})

app.patch('/api/projects/:id', auth, (req, res) => {
  if (!isManager(req.user)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  const project = repo.getProject(req.params.id)
  if (!project) {
    return res.status(404).json({ error: 'Not found' })
  }
  if (typeof req.body?.title === 'string' && req.body.title.trim()) {
    project.title = req.body.title.trim()
  }
  if (typeof req.body?.brief === 'string' && req.body.brief.trim()) {
    project.brief = req.body.brief.trim()
  }
  repo.saveProject(project)
  res.json({ project })
})

app.post('/api/time', auth, (req, res) => {
  const { projectId, hours, date } = req.body || {}
  const project = repo.getProject(projectId)
  if (!project || !canSeeProject(req.user, project)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  const value = Number(hours)
  if (!Number.isFinite(value) || value < 0.1 || value > 24) {
    return res.status(400).json({ error: 'Enter hours between 0.1 and 24.' })
  }
  const entry = { id: uid('te'), projectId, editorId: req.user.id, hours: value, date: date || now().slice(0, 10), rateApplied: req.user.hourlyRate ?? 0 }
  repo.addTimeEntry(entry)
  res.json({ entry })
})

app.post('/api/users/invite', auth, (req, res) => {
  if (!isManager(req.user)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  const { fullName, email, role } = req.body || {}
  if (role !== 'editor' && req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Admins can invite editors only.' })
  }
  const initials = String(fullName || '').split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || 'NA'
  const user = repo.addUser({
    id: uid('u'), fullName, email, passwordHash: bcrypt.hashSync(uid('tmp'), 10), role, status: 'invited',
    avatarInitials: initials, timezone: 'America/Toronto', payModel: role === 'editor' ? 'hourly' : null,
    hourlyRate: role === 'editor' ? 20 : null, flatRates: null, createdAt: now(), lastActiveAt: now(),
    notificationPrefs: defaultNotificationPrefs(),
  })
  const claimToken = jwt.sign({ sub: user.id, purpose: 'claim' }, JWT_SECRET, { expiresIn: '7d' })
  const inviteUrl = `${FRONTEND_URL}/claim?token=${claimToken}`
  res.json({ user: sanitizeUser(req.user, user), inviteUrl })
})

app.post('/api/clients', auth, (req, res) => {
  if (!isManager(req.user)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  const name = String(req.body?.name || '').trim()
  if (!name) {
    return res.status(400).json({ error: 'Client name is required.' })
  }
  const palette = ['#3B82F6', '#22C55E', '#A855F7', '#F5A623', '#EC4899', '#14B8A6']
  const client = repo.addClient({
    id: uid('c'),
    name,
    accentColor: req.body?.accentColor || palette[repo.listClients().length % palette.length],
  })
  res.json({ client })
})

app.post('/api/projects', auth, (req, res) => {
  if (!isManager(req.user)) {
    return res.status(403).json({ error: 'Only managers can create projects.' })
  }
  const { title, clientId, deliverableType, assignedEditorId, dueDate, brief, specs } = req.body || {}
  if (!String(title || '').trim() || !clientId) {
    return res.status(400).json({ error: 'Title and client are required.' })
  }
  const defaultSpecs = { aspectRatio: '9:16', resolution: '1080x1920', bitrate: '12 Mbps H.264', fileNaming: `${String(title).replace(/\s+/g, '_')}_v{n}.mp4` }
  const project = repo.addProject({
    id: uid('p'), clientId, title: String(title).trim(), deliverableType: deliverableType || 'reel',
    assignedEditorId: assignedEditorId || null, createdByUserId: req.user.id, status: 'not_started',
    dueDate: dueDate || new Date(Date.now() + 7 * 86400000).toISOString(),
    deliveryLink: null, approvedAt: null, brief: String(brief || '').trim(),
    specs: specs || defaultSpecs, assetLinks: [], deliveries: [], revisions: [], comments: [],
  })
  logActivity(req.user.id, 'created project', project.id)
  if (project.assignedEditorId) {
    createNotification(project.assignedEditorId, 'assignment', project.id, `New project assigned: ${project.title}`)
  }
  res.json({ project })
})

app.patch('/api/users/:id', auth, (req, res) => {
  if (req.params.id !== req.user.id && !isOwner(req.user)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  const updated = repo.updateUser(req.params.id, req.body || {})
  res.json({ user: sanitizeUser(req.user, updated) })
})

app.post('/api/users/:id/role', auth, (req, res) => {
  if (!isOwner(req.user)) {
    return res.status(403).json({ error: 'Only the owner can change roles.' })
  }
  const updated = repo.updateUser(req.params.id, { role: req.body?.role })
  res.json({ user: sanitizeUser(req.user, updated) })
})

app.post('/api/users/:id/status', auth, (req, res) => {
  if (!isOwner(req.user)) {
    return res.status(403).json({ error: 'Only the owner can disable profiles.' })
  }
  const updated = repo.updateUser(req.params.id, { status: req.body?.status })
  res.json({ user: sanitizeUser(req.user, updated) })
})

app.post('/api/notifications/read-all', auth, (req, res) => {
  repo.markAllRead(req.user.id)
  res.json({ ok: true })
})
app.post('/api/notifications/:id/read', auth, (req, res) => {
  repo.markRead(req.params.id, req.user.id)
  res.json({ ok: true })
})

// ── AI proxy (Anthropic server-side; graceful fallback) ──
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
function fallbackSummary(notes) {
  return (notes || []).map((n) => String(n).replace(/\.$/, '')).filter(Boolean)
}
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
  return `Here to help, ${c.firstName || 'there'}. Ask what's due, what's in review, or to draft a status update.`
}

app.post('/api/ai', auth, async (req, res) => {
  const { kind, input } = req.body || {}
  try {
    if (!ANTHROPIC_API_KEY) {
      throw new Error('no key')
    }
    if (kind === 'brief') {
      const text = await callAnthropic(
        "You write in Contentout's voice: direct, concrete, no fluff, no AI-sounding phrases, no em dashes. Given client + deliverable type + goal, output a short project brief.",
        `Client: ${input.clientName}\nDeliverable: ${input.deliverableType}\nGoal: ${input.goal}`,
      )
      return res.json({ result: text, source: 'anthropic' })
    }
    if (kind === 'summary') {
      const text = await callAnthropic(
        'Condense this feedback into a short, actionable checklist of changes for the editor. Output a JSON array of strings only.',
        (input.notes || []).join('\n'),
      )
      let parsed
      try {
        parsed = JSON.parse(text)
      } catch {
        parsed = fallbackSummary(input.notes)
      }
      return res.json({ result: parsed, source: 'anthropic' })
    }
    const text = await callAnthropic(
      "You are the Contentout assistant. Answer briefly about the user's work. Never reveal another user's data.",
      (input.messages || []).map((m) => `${m.role}: ${m.content}`).join('\n'),
    )
    return res.json({ result: text, source: 'anthropic' })
  } catch {
    // graceful fallback — never block the action
    if (kind === 'brief') {
      return res.json({ result: fallbackBrief(input), source: 'fallback' })
    }
    if (kind === 'summary') {
      return res.json({ result: fallbackSummary(input.notes), source: 'fallback' })
    }
    return res.json({ result: fallbackChat(input), source: 'fallback' })
  }
})

app.listen(PORT, () => {
  console.log(`Contentout API on http://localhost:${PORT}  (AI: ${ANTHROPIC_API_KEY ? 'live' : 'fallback'})`)
})
