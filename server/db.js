import pg from 'pg'
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

const { Pool } = pg

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is required (Postgres). See DEPLOYMENT.md.')
}

// Railway/most managed Postgres need SSL; allow self-signed. Local dev uses no SSL.
const useSsl = /sslmode=require/.test(connectionString) || process.env.PGSSL === 'true'
export const pool = new Pool({
  connectionString,
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
})

const SEED_DEMO = process.env.SEED_DEMO !== 'false'

async function init() {
  // One-time clean slate: set RESET_DB=true for a single deploy, then remove it.
  if (process.env.RESET_DB === 'true') {
    await pool.query('DROP TABLE IF EXISTS users, clients, projects, time_entries, notifications, activity_log, meta CASCADE;')
    console.warn('[db] RESET_DB=true — all tables dropped and reseeded. Remove RESET_DB now so it does not wipe future deploys.')
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE, data JSONB NOT NULL);
    CREATE TABLE IF NOT EXISTS clients (id TEXT PRIMARY KEY, data JSONB NOT NULL);
    CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, data JSONB NOT NULL);
    CREATE TABLE IF NOT EXISTS time_entries (id TEXT PRIMARY KEY, data JSONB NOT NULL);
    CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, recipient_user_id TEXT, data JSONB NOT NULL);
    CREATE TABLE IF NOT EXISTS activity_log (id TEXT PRIMARY KEY, data JSONB NOT NULL);
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
  `)
  await seedIfEmpty()
  await ensureOwner()
}

// Runs on EVERY boot (independent of the one-time seed): guarantees the Owner
// account from OWNER_EMAIL/OWNER_PASSWORD exists and can sign in. The owner
// password is env-managed — change OWNER_PASSWORD to rotate it.
async function ensureOwner() {
  const email = process.env.OWNER_EMAIL
  if (!email) {
    return
  }
  const password = process.env.OWNER_PASSWORD
  const name = process.env.OWNER_NAME || 'Owner'
  const existing = await repo.getUserByEmail(email)
  if (existing) {
    if (existing.role !== 'owner' || existing.status !== 'active') {
      await repo.updateUser(existing.id, { role: 'owner', status: 'active' })
    }
    if (password) {
      await repo.setPassword(existing.id, bcrypt.hashSync(password, 10))
    }
    console.log(`[db] ensured Owner account: ${email}`)
  } else {
    await repo.addUser({
      id: `u_owner_${Date.now().toString(36)}`,
      fullName: name,
      email,
      passwordHash: bcrypt.hashSync(password || Math.random().toString(36).slice(2), 10),
      role: 'owner',
      status: 'active',
      avatarInitials: name.slice(0, 2).toUpperCase(),
      timezone: 'America/Toronto',
      payModel: null,
      hourlyRate: null,
      flatRates: null,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      notificationPrefs: defaultNotificationPrefs(),
    })
    console.log(`[db] created Owner account: ${email}`)
  }
}

async function seedIfEmpty() {
  const { rows } = await pool.query('SELECT value FROM meta WHERE key = $1', ['seeded'])
  if (rows.length > 0) {
    return
  }

  const ownerEmail = process.env.OWNER_EMAIL
  const ownerPassword = process.env.OWNER_PASSWORD
  const ownerName = process.env.OWNER_NAME || 'Owner'

  const seedUsers = SEED_DEMO
    ? USERS.map((u) => (ownerEmail && u.role === 'owner' ? { ...u, email: ownerEmail, fullName: ownerName } : u))
    : [ownerEmail ? { ...USERS[0], email: ownerEmail, fullName: ownerName, avatarInitials: ownerName.slice(0, 2).toUpperCase() } : USERS[0]]

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const u of seedUsers) {
      const password = ownerEmail && u.role === 'owner' && ownerPassword ? ownerPassword : MOCK_PASSWORD
      const record = { ...u, passwordHash: bcrypt.hashSync(password, 10), notificationPrefs: defaultNotificationPrefs() }
      await client.query('INSERT INTO users (id, email, data) VALUES ($1,$2,$3)', [u.id, u.email, record])
    }
    for (const c of SEED_DEMO ? CLIENTS : []) {
      await client.query('INSERT INTO clients (id, data) VALUES ($1,$2)', [c.id, c])
    }
    for (const p of SEED_DEMO ? PROJECTS : []) {
      await client.query('INSERT INTO projects (id, data) VALUES ($1,$2)', [p.id, p])
    }
    for (const t of SEED_DEMO ? TIME_ENTRIES : []) {
      await client.query('INSERT INTO time_entries (id, data) VALUES ($1,$2)', [t.id, t])
    }
    for (const n of SEED_DEMO ? NOTIFICATIONS : []) {
      await client.query('INSERT INTO notifications (id, recipient_user_id, data) VALUES ($1,$2,$3)', [n.id, n.recipientUserId, n])
    }
    for (const a of SEED_DEMO ? ACTIVITY_LOG : []) {
      await client.query('INSERT INTO activity_log (id, data) VALUES ($1,$2)', [a.id, a])
    }
    await client.query('INSERT INTO meta (key, value) VALUES ($1,$2)', ['seeded', new Date().toISOString()])
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

const one = (rows) => (rows[0] ? rows[0].data : null)
const many = (rows) => rows.map((r) => r.data)

export const repo = {
  init,
  getUserByEmail: async (email) =>
    one((await pool.query('SELECT data FROM users WHERE lower(email) = lower($1)', [email])).rows),
  getUser: async (id) => one((await pool.query('SELECT data FROM users WHERE id = $1', [id])).rows),
  listUsers: async () => many((await pool.query('SELECT data FROM users ORDER BY data->>\'createdAt\'')).rows),
  listClients: async () => many((await pool.query('SELECT data FROM clients')).rows),
  addClient: async (client) => {
    await pool.query('INSERT INTO clients (id, data) VALUES ($1,$2)', [client.id, client])
    return client
  },
  deleteClient: async (id) => {
    await pool.query('DELETE FROM clients WHERE id = $1', [id])
  },
  deleteProject: async (id) => {
    await pool.query('DELETE FROM projects WHERE id = $1', [id])
  },
  deleteTimeEntriesForProjects: async (projectIds) => {
    if (projectIds.length === 0) {
      return
    }
    await pool.query("DELETE FROM time_entries WHERE data->>'projectId' = ANY($1)", [projectIds])
  },
  deleteNotificationsForProjects: async (projectIds) => {
    if (projectIds.length === 0) {
      return
    }
    await pool.query("DELETE FROM notifications WHERE data->>'projectId' = ANY($1)", [projectIds])
  },
  listProjects: async () => many((await pool.query('SELECT data FROM projects')).rows),
  getProject: async (id) => one((await pool.query('SELECT data FROM projects WHERE id = $1', [id])).rows),
  addProject: async (p) => {
    await pool.query('INSERT INTO projects (id, data) VALUES ($1,$2)', [p.id, p])
    return p
  },
  saveProject: async (p) => {
    await pool.query('UPDATE projects SET data = $2 WHERE id = $1', [p.id, p])
    return p
  },
  listTimeEntries: async () => many((await pool.query('SELECT data FROM time_entries')).rows),
  addTimeEntry: async (t) => {
    await pool.query('INSERT INTO time_entries (id, data) VALUES ($1,$2)', [t.id, t])
    return t
  },
  listNotificationsFor: async (userId) =>
    many(
      (await pool.query(
        'SELECT data FROM notifications WHERE recipient_user_id = $1 ORDER BY data->>\'createdAt\' DESC',
        [userId],
      )).rows,
    ),
  addNotification: async (n) => {
    await pool.query('INSERT INTO notifications (id, recipient_user_id, data) VALUES ($1,$2,$3)', [n.id, n.recipientUserId, n])
    return n
  },
  markRead: async (id, userId) => {
    const row = one((await pool.query('SELECT data FROM notifications WHERE id = $1 AND recipient_user_id = $2', [id, userId])).rows)
    if (row && !row.readAt) {
      row.readAt = new Date().toISOString()
      await pool.query('UPDATE notifications SET data = $2 WHERE id = $1', [id, row])
    }
  },
  markAllRead: async (userId) => {
    const rows = many((await pool.query('SELECT data FROM notifications WHERE recipient_user_id = $1', [userId])).rows)
    for (const n of rows) {
      if (!n.readAt) {
        n.readAt = new Date().toISOString()
        await pool.query('UPDATE notifications SET data = $2 WHERE id = $1', [n.id, n])
      }
    }
  },
  listActivity: async () => many((await pool.query('SELECT data FROM activity_log ORDER BY data->>\'createdAt\' DESC')).rows),
  addActivity: async (a) => {
    await pool.query('INSERT INTO activity_log (id, data) VALUES ($1,$2)', [a.id, a])
    return a
  },
  addUser: async (u) => {
    const record = { ...u, notificationPrefs: u.notificationPrefs ?? defaultNotificationPrefs() }
    await pool.query('INSERT INTO users (id, email, data) VALUES ($1,$2,$3)', [u.id, u.email, record])
    return record
  },
  updateUser: async (id, patch) => {
    const current = await repo.getUser(id)
    if (!current) {
      return null
    }
    const next = {
      ...current,
      fullName: patch.fullName ?? current.fullName,
      avatarInitials: patch.avatarInitials ?? current.avatarInitials,
      timezone: patch.timezone ?? current.timezone,
      role: patch.role ?? current.role,
      status: patch.status ?? current.status,
      notificationPrefs: patch.notificationPrefs ?? current.notificationPrefs,
    }
    await pool.query('UPDATE users SET data = $2 WHERE id = $1', [id, next])
    return next
  },
  setPassword: async (id, passwordHash) => {
    const current = await repo.getUser(id)
    if (!current) {
      return
    }
    current.passwordHash = passwordHash
    if (current.status === 'invited') {
      current.status = 'active'
    }
    await pool.query('UPDATE users SET data = $2 WHERE id = $1', [id, current])
  },
  metaGet: async (key) => {
    const { rows } = await pool.query('SELECT value FROM meta WHERE key = $1', [key])
    return rows[0] ? rows[0].value : null
  },
  metaSet: async (key, value) => {
    await pool.query('INSERT INTO meta (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value = excluded.value', [key, value])
  },
  touchActive: async (id) => {
    const current = await repo.getUser(id)
    if (!current) {
      return
    }
    current.lastActiveAt = new Date().toISOString()
    await pool.query('UPDATE users SET data = $2 WHERE id = $1', [id, current])
  },
}

export { defaultNotificationPrefs }
