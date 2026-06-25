import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  ACTIVITY_LOG,
  CLIENTS,
  NOTIFICATIONS,
  PROJECTS,
  TIME_ENTRIES,
  USERS,
  authenticate,
  getNotificationsForUser,
} from './data'
import { formatHours } from './format'
import { defaultNotificationPrefs } from './types'
import { AppContext, type AppContextValue, type Toast } from './appContext'
import type { NewProjectInput } from './appContext'
import type {
  ActivityLog,
  AppNotification,
  Client,
  DeliverableType,
  Delivery,
  NotificationChannel,
  NotificationType,
  NotificationPrefs,
  Project,
  Role,
  ThemeMode,
  TimeEntry,
  User,
} from './types'

let counter = 0
const uid = (prefix: string) => `${prefix}-${++counter}-${Date.now().toString(36)}`

export function AppProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(USERS)
  const [clients, setClients] = useState<Client[]>(CLIENTS)
  const [projects, setProjects] = useState<Project[]>(PROJECTS)
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(TIME_ENTRIES)
  const [notifications, setNotifications] = useState<AppNotification[]>(NOTIFICATIONS)
  const [activityLog, setActivityLog] = useState<ActivityLog[]>(ACTIVITY_LOG)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [viewAsUserId, setViewAsUserId] = useState<string | null>(null)
  const [theme, setTheme] = useState<ThemeMode>('dark')
  const [toast, setToast] = useState<Toast | null>(null)

  const currentUser = useMemo(
    () => users.find((candidate) => candidate.id === currentUserId) ?? null,
    [users, currentUserId],
  )
  const viewAsUser = useMemo(
    () => users.find((candidate) => candidate.id === viewAsUserId) ?? null,
    [users, viewAsUserId],
  )
  const actingUser = useMemo(() => viewAsUser ?? currentUser, [viewAsUser, currentUser])

  const showToast = useCallback((message: string) => {
    setToast({ id: ++counter, message })
  }, [])
  const dismissToast = useCallback(() => setToast(null), [])

  const login = useCallback(async (email: string, password: string) => {
    const user = authenticate(email, password)
    if (!user) {
      return false
    }
    setCurrentUserId(user.id)
    setViewAsUserId(null)
    return true
  }, [])

  const logout = useCallback(() => {
    setCurrentUserId(null)
    setViewAsUserId(null)
  }, [])

  const enterViewAs = useCallback((userId: string) => setViewAsUserId(userId), [])
  const exitViewAs = useCallback(() => setViewAsUserId(null), [])

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

  const logActivity = useCallback((actorUserId: string, action: string, targetId: string) => {
    setActivityLog((prev) => [
      { id: uid('al'), actorUserId, action, targetType: 'project', targetId, createdAt: new Date().toISOString() },
      ...prev,
    ])
  }, [])

  // Compute which channels fire for a recipient/event, "send" them (mocked), and record.
  const deliverNotification = useCallback(
    (recipientUserId: string, type: NotificationType, projectId: string | null, body: string) => {
      const recipient = users.find((candidate) => candidate.id === recipientUserId)
      const prefs = recipient?.notificationPrefs ?? defaultNotificationPrefs()
      if (!prefs.events[type]) {
        return
      }
      const channels = (Object.keys(prefs.channels) as NotificationChannel[]).filter(
        (channel) => prefs.channels[channel],
      )
      // Mock multi-channel send (email/Discord webhook/push) — swap for real providers.
      channels
        .filter((channel) => channel !== 'portal')
        .forEach((channel) => {
          console.info(`[notify:${channel}] -> ${recipient?.email ?? recipientUserId}: ${body}`)
        })
      const notification: AppNotification = {
        id: uid('nf'),
        recipientUserId,
        type,
        projectId,
        body,
        createdAt: new Date().toISOString(),
        readAt: null,
        channelsSent: channels,
      }
      setNotifications((prev) => [notification, ...prev])
      if (recipientUserId === currentUserId && prefs.channels.portal) {
        showToast(body)
      }
    },
    [users, currentUserId, showToast],
  )

  const managerIds = useCallback(
    () => users.filter((u) => u.role === 'owner' || u.role === 'admin').map((u) => u.id),
    [users],
  )

  const startEditing = useCallback(
    (projectId: string) => {
      patchProject(projectId, (project) => ({ ...project, status: 'editing' }))
    },
    [patchProject],
  )

  const submitDelivery = useCallback(
    (projectId: string, fileLink: string, note: string) => {
      if (!actingUser) {
        return
      }
      const project = projects.find((item) => item.id === projectId)
      if (!project) {
        return
      }
      const wasRevisions = project.status === 'revisions_requested'
      const version = project.deliveries.length + 1
      const newDelivery: Delivery = {
        id: uid('dl'),
        projectId,
        editorId: project.assignedEditorId ?? actingUser.id,
        fileLink: fileLink.trim(),
        note: note.trim(),
        version,
        submittedAt: new Date().toISOString(),
        reviewedByUserId: null,
        outcome: 'pending',
        reviewedAt: null,
      }
      patchProject(projectId, (current) => ({
        ...current,
        status: 'submitted',
        deliveries: [...current.deliveries, newDelivery],
        deliveryLink: newDelivery.fileLink,
        approvedAt: null,
        revisions: current.revisions.map((revision) =>
          revision.resolvedAt === null
            ? { ...revision, resolvedAt: new Date().toISOString() }
            : revision,
        ),
      }))
      logActivity(actingUser.id, `submitted delivery v${version}`, projectId)
      showToast(wasRevisions ? 'Resubmitted' : 'Submitted for review')
      const recipients = new Set<string>([project.createdByUserId, ...managerIds()])
      recipients.delete(actingUser.id)
      recipients.forEach((recipientId) =>
        deliverNotification(
          recipientId,
          'delivery_received',
          projectId,
          `${actingUser.fullName} delivered ${project.title} (v${version})`,
        ),
      )
    },
    [actingUser, projects, patchProject, logActivity, showToast, managerIds, deliverNotification],
  )

  const approveDelivery = useCallback(
    (projectId: string) => {
      if (!actingUser) {
        return
      }
      const project = projects.find((item) => item.id === projectId)
      if (!project || project.deliveries.length === 0) {
        return
      }
      const latestVersion = Math.max(...project.deliveries.map((d) => d.version))
      const reviewedAt = new Date().toISOString()
      patchProject(projectId, (current) => ({
        ...current,
        status: 'approved',
        approvedAt: reviewedAt,
        deliveries: current.deliveries.map((d) =>
          d.version === latestVersion
            ? { ...d, outcome: 'approved', reviewedByUserId: actingUser.id, reviewedAt }
            : d,
        ),
      }))
      logActivity(actingUser.id, `approved delivery v${latestVersion}`, projectId)
      showToast('Delivery approved')
      if (project.assignedEditorId) {
        deliverNotification(project.assignedEditorId, 'approval', projectId, `${project.title} approved 🎉`)
      }
    },
    [actingUser, projects, patchProject, logActivity, showToast, deliverNotification],
  )

  const requestChanges = useCallback(
    (projectId: string, notes: string[]) => {
      if (!actingUser) {
        return
      }
      const project = projects.find((item) => item.id === projectId)
      if (!project) {
        return
      }
      const cleanNotes = notes.map((note) => note.trim()).filter(Boolean)
      if (cleanNotes.length === 0) {
        return
      }
      const latestVersion =
        project.deliveries.length > 0 ? Math.max(...project.deliveries.map((d) => d.version)) : 0
      const reviewedAt = new Date().toISOString()
      patchProject(projectId, (current) => ({
        ...current,
        status: 'revisions_requested',
        approvedAt: null,
        deliveries: current.deliveries.map((d) =>
          d.version === latestVersion
            ? { ...d, outcome: 'changes_requested', reviewedByUserId: actingUser.id, reviewedAt }
            : d,
        ),
        revisions: [
          ...current.revisions,
          {
            round: current.revisions.length + 1,
            notes: cleanNotes,
            requestedByUserId: actingUser.id,
            requestedAt: reviewedAt,
            resolvedAt: null,
          },
        ],
      }))
      logActivity(actingUser.id, 'requested changes', projectId)
      showToast('Changes requested')
      if (project.assignedEditorId) {
        deliverNotification(
          project.assignedEditorId,
          'revision',
          projectId,
          `Changes requested on ${project.title}`,
        )
      }
    },
    [actingUser, projects, patchProject, logActivity, showToast, deliverNotification],
  )

  const addComment = useCallback(
    (projectId: string, body: string) => {
      if (!actingUser) {
        return
      }
      const text = body.trim()
      patchProject(projectId, (project) => ({
        ...project,
        comments: [
          ...project.comments,
          {
            id: uid('cm'),
            authorUserId: actingUser.id,
            authorName: actingUser.fullName,
            body: text,
            createdAt: new Date().toISOString(),
          },
        ],
      }))
      const project = projects.find((item) => item.id === projectId)
      // @mention detection → notify mentioned users.
      users.forEach((candidate) => {
        if (candidate.id === actingUser.id) {
          return
        }
        const first = candidate.fullName.split(' ')[0].toLowerCase()
        if (text.toLowerCase().includes(`@${first}`)) {
          deliverNotification(
            candidate.id,
            'mention',
            projectId,
            `${actingUser.fullName} mentioned you on ${project?.title ?? 'a project'}`,
          )
        }
      })
    },
    [actingUser, projects, users, patchProject, deliverNotification],
  )

  const logHours = useCallback(
    (projectId: string, hours: number, dateISO: string) => {
      if (!actingUser) {
        return
      }
      setTimeEntries((prev) => [
        ...prev,
        {
          id: uid('te'),
          projectId,
          editorId: actingUser.id,
          hours,
          date: dateISO,
          rateApplied: actingUser.hourlyRate ?? 0,
        },
      ])
      showToast(`Logged ${formatHours(hours)}`)
    },
    [actingUser, showToast],
  )

  const updateProject = useCallback(
    (projectId: string, patch: Partial<Project>) => {
      patchProject(projectId, (project) => ({ ...project, ...patch }))
    },
    [patchProject],
  )

  const updateUser = useCallback((userId: string, patch: Partial<User>) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...patch } : u)))
  }, [])

  const inviteUser = useCallback(async (fullName: string, email: string, role: Role): Promise<string | null> => {
    const initials = fullName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')
    const newUser: User = {
      id: uid('u'),
      fullName,
      email,
      passwordHash: 'contentout',
      role,
      status: 'invited',
      avatarInitials: initials || 'NA',
      timezone: 'America/Toronto',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      payModel: role === 'editor' ? 'hourly' : null,
      hourlyRate: role === 'editor' ? 20 : null,
      flatRates: null,
      notificationPrefs: defaultNotificationPrefs(),
    }
    setUsers((prev) => [...prev, newUser])
    return null
  }, [])

  const createClient = useCallback(async (name: string): Promise<Client> => {
    const palette = ['#3B82F6', '#22C55E', '#A855F7', '#F5A623', '#EC4899', '#14B8A6']
    const client: Client = { id: uid('c'), name: name.trim(), accentColor: palette[Math.floor(Math.random() * palette.length)] }
    setClients((prev) => [...prev, client])
    return client
  }, [])

  const createProject = useCallback(
    async (data: NewProjectInput) => {
      if (!actingUser) {
        return
      }
      const project: Project = {
        id: uid('p'),
        clientId: data.clientId,
        title: data.title.trim(),
        deliverableType: (data.deliverableType as DeliverableType) || 'reel',
        brief: data.brief.trim(),
        specs: { aspectRatio: '9:16', resolution: '1080x1920', bitrate: '12 Mbps H.264', fileNaming: `${data.title.replace(/\s+/g, '_')}_v{n}.mp4` },
        assetLinks: [],
        status: 'not_started',
        dueDate: data.dueDate || new Date(Date.now() + 7 * 86400000).toISOString(),
        assignedEditorId: data.assignedEditorId,
        createdByUserId: actingUser.id,
        revisions: [],
        comments: [],
        deliveries: [],
        deliveryLink: null,
        approvedAt: null,
      }
      setProjects((prev) => [...prev, project])
      if (project.assignedEditorId) {
        deliverNotification(project.assignedEditorId, 'assignment', project.id, `New project assigned: ${project.title}`)
      }
    },
    [actingUser, deliverNotification],
  )

  const changePassword = useCallback(async () => {
    throw new Error('Password changes are available in the official (backend) build.')
  }, [])

  const changeRole = useCallback((userId: string, role: Role) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)))
  }, [])

  const setUserStatus = useCallback((userId: string, status: User['status']) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status } : u)))
  }, [])

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n)),
    )
  }, [])

  const markAllNotificationsRead = useCallback(() => {
    if (!actingUser) {
      return
    }
    const now = new Date().toISOString()
    setNotifications((prev) =>
      prev.map((n) =>
        n.recipientUserId === actingUser.id && !n.readAt ? { ...n, readAt: now } : n,
      ),
    )
  }, [actingUser])

  const updateNotificationPrefs = useCallback(
    (prefs: NotificationPrefs) => {
      if (!actingUser) {
        return
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === actingUser.id ? { ...u, notificationPrefs: prefs } : u)),
      )
    },
    [actingUser],
  )

  const userNotifications = useMemo(
    () => (actingUser ? getNotificationsForUser(notifications, actingUser.id) : []),
    [notifications, actingUser],
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
      enterViewAs,
      exitViewAs,
      toggleTheme,
      showToast,
      dismissToast,
      startEditing,
      submitDelivery,
      addComment,
      logHours,
      approveDelivery,
      requestChanges,
      updateProject,
      updateUser,
      inviteUser,
      changeRole,
      setUserStatus,
      createClient,
      createProject,
      changePassword,
      markNotificationRead,
      markAllNotificationsRead,
      updateNotificationPrefs,
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
      enterViewAs,
      exitViewAs,
      toggleTheme,
      showToast,
      dismissToast,
      startEditing,
      submitDelivery,
      addComment,
      logHours,
      approveDelivery,
      requestChanges,
      updateProject,
      updateUser,
      createClient,
      createProject,
      changePassword,
      inviteUser,
      changeRole,
      setUserStatus,
      markNotificationRead,
      markAllNotificationsRead,
      updateNotificationPrefs,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export { useApp, useEditorProjects, useVisibleProjects } from './appContext'
