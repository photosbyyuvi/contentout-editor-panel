import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'
import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import {
  ACTIVITY_LOG,
  CLIENTS,
  MOCK_PASSWORD,
  NOTIFICATIONS,
  PROJECTS,
  TIME_ENTRIES,
  USERS,
  defaultNotificationPrefs,
} from './seed.js'

const here = dirname(fileURLToPath(import.meta.url))
const dataDir = join(here, 'data')
mkdirSync(dataDir, { recursive: true })

const db = new Database(process.env.SQLITE_PATH || join(dataDir, 'portal.db'))
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, fullName TEXT, email TEXT UNIQUE, passwordHash TEXT,
    role TEXT, status TEXT, avatarInitials TEXT, timezone TEXT,
    payModel TEXT, hourlyRate REAL, flatRates TEXT,
    createdAt TEXT, lastActiveAt TEXT, notificationPrefs TEXT
  );
  CREATE TABLE IF NOT EXISTS clients (id TEXT PRIMARY KEY, name TEXT, accentColor TEXT);
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY, clientId TEXT, title TEXT, deliverableType TEXT,
    assignedEditorId TEXT, createdByUserId TEXT, status TEXT, dueDate TEXT,
    deliveryLink TEXT, approvedAt TEXT, brief TEXT,
    specs TEXT, assetLinks TEXT, deliveries TEXT, revisions TEXT, comments TEXT
  );
  CREATE TABLE IF NOT EXISTS time_entries (
    id TEXT PRIMARY KEY, projectId TEXT, editorId TEXT, hours REAL, date TEXT, rateApplied REAL
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY, recipientUserId TEXT, type TEXT, projectId TEXT,
    body TEXT, createdAt TEXT, readAt TEXT, channelsSent TEXT
  );
  CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY, actorUserId TEXT, action TEXT, targetType TEXT, targetId TEXT, createdAt TEXT
  );
  CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
`)

// Production bootstrap controls:
//   SEED_DEMO=false        → seed only clients + the owner (clean instance)
//   OWNER_EMAIL / OWNER_PASSWORD / OWNER_NAME → the real owner account
const SEED_DEMO = process.env.SEED_DEMO !== 'false'

function seedIfEmpty() {
  const seeded = db.prepare('SELECT value FROM meta WHERE key = ?').get('seeded')
  if (seeded) {
    return
  }
  const insertUser = db.prepare(`INSERT INTO users
    (id, fullName, email, passwordHash, role, status, avatarInitials, timezone, payModel, hourlyRate, flatRates, createdAt, lastActiveAt, notificationPrefs)
    VALUES (@id,@fullName,@email,@passwordHash,@role,@status,@avatarInitials,@timezone,@payModel,@hourlyRate,@flatRates,@createdAt,@lastActiveAt,@notificationPrefs)`)
  const insertClient = db.prepare('INSERT INTO clients (id, name, accentColor) VALUES (@id,@name,@accentColor)')
  const insertProject = db.prepare(`INSERT INTO projects
    (id, clientId, title, deliverableType, assignedEditorId, createdByUserId, status, dueDate, deliveryLink, approvedAt, brief, specs, assetLinks, deliveries, revisions, comments)
    VALUES (@id,@clientId,@title,@deliverableType,@assignedEditorId,@createdByUserId,@status,@dueDate,@deliveryLink,@approvedAt,@brief,@specs,@assetLinks,@deliveries,@revisions,@comments)`)
  const insertTime = db.prepare('INSERT INTO time_entries (id, projectId, editorId, hours, date, rateApplied) VALUES (@id,@projectId,@editorId,@hours,@date,@rateApplied)')
  const insertNotif = db.prepare(`INSERT INTO notifications (id, recipientUserId, type, projectId, body, createdAt, readAt, channelsSent)
    VALUES (@id,@recipientUserId,@type,@projectId,@body,@createdAt,@readAt,@channelsSent)`)
  const insertActivity = db.prepare('INSERT INTO activity_log (id, actorUserId, action, targetType, targetId, createdAt) VALUES (@id,@actorUserId,@action,@targetType,@targetId,@createdAt)')

  const ownerEmail = process.env.OWNER_EMAIL
  const ownerPassword = process.env.OWNER_PASSWORD
  const ownerName = process.env.OWNER_NAME || 'Owner'
  const usersToSeed = SEED_DEMO
    ? USERS.map((u) =>
        ownerEmail && u.role === 'owner'
          ? { ...u, email: ownerEmail, fullName: ownerName }
          : u,
      )
    : [
        ownerEmail
          ? { ...USERS[0], email: ownerEmail, fullName: ownerName, avatarInitials: ownerName.slice(0, 2).toUpperCase() }
          : USERS[0],
      ]

  const tx = db.transaction(() => {
    for (const u of usersToSeed) {
      const password = ownerEmail && u.role === 'owner' && ownerPassword ? ownerPassword : MOCK_PASSWORD
      insertUser.run({
        ...u,
        passwordHash: bcrypt.hashSync(password, 10),
        flatRates: u.flatRates ? JSON.stringify(u.flatRates) : null,
        notificationPrefs: JSON.stringify(defaultNotificationPrefs()),
      })
    }
    for (const c of CLIENTS) {
      insertClient.run(c)
    }
    for (const p of SEED_DEMO ? PROJECTS : []) {
      insertProject.run({
        id: p.id, clientId: p.clientId, title: p.title, deliverableType: p.deliverableType,
        assignedEditorId: p.assignedEditorId, createdByUserId: p.createdByUserId, status: p.status,
        dueDate: p.dueDate, deliveryLink: p.deliveryLink, approvedAt: p.approvedAt, brief: p.brief,
        specs: JSON.stringify(p.specs), assetLinks: JSON.stringify(p.assetLinks),
        deliveries: JSON.stringify(p.deliveries), revisions: JSON.stringify(p.revisions),
        comments: JSON.stringify(p.comments),
      })
    }
    for (const t of SEED_DEMO ? TIME_ENTRIES : []) {
      insertTime.run(t)
    }
    for (const n of SEED_DEMO ? NOTIFICATIONS : []) {
      insertNotif.run({ ...n, channelsSent: JSON.stringify(n.channelsSent) })
    }
    for (const a of SEED_DEMO ? ACTIVITY_LOG : []) {
      insertActivity.run(a)
    }
    db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('seeded', new Date().toISOString())
  })
  tx()
}
seedIfEmpty()

// ── row → object hydration ──
function hydrateUser(row) {
  if (!row) {
    return null
  }
  return {
    id: row.id, fullName: row.fullName, email: row.email, passwordHash: row.passwordHash,
    role: row.role, status: row.status, avatarInitials: row.avatarInitials, timezone: row.timezone,
    payModel: row.payModel, hourlyRate: row.hourlyRate, flatRates: row.flatRates ? JSON.parse(row.flatRates) : null,
    createdAt: row.createdAt, lastActiveAt: row.lastActiveAt,
    notificationPrefs: row.notificationPrefs ? JSON.parse(row.notificationPrefs) : defaultNotificationPrefs(),
  }
}
function hydrateProject(row) {
  if (!row) {
    return null
  }
  return {
    id: row.id, clientId: row.clientId, title: row.title, deliverableType: row.deliverableType,
    assignedEditorId: row.assignedEditorId, createdByUserId: row.createdByUserId, status: row.status,
    dueDate: row.dueDate, deliveryLink: row.deliveryLink, approvedAt: row.approvedAt, brief: row.brief,
    specs: JSON.parse(row.specs), assetLinks: JSON.parse(row.assetLinks),
    deliveries: JSON.parse(row.deliveries), revisions: JSON.parse(row.revisions), comments: JSON.parse(row.comments),
  }
}
function hydrateNotification(row) {
  return { ...row, channelsSent: row.channelsSent ? JSON.parse(row.channelsSent) : [] }
}

export const repo = {
  getUserByEmail: (email) => hydrateUser(db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(email)),
  getUser: (id) => hydrateUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id)),
  listUsers: () => db.prepare('SELECT * FROM users').all().map(hydrateUser),
  listClients: () => db.prepare('SELECT * FROM clients').all(),
  listProjects: () => db.prepare('SELECT * FROM projects').all().map(hydrateProject),
  getProject: (id) => hydrateProject(db.prepare('SELECT * FROM projects WHERE id = ?').get(id)),
  saveProject: (p) => {
    db.prepare(`UPDATE projects SET status=@status, deliveryLink=@deliveryLink, approvedAt=@approvedAt,
      title=@title, brief=@brief, deliveries=@deliveries, revisions=@revisions, comments=@comments WHERE id=@id`).run({
      id: p.id, status: p.status, deliveryLink: p.deliveryLink, approvedAt: p.approvedAt,
      title: p.title, brief: p.brief, deliveries: JSON.stringify(p.deliveries),
      revisions: JSON.stringify(p.revisions), comments: JSON.stringify(p.comments),
    })
    return p
  },
  listTimeEntries: () => db.prepare('SELECT * FROM time_entries').all(),
  addTimeEntry: (t) => { db.prepare('INSERT INTO time_entries (id, projectId, editorId, hours, date, rateApplied) VALUES (@id,@projectId,@editorId,@hours,@date,@rateApplied)').run(t); return t },
  listNotifications: () => db.prepare('SELECT * FROM notifications').all().map(hydrateNotification),
  listNotificationsFor: (userId) => db.prepare('SELECT * FROM notifications WHERE recipientUserId = ? ORDER BY createdAt DESC').all(userId).map(hydrateNotification),
  addNotification: (n) => { db.prepare('INSERT INTO notifications (id, recipientUserId, type, projectId, body, createdAt, readAt, channelsSent) VALUES (@id,@recipientUserId,@type,@projectId,@body,@createdAt,@readAt,@channelsSent)').run({ ...n, channelsSent: JSON.stringify(n.channelsSent) }); return n },
  markRead: (id, userId) => db.prepare('UPDATE notifications SET readAt = ? WHERE id = ? AND recipientUserId = ? AND readAt IS NULL').run(new Date().toISOString(), id, userId),
  markAllRead: (userId) => db.prepare('UPDATE notifications SET readAt = ? WHERE recipientUserId = ? AND readAt IS NULL').run(new Date().toISOString(), userId),
  listActivity: () => db.prepare('SELECT * FROM activity_log ORDER BY createdAt DESC').all(),
  addActivity: (a) => { db.prepare('INSERT INTO activity_log (id, actorUserId, action, targetType, targetId, createdAt) VALUES (@id,@actorUserId,@action,@targetType,@targetId,@createdAt)').run(a); return a },
  addUser: (u) => {
    db.prepare(`INSERT INTO users (id, fullName, email, passwordHash, role, status, avatarInitials, timezone, payModel, hourlyRate, flatRates, createdAt, lastActiveAt, notificationPrefs)
      VALUES (@id,@fullName,@email,@passwordHash,@role,@status,@avatarInitials,@timezone,@payModel,@hourlyRate,@flatRates,@createdAt,@lastActiveAt,@notificationPrefs)`).run({
      ...u, flatRates: u.flatRates ? JSON.stringify(u.flatRates) : null, notificationPrefs: JSON.stringify(u.notificationPrefs ?? defaultNotificationPrefs()),
    })
    return repo.getUser(u.id)
  },
  updateUser: (id, patch) => {
    const current = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
    if (!current) {
      return null
    }
    const next = {
      fullName: patch.fullName ?? current.fullName,
      avatarInitials: patch.avatarInitials ?? current.avatarInitials,
      timezone: patch.timezone ?? current.timezone,
      role: patch.role ?? current.role,
      status: patch.status ?? current.status,
      notificationPrefs: patch.notificationPrefs ? JSON.stringify(patch.notificationPrefs) : current.notificationPrefs,
    }
    db.prepare('UPDATE users SET fullName=@fullName, avatarInitials=@avatarInitials, timezone=@timezone, role=@role, status=@status, notificationPrefs=@notificationPrefs WHERE id=@id').run({ ...next, id })
    return repo.getUser(id)
  },
  touchActive: (id) => db.prepare('UPDATE users SET lastActiveAt = ? WHERE id = ?').run(new Date().toISOString(), id),
  setPassword: (id, passwordHash) => db.prepare('UPDATE users SET passwordHash = ?, status = CASE WHEN status = ? THEN ? ELSE status END WHERE id = ?').run(passwordHash, 'invited', 'active', id),
  addClient: (client) => { db.prepare('INSERT INTO clients (id, name, accentColor) VALUES (@id,@name,@accentColor)').run(client); return client },
  addProject: (p) => {
    db.prepare(`INSERT INTO projects (id, clientId, title, deliverableType, assignedEditorId, createdByUserId, status, dueDate, deliveryLink, approvedAt, brief, specs, assetLinks, deliveries, revisions, comments)
      VALUES (@id,@clientId,@title,@deliverableType,@assignedEditorId,@createdByUserId,@status,@dueDate,@deliveryLink,@approvedAt,@brief,@specs,@assetLinks,@deliveries,@revisions,@comments)`).run({
      id: p.id, clientId: p.clientId, title: p.title, deliverableType: p.deliverableType,
      assignedEditorId: p.assignedEditorId, createdByUserId: p.createdByUserId, status: p.status,
      dueDate: p.dueDate, deliveryLink: p.deliveryLink, approvedAt: p.approvedAt, brief: p.brief,
      specs: JSON.stringify(p.specs), assetLinks: JSON.stringify(p.assetLinks),
      deliveries: JSON.stringify(p.deliveries), revisions: JSON.stringify(p.revisions), comments: JSON.stringify(p.comments),
    })
    return repo.getProject(p.id)
  },
}

export { defaultNotificationPrefs }
