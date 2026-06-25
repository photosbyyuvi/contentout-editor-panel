import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AppContext, type AppContextValue, type Toast } from './appContext'
import { api, setToken } from './lib/api'
import type {
  ActivityLog,
  AppNotification,
  Client,
  NotificationPrefs,
  Project,
  Role,
  ThemeMode,
  TimeEntry,
  User,
} from './types'

let toastCounter = 0

export function BackendAppProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([])
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [viewAsUserId, setViewAsUserId] = useState<string | null>(null)
  const [theme, setTheme] = useState<ThemeMode>('dark')
  const [toast, setToast] = useState<Toast | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const showToast = useCallback((message: string) => {
    setToast({ id: ++toastCounter, message })
  }, [])
  const dismissToast = useCallback(() => setToast(null), [])

  const applyBootstrap = useCallback((data: Awaited<ReturnType<typeof api.bootstrap>>) => {
    setUsers(data.users)
    setClients(data.clients)
    setProjects(data.projects)
    setTimeEntries(data.timeEntries)
    setActivityLog(data.activityLog)
    setNotifications(data.notifications)
    setCurrentUserId(data.currentUser.id)
  }, [])

  const refresh = useCallback(async () => {
    const data = await api.bootstrap()
    applyBootstrap(data)
  }, [applyBootstrap])

  const mergeProject = useCallback((project: Project) => {
    setProjects((prev) => prev.map((p) => (p.id === project.id ? project : p)))
  }, [])

  // optimistic project action: update UI instantly, then sync the rest in the background
  const projectAction = useCallback(
    async (fn: () => Promise<{ project: Project }>, successToast?: string) => {
      try {
        const { project } = await fn()
        mergeProject(project)
        if (successToast) {
          showToast(successToast)
        }
        void refresh()
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Couldn\'t save — try again')
      }
    },
    [mergeProject, refresh, showToast],
  )

  // run an action, refresh, and surface failures without blocking the UI
  const run = useCallback(
    async (fn: () => Promise<unknown>, successToast?: string) => {
      try {
        await fn()
        await refresh()
        if (successToast) {
          showToast(successToast)
        }
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Couldn\'t save — try again')
      }
    },
    [refresh, showToast],
  )

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        await api.login(email, password)
        await refresh()
        return true
      } catch {
        return false
      }
    },
    [refresh],
  )

  const logout = useCallback(() => {
    setToken(null)
    wsRef.current?.close()
    wsRef.current = null
    setCurrentUserId(null)
    setViewAsUserId(null)
    setUsers([])
    setProjects([])
    setTimeEntries([])
    setNotifications([])
    setActivityLog([])
  }, [])

  // live notifications via WebSocket (instant, no refresh)
  useEffect(() => {
    if (!currentUserId) {
      return
    }
    let closed = false
    let socket: WebSocket | null = null
    let retry: number | undefined
    const connect = () => {
      socket = new WebSocket(api.wsUrl())
      wsRef.current = socket
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          if (payload.kind === 'notification') {
            setNotifications((prev) => [payload.notification, ...prev])
            showToast(payload.notification.body)
            // also re-sync data so any open view (project/queue/team) updates live
            void refresh()
          }
        } catch {
          // ignore non-JSON frames
        }
      }
      socket.onclose = () => {
        if (!closed) {
          retry = window.setTimeout(connect, 2000)
        }
      }
    }
    connect()
    return () => {
      closed = true
      window.clearTimeout(retry)
      socket?.close()
      wsRef.current = null
    }
  }, [currentUserId, showToast, refresh])

  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) ?? null,
    [users, currentUserId],
  )
  const viewAsUser = useMemo(
    () => users.find((u) => u.id === viewAsUserId) ?? null,
    [users, viewAsUserId],
  )
  const actingUser = useMemo(() => viewAsUser ?? currentUser, [viewAsUser, currentUser])

  const userNotifications = useMemo(
    () =>
      notifications
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [notifications],
  )
  const unreadCount = useMemo(
    () => userNotifications.filter((n) => !n.readAt).length,
    [userNotifications],
  )

  const value = useMemo<AppContextValue>(
    () => ({
      users,
      clients,
      projects,
      timeEntries,
      activityLog,
      currentUser,
      user: actingUser,
      isViewingAs: viewAsUser !== null,
      theme,
      toast,
      notifications: userNotifications,
      unreadCount,
      login,
      logout,
      enterViewAs: (userId: string) => setViewAsUserId(userId),
      exitViewAs: () => setViewAsUserId(null),
      toggleTheme: () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark')),
      showToast,
      dismissToast,
      startEditing: (projectId) => void projectAction(() => api.startEditing(projectId)),
      submitDelivery: (projectId, fileLink, note) =>
        void (async () => {
          try {
            const { project, toast: message } = await api.submitDelivery(projectId, fileLink, note)
            mergeProject(project)
            showToast(message)
            void refresh()
          } catch (error) {
            showToast(error instanceof Error ? error.message : 'Couldn\'t save — try again')
          }
        })(),
      addComment: (projectId, body) => void projectAction(() => api.addComment(projectId, body)),
      logHours: (projectId, hours, dateISO) =>
        void (async () => {
          try {
            const { entry } = await api.logHours(projectId, hours, dateISO.slice(0, 10))
            setTimeEntries((prev) => [...prev, entry])
            showToast(`Logged ${hours.toFixed(1)}h`)
          } catch (error) {
            showToast(error instanceof Error ? error.message : 'Couldn\'t save — try again')
          }
        })(),
      approveDelivery: (projectId) => void projectAction(() => api.review(projectId, 'approved', []), 'Delivery approved'),
      requestChanges: (projectId, notes) =>
        void projectAction(() => api.review(projectId, 'changes_requested', notes), 'Changes requested'),
      updateProject: (projectId, patch) =>
        void projectAction(() => api.patchProject(projectId, { title: patch.title, brief: patch.brief })),
      updateUser: (userId, patch) => void run(() => api.updateUser(userId, patch)),
      inviteUser: async (fullName, email, role) => {
        try {
          const { inviteUrl } = await api.invite(fullName, email, role)
          await refresh()
          return inviteUrl
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Couldn\'t invite — try again')
          return null
        }
      },
      changeRole: (userId, role: Role) => void run(() => api.setRole(userId, role)),
      setUserStatus: (userId, status) => void run(() => api.setStatus(userId, status)),
      createClient: async (name) => {
        const { client } = await api.createClient(name)
        await refresh()
        return client
      },
      createProject: async (data) => {
        const { project } = await api.createProject(data)
        setProjects((prev) => [...prev, project])
        showToast('Project created')
        void refresh()
      },
      changePassword: async (currentPassword, newPassword) => {
        await api.changePassword(currentPassword, newPassword)
      },
      markNotificationRead: (id) => {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)))
        void api.markRead(id).catch(() => undefined)
      },
      markAllNotificationsRead: () => {
        setNotifications((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })))
        void api.markAllRead().catch(() => undefined)
      },
      updateNotificationPrefs: (prefs: NotificationPrefs) => {
        if (actingUser) {
          void run(() => api.updatePrefs(actingUser.id, prefs), 'Preferences saved')
        }
      },
    }),
    [
      users,
      clients,
      projects,
      timeEntries,
      activityLog,
      currentUser,
      actingUser,
      viewAsUser,
      theme,
      toast,
      userNotifications,
      unreadCount,
      login,
      logout,
      run,
      projectAction,
      mergeProject,
      refresh,
      showToast,
      dismissToast,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
