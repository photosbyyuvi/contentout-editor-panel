export type PayModel = 'hourly' | 'flat'

export type DeliverableType =
  | 'reel'
  | 'long_form'
  | 'photo_cull'
  | 'photo_retouch'
  | 'batch_graphics'

export type ProjectStatus =
  | 'not_started'
  | 'editing'
  | 'submitted'
  | 'revisions_requested'
  | 'approved'

export type UrgencyState = 'on_track' | 'due_soon' | 'overdue'

export type ThemeMode = 'dark' | 'light'

export type Role = 'owner' | 'admin' | 'editor'

export type UserStatus = 'active' | 'invited' | 'disabled'

export type NotificationType =
  | 'assignment'
  | 'feedback'
  | 'approval'
  | 'revision'
  | 'mention'
  | 'delivery_received'

export type NotificationChannel = 'portal' | 'email' | 'discord' | 'push'

export type DeliveryOutcome = 'pending' | 'approved' | 'changes_requested'

export type NotificationPrefs = {
  channels: Record<NotificationChannel, boolean>
  events: Record<NotificationType, boolean>
}

export type User = {
  id: string
  fullName: string
  email: string
  passwordHash: string
  role: Role
  status: UserStatus
  avatarInitials: string
  timezone: string
  createdAt: string
  lastActiveAt: string
  // Editor work fields (null for non-editors unless they also edit)
  payModel: PayModel | null
  hourlyRate: number | null
  flatRates: Partial<Record<DeliverableType, number>> | null
  notificationPrefs: NotificationPrefs
}

export type Client = {
  id: string
  name: string
  accentColor: string
}

export type ProjectSpecs = {
  aspectRatio: string
  resolution: string
  bitrate: string
  fileNaming: string
}

export type AssetLink = {
  label: string
  url: string
}

export type RevisionRound = {
  round: number
  notes: string[]
  requestedByUserId: string
  requestedAt: string
  resolvedAt: string | null
}

export type Comment = {
  id: string
  authorUserId: string
  authorName: string
  body: string
  createdAt: string
}

export type Delivery = {
  id: string
  projectId: string
  editorId: string
  fileLink: string
  note: string
  version: number
  submittedAt: string
  reviewedByUserId: string | null
  outcome: DeliveryOutcome
  reviewedAt: string | null
}

export type Project = {
  id: string
  clientId: string
  title: string
  deliverableType: DeliverableType
  brief: string
  specs: ProjectSpecs
  assetLinks: AssetLink[]
  status: ProjectStatus
  dueDate: string
  assignedEditorId: string | null
  createdByUserId: string
  revisions: RevisionRound[]
  comments: Comment[]
  deliveries: Delivery[]
  deliveryLink: string | null
  approvedAt: string | null
}

export type TimeEntry = {
  id: string
  projectId: string
  editorId: string
  hours: number
  date: string
  rateApplied: number
}

export type AppNotification = {
  id: string
  recipientUserId: string
  type: NotificationType
  projectId: string | null
  body: string
  createdAt: string
  readAt: string | null
  channelsSent: NotificationChannel[]
}

export type ActivityLog = {
  id: string
  actorUserId: string
  action: string
  targetType: string
  targetId: string
  createdAt: string
}

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  not_started: 'Not started',
  editing: 'Editing',
  submitted: 'In review',
  revisions_requested: 'Revisions requested',
  approved: 'Approved',
}

export const DELIVERABLE_LABELS: Record<DeliverableType, string> = {
  reel: 'Reel',
  long_form: 'Long form',
  photo_cull: 'Photo cull',
  photo_retouch: 'Photo retouch',
  batch_graphics: 'Batch graphics',
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
}

export const NOTIFICATION_CHANNELS: NotificationChannel[] = ['portal', 'email', 'discord', 'push']

export const NOTIFICATION_EVENTS: NotificationType[] = [
  'assignment',
  'delivery_received',
  'feedback',
  'revision',
  'approval',
  'mention',
]

export const NOTIFICATION_EVENT_LABELS: Record<NotificationType, string> = {
  assignment: 'New assignment',
  delivery_received: 'Delivery received',
  feedback: 'Feedback / changes',
  revision: 'Revision requested',
  approval: 'Delivery approved',
  mention: 'Mentions',
}

export function defaultNotificationPrefs(): NotificationPrefs {
  return {
    channels: { portal: true, email: true, discord: true, push: false },
    events: {
      assignment: true,
      delivery_received: true,
      feedback: true,
      revision: true,
      approval: true,
      mention: true,
    },
  }
}
