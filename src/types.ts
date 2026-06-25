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

export type Editor = {
  id: string
  name: string
  timezone: string
  payModel: PayModel
  hourlyRate: number | null
  flatRates: Partial<Record<DeliverableType, number>> | null
  avatarInitials: string
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
  requestedAt: string
  resolvedAt: string | null
}

export type Comment = {
  id: string
  authorName: string
  body: string
  createdAt: string
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
  assignedEditorId: string
  revisions: RevisionRound[]
  comments: Comment[]
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

export type NotificationKind = 'assignment' | 'revisions' | 'approval'

export type AppNotification = {
  id: string
  kind: NotificationKind
  projectId: string
  title: string
  body: string
  createdAt: string
  read: boolean
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
