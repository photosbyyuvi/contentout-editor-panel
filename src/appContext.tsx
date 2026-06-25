import { createContext, useContext, useMemo } from 'react'
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

export type Toast = { id: number; message: string }

export type AppContextValue = {
  users: User[]
  clients: Client[]
  projects: Project[]
  timeEntries: TimeEntry[]
  activityLog: ActivityLog[]
  currentUser: User | null
  user: User | null // acting user (current, or impersonated via View as)
  isViewingAs: boolean
  theme: ThemeMode
  toast: Toast | null
  notifications: AppNotification[]
  unreadCount: number
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  enterViewAs: (userId: string) => void
  exitViewAs: () => void
  toggleTheme: () => void
  showToast: (message: string) => void
  dismissToast: () => void
  startEditing: (projectId: string) => void
  submitDelivery: (projectId: string, fileLink: string, note: string) => void
  addComment: (projectId: string, body: string) => void
  logHours: (projectId: string, hours: number, dateISO: string) => void
  approveDelivery: (projectId: string) => void
  requestChanges: (projectId: string, notes: string[]) => void
  updateProject: (projectId: string, patch: Partial<Project>) => void
  updateUser: (userId: string, patch: Partial<User>) => void
  inviteUser: (fullName: string, email: string, role: Role) => void
  changeRole: (userId: string, role: Role) => void
  setUserStatus: (userId: string, status: User['status']) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  updateNotificationPrefs: (prefs: NotificationPrefs) => void
}

export const AppContext = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

export function useVisibleProjects(): Project[] {
  const { projects, user } = useApp()
  return useMemo(() => {
    if (!user) {
      return []
    }
    if (user.role === 'owner' || user.role === 'admin') {
      return projects
    }
    return projects.filter((project) => project.assignedEditorId === user.id)
  }, [projects, user])
}

export function useEditorProjects(): Project[] {
  const { projects, user } = useApp()
  return useMemo(
    () => (user ? projects.filter((project) => project.assignedEditorId === user.id) : []),
    [projects, user],
  )
}
