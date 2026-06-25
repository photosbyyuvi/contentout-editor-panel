import { API_URL } from '../config'
import type {
  ActivityLog,
  AppNotification,
  Client,
  NotificationPrefs,
  Project,
  Role,
  TimeEntry,
  User,
} from '../types'

export type Bootstrap = {
  currentUser: User
  users: User[]
  clients: Client[]
  projects: Project[]
  timeEntries: TimeEntry[]
  notifications: AppNotification[]
  activityLog: ActivityLog[]
}

// In-memory token only (no localStorage / sessionStorage, per spec).
let token: string | null = null
export function setToken(value: string | null) {
  token = value
}
export function getToken(): string | null {
  return token
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const data = await response.json()
      message = data.error || message
    } catch {
      // ignore parse errors
    }
    throw new Error(message)
  }
  return response.json() as Promise<T>
}

export const api = {
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const result = await request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setToken(result.token)
    return result
  },
  async signup(fullName: string, email: string, password: string): Promise<{ token: string; user: User }> {
    const result = await request<{ token: string; user: User }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ fullName, email, password }),
    })
    setToken(result.token)
    return result
  },
  bootstrap: () => request<Bootstrap>('/api/bootstrap'),
  startEditing: (projectId: string) =>
    request<{ project: Project }>(`/api/projects/${projectId}/start`, { method: 'POST' }),
  submitDelivery: (projectId: string, fileLink: string, note: string) =>
    request<{ project: Project; toast: string }>(`/api/projects/${projectId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ fileLink, note }),
    }),
  review: (projectId: string, outcome: 'approved' | 'changes_requested', notes: string[]) =>
    request<{ project: Project }>(`/api/projects/${projectId}/review`, {
      method: 'POST',
      body: JSON.stringify({ outcome, notes }),
    }),
  addComment: (projectId: string, body: string) =>
    request<{ project: Project }>(`/api/projects/${projectId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
  patchProject: (projectId: string, patch: { title?: string; brief?: string }) =>
    request<{ project: Project }>(`/api/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  logHours: (projectId: string, hours: number, date: string) =>
    request<{ entry: TimeEntry }>('/api/time', {
      method: 'POST',
      body: JSON.stringify({ projectId, hours, date }),
    }),
  invite: (fullName: string, email: string, role: Role) =>
    request<{ user: User; inviteUrl: string }>('/api/users/invite', {
      method: 'POST',
      body: JSON.stringify({ fullName, email, role }),
    }),
  createClient: (name: string) =>
    request<{ client: Client }>('/api/clients', { method: 'POST', body: JSON.stringify({ name }) }),
  createProject: (data: {
    title: string
    clientId: string
    deliverableType: string
    assignedEditorId: string | null
    dueDate: string
    brief: string
  }) => request<{ project: Project }>('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: true }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  getInvite: (inviteToken: string) =>
    request<{ fullName: string; email: string; role: Role }>(`/api/auth/invite/${inviteToken}`),
  claim: (data: { token: string; password: string; fullName?: string; timezone?: string }) =>
    request<{ token: string; user: User }>('/api/auth/claim', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then((result) => {
      setToken(result.token)
      return result
    }),
  updateUser: (userId: string, patch: Partial<User>) =>
    request<{ user: User }>(`/api/users/${userId}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  setRole: (userId: string, role: Role) =>
    request<{ user: User }>(`/api/users/${userId}/role`, { method: 'POST', body: JSON.stringify({ role }) }),
  setStatus: (userId: string, status: User['status']) =>
    request<{ user: User }>(`/api/users/${userId}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
  updatePrefs: (userId: string, notificationPrefs: NotificationPrefs) =>
    request<{ user: User }>(`/api/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ notificationPrefs }),
    }),
  markAllRead: () => request<{ ok: true }>('/api/notifications/read-all', { method: 'POST' }),
  markRead: (id: string) => request<{ ok: true }>(`/api/notifications/${id}/read`, { method: 'POST' }),
  ai: <T>(kind: 'brief' | 'summary' | 'chat', input: unknown) =>
    request<{ result: T; source: string }>('/api/ai', {
      method: 'POST',
      body: JSON.stringify({ kind, input }),
    }),
  // Streams the assistant reply token-by-token, invoking onChunk as text arrives.
  async aiStream(input: unknown, onChunk: (text: string) => void): Promise<void> {
    const response = await fetch(`${API_URL}/api/ai/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ input }),
    })
    if (!response.ok || !response.body) {
      throw new Error('AI is unavailable right now.')
    }
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    for (;;) {
      const { value, done } = await reader.read()
      if (done) {
        break
      }
      onChunk(decoder.decode(value, { stream: true }))
    }
  },
  wsUrl: () => `${(API_URL ?? '').replace(/^http/, 'ws')}/ws?token=${encodeURIComponent(token ?? '')}`,
}
