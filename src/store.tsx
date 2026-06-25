import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  CLIENTS,
  EDITORS,
  PROJECTS,
  TIME_ENTRIES,
  buildNotificationsForEditor,
  getProjectsForEditor,
} from './data'
import { formatHours } from './format'
import type {
  AppNotification,
  Client,
  Editor,
  Project,
  ThemeMode,
  TimeEntry,
} from './types'

type Toast = { id: number; message: string }

type AppContextValue = {
  editors: Editor[]
  clients: Client[]
  projects: Project[]
  timeEntries: TimeEntry[]
  activeEditor: Editor | null
  theme: ThemeMode
  toast: Toast | null
  notifications: AppNotification[]
  unreadCount: number
  signIn: (editorId: string) => void
  signOut: () => void
  toggleTheme: () => void
  showToast: (message: string) => void
  dismissToast: () => void
  startEditing: (projectId: string) => void
  submitWork: (projectId: string, deliveryLink: string) => void
  resubmitWork: (projectId: string, deliveryLink: string) => void
  saveDeliveryLink: (projectId: string, deliveryLink: string) => void
  addComment: (projectId: string, body: string) => void
  logHours: (projectId: string, hours: number, dateISO: string) => void
  markNotificationsRead: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

let toastCounter = 0

export function AppProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(PROJECTS)
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(TIME_ENTRIES)
  const [activeEditorId, setActiveEditorId] = useState<string | null>(null)
  const [theme, setTheme] = useState<ThemeMode>('dark')
  const [toast, setToast] = useState<Toast | null>(null)
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([])

  const activeEditor = useMemo(
    () => EDITORS.find((editor) => editor.id === activeEditorId) ?? null,
    [activeEditorId],
  )

  const showToast = useCallback((message: string) => {
    setToast({ id: ++toastCounter, message })
  }, [])

  const dismissToast = useCallback(() => setToast(null), [])

  const signIn = useCallback((editorId: string) => {
    setActiveEditorId(editorId)
    setReadNotificationIds([])
  }, [])

  const signOut = useCallback(() => {
    setActiveEditorId(null)
    setReadNotificationIds([])
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  const patchProject = useCallback(
    (projectId: string, updater: (project: Project) => Project) => {
      setProjects((prev) =>
        prev.map((project) => (project.id === projectId ? updater(project) : project)),
      )
    },
    [],
  )

  const resolveOpenRevisions = (project: Project): Project => ({
    ...project,
    revisions: project.revisions.map((revision) =>
      revision.resolvedAt === null
        ? { ...revision, resolvedAt: new Date().toISOString() }
        : revision,
    ),
  })

  const startEditing = useCallback(
    (projectId: string) => {
      patchProject(projectId, (project) => ({ ...project, status: 'editing' }))
    },
    [patchProject],
  )

  const sendForReview = useCallback(
    (projectId: string, deliveryLink: string, toastMessage: string) => {
      patchProject(projectId, (project) =>
        resolveOpenRevisions({
          ...project,
          status: 'submitted',
          deliveryLink: deliveryLink.trim(),
          approvedAt: null,
        }),
      )
      showToast(toastMessage)
    },
    [patchProject, showToast],
  )

  const submitWork = useCallback(
    (projectId: string, deliveryLink: string) =>
      sendForReview(projectId, deliveryLink, 'Submitted for review'),
    [sendForReview],
  )

  const resubmitWork = useCallback(
    (projectId: string, deliveryLink: string) =>
      sendForReview(projectId, deliveryLink, 'Resubmitted'),
    [sendForReview],
  )

  const saveDeliveryLink = useCallback(
    (projectId: string, deliveryLink: string) => {
      patchProject(projectId, (project) => ({ ...project, deliveryLink: deliveryLink.trim() }))
    },
    [patchProject],
  )

  const addComment = useCallback(
    (projectId: string, body: string) => {
      if (!activeEditor) {
        return
      }
      patchProject(projectId, (project) => ({
        ...project,
        comments: [
          ...project.comments,
          {
            id: `cm-${crypto.randomUUID()}`,
            authorName: activeEditor.name,
            body: body.trim(),
            createdAt: new Date().toISOString(),
          },
        ],
      }))
    },
    [activeEditor, patchProject],
  )

  const logHours = useCallback(
    (projectId: string, hours: number, dateISO: string) => {
      if (!activeEditor) {
        return
      }
      setTimeEntries((prev) => [
        ...prev,
        {
          id: `te-${crypto.randomUUID()}`,
          projectId,
          editorId: activeEditor.id,
          hours,
          date: dateISO,
          rateApplied: activeEditor.hourlyRate ?? 0,
        },
      ])
      showToast(`Logged ${formatHours(hours)}`)
    },
    [activeEditor, showToast],
  )

  const notifications = useMemo<AppNotification[]>(() => {
    if (!activeEditor) {
      return []
    }
    return buildNotificationsForEditor(projects, activeEditor.id).map((notification) => ({
      ...notification,
      read: readNotificationIds.includes(notification.id),
    }))
  }, [activeEditor, projects, readNotificationIds])

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  )

  const markNotificationsRead = useCallback(() => {
    setReadNotificationIds((prev) => {
      const ids = notifications.map((notification) => notification.id)
      return Array.from(new Set([...prev, ...ids]))
    })
  }, [notifications])

  const value = useMemo<AppContextValue>(
    () => ({
      editors: EDITORS,
      clients: CLIENTS,
      projects,
      timeEntries,
      activeEditor,
      theme,
      toast,
      notifications,
      unreadCount,
      signIn,
      signOut,
      toggleTheme,
      showToast,
      dismissToast,
      startEditing,
      submitWork,
      resubmitWork,
      saveDeliveryLink,
      addComment,
      logHours,
      markNotificationsRead,
    }),
    [
      projects,
      timeEntries,
      activeEditor,
      theme,
      toast,
      notifications,
      unreadCount,
      signIn,
      signOut,
      toggleTheme,
      showToast,
      dismissToast,
      startEditing,
      submitWork,
      resubmitWork,
      saveDeliveryLink,
      addComment,
      logHours,
      markNotificationsRead,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

export function useEditorProjects(): Project[] {
  const { projects, activeEditor } = useApp()
  return useMemo(
    () => (activeEditor ? getProjectsForEditor(projects, activeEditor.id) : []),
    [projects, activeEditor],
  )
}
