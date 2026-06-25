import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

type PayModel = 'hourly' | 'flat'
type DeliverableType =
  | 'reel'
  | 'long_form'
  | 'photo_cull'
  | 'photo_retouch'
  | 'batch_graphics'
type ProjectStatus =
  | 'not_started'
  | 'editing'
  | 'submitted'
  | 'revisions_requested'
  | 'approved'
type UrgencyState = 'on_track' | 'due_soon' | 'overdue'
type NavSection = 'queue' | 'hours' | 'resources'
type ThemeMode = 'dark' | 'light'
type IconName =
  | 'queue'
  | 'hours'
  | 'resources'
  | 'chevron_left'
  | 'chevron_right'
  | 'sun'
  | 'moon'
  | 'alert'
  | 'calendar'

type Editor = {
  id: string
  name: string
  timezone: string
  payModel: PayModel
  hourlyRate: number | null
  avatarInitials: string
}

type Client = {
  id: string
  name: string
  accentColor: string
}

type ProjectSpecs = {
  aspectRatio: string
  resolution: string
  bitrate: string
  fileNaming: string
}

type AssetLink = {
  label: string
  url: string
}

type RevisionRound = {
  round: number
  notes: string[]
  requestedAt: string
  resolvedAt: string | null
}

type Comment = {
  id: string
  authorName: string
  body: string
  createdAt: string
}

type Project = {
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
  deliveryLink: string
  flatRateAmount: number
  approvedAt: string | null
}

type TimeEntry = {
  id: string
  projectId: string
  editorId: string
  hours: number
  date: string
  rateApplied: number
}

type PayPeriodSummary = {
  periodKey: string
  hours: number
  approvedDeliverables: number
  pay: number
}

type ToastState = {
  id: number
  message: string
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  not_started: 'Not started',
  editing: 'Editing',
  submitted: 'In review',
  revisions_requested: 'Revisions requested',
  approved: 'Approved',
}

const DELIVERABLE_LABELS: Record<DeliverableType, string> = {
  reel: 'Reel',
  long_form: 'Long form',
  photo_cull: 'Photo cull',
  photo_retouch: 'Photo retouch',
  batch_graphics: 'Batch graphics',
}

const URGENCY_LABELS: Record<UrgencyState, string> = {
  on_track: 'On track',
  due_soon: 'Due soon',
  overdue: 'Overdue',
}

const STATUS_FLOW: ProjectStatus[] = [
  'not_started',
  'editing',
  'submitted',
  'revisions_requested',
  'approved',
]

const MOCK_EDITORS: Editor[] = [
  {
    id: 'ed-savithru',
    name: 'Savithru Perera',
    timezone: 'Asia/Kolkata',
    payModel: 'hourly',
    hourlyRate: 24,
    avatarInitials: 'SP',
  },
  {
    id: 'ed-elena',
    name: 'Elena Trpkovska',
    timezone: 'Europe/Skopje',
    payModel: 'flat',
    hourlyRate: null,
    avatarInitials: 'ET',
  },
  {
    id: 'ed-omar',
    name: 'Omar Rahman',
    timezone: 'Asia/Kolkata',
    payModel: 'hourly',
    hourlyRate: 28,
    avatarInitials: 'OR',
  },
]

const MOCK_CLIENTS: Client[] = [
  { id: 'c-yfl', name: 'Yorkdale Ford Lincoln', accentColor: '#7ca6f5' },
  { id: 'c-land', name: 'Landscaping Legends', accentColor: '#8ac79a' },
  { id: 'c-mrg', name: 'MRG Group', accentColor: '#c9a0e7' },
  { id: 'c-event', name: 'Event Coverage', accentColor: '#d9b88e' },
]

const MOCK_PROJECTS: Project[] = [
  {
    id: 'p-yfl-r1',
    clientId: 'c-yfl',
    title: 'Yorkdale 9:16 Summer Lease Reel',
    deliverableType: 'reel',
    brief:
      'Fast-paced social cut, 20-25s, bold text callouts, clean transitions. Prioritize SUVs and dealership team moments.',
    specs: {
      aspectRatio: '9:16',
      resolution: '1080x1920',
      bitrate: '16 Mbps',
      fileNaming: 'YFL_Reel_SummerLease_v{n}.mp4',
    },
    assetLinks: [
      {
        label: 'Source footage',
        url: 'https://drive.google.com/yfl/source-footage',
      },
      {
        label: 'Brand graphics pack',
        url: 'https://drive.google.com/yfl/graphics-pack',
      },
      {
        label: 'Reference cuts',
        url: 'https://vimeo.com/showcase/yfl-references',
      },
    ],
    status: 'revisions_requested',
    dueDate: '2026-06-26T09:30:00Z',
    assignedEditorId: 'ed-savithru',
    revisions: [
      {
        round: 1,
        notes: [
          'Open on vehicle close-up before showroom shot.',
          'Tighten CTA card to two beats.',
        ],
        requestedAt: '2026-06-24T16:10:00Z',
        resolvedAt: '2026-06-24T21:00:00Z',
      },
      {
        round: 2,
        notes: [
          'Swap music bed to the approved upbeat track.',
          'Keep final logo card on screen for 1.5 seconds.',
        ],
        requestedAt: '2026-06-25T02:00:00Z',
        resolvedAt: null,
      },
    ],
    comments: [
      {
        id: 'cm-1',
        authorName: 'Contentout Review',
        body: 'Strong pacing overall. Round 2 notes are now posted.',
        createdAt: '2026-06-25T02:02:00Z',
      },
    ],
    deliveryLink: 'https://frame.io/yfl-round1',
    flatRateAmount: 325,
    approvedAt: null,
  },
  {
    id: 'p-land-lf1',
    clientId: 'c-land',
    title: 'Landscaping Legends June Long Form',
    deliverableType: 'long_form',
    brief:
      '3-4 minute YouTube piece. Professional but warm tone. Show before/after progression and owner interview highlights.',
    specs: {
      aspectRatio: '16:9',
      resolution: '3840x2160',
      bitrate: '35 Mbps',
      fileNaming: 'LL_LongForm_June_v{n}.mp4',
    },
    assetLinks: [
      {
        label: 'Primary footage folder',
        url: 'https://drive.google.com/landscaping/primary',
      },
      {
        label: 'Interview transcript',
        url: 'https://docs.google.com/landscaping/transcript',
      },
    ],
    status: 'editing',
    dueDate: '2026-06-28T15:00:00Z',
    assignedEditorId: 'ed-savithru',
    revisions: [],
    comments: [
      {
        id: 'cm-2',
        authorName: 'Yasmeen',
        body: 'Please keep chapter markers simple and readable.',
        createdAt: '2026-06-24T12:35:00Z',
      },
    ],
    deliveryLink: '',
    flatRateAmount: 540,
    approvedAt: null,
  },
  {
    id: 'p-mrg-photo1',
    clientId: 'c-mrg',
    title: 'MRG Rooftop Event Photo Retouch',
    deliverableType: 'photo_retouch',
    brief:
      'Retouch 60 selects for web and press release use. Keep skin tones natural and preserve venue ambiance.',
    specs: {
      aspectRatio: 'Mixed',
      resolution: '6000px long edge',
      bitrate: 'N/A',
      fileNaming: 'MRG_Rooftop_Retouch_{index}.jpg',
    },
    assetLinks: [
      { label: 'RAW selects', url: 'https://drive.google.com/mrg/raw-selects' },
      {
        label: 'Color reference',
        url: 'https://drive.google.com/mrg/color-reference',
      },
    ],
    status: 'submitted',
    dueDate: '2026-06-27T19:00:00Z',
    assignedEditorId: 'ed-elena',
    revisions: [],
    comments: [],
    deliveryLink: 'https://dropbox.com/mrg/retouch-delivery-v1',
    flatRateAmount: 460,
    approvedAt: null,
  },
  {
    id: 'p-event-batch1',
    clientId: 'c-event',
    title: 'Event Coverage Batch Graphics Package',
    deliverableType: 'batch_graphics',
    brief:
      'Create 10 lower-thirds and 6 endcards from the approved event kit. Maintain monochrome palette with one accent.',
    specs: {
      aspectRatio: '16:9 and 9:16',
      resolution: '1920x1080 / 1080x1920',
      bitrate: 'N/A',
      fileNaming: 'EVT_GFX_{assetName}_v{n}.png',
    },
    assetLinks: [
      {
        label: 'Template pack',
        url: 'https://figma.com/event/template-pack',
      },
      {
        label: 'Past approved examples',
        url: 'https://drive.google.com/event/approved-examples',
      },
    ],
    status: 'approved',
    dueDate: '2026-06-18T10:00:00Z',
    assignedEditorId: 'ed-elena',
    revisions: [
      {
        round: 1,
        notes: ['Increase text padding on mobile safe area assets.'],
        requestedAt: '2026-06-17T17:20:00Z',
        resolvedAt: '2026-06-17T19:05:00Z',
      },
    ],
    comments: [
      {
        id: 'cm-3',
        authorName: 'Contentout Review',
        body: 'Approved. Great consistency across all graphics.',
        createdAt: '2026-06-18T09:55:00Z',
      },
    ],
    deliveryLink: 'https://frame.io/event-graphics-final',
    flatRateAmount: 410,
    approvedAt: '2026-06-18T09:55:00Z',
  },
  {
    id: 'p-yfl-cull1',
    clientId: 'c-yfl',
    title: 'Yorkdale Weekend Shoot Photo Cull',
    deliverableType: 'photo_cull',
    brief:
      'Cull 1,200 images down to top 180 for social and ad use. Tag hero shots and annotate any missing angle coverage.',
    specs: {
      aspectRatio: 'Mixed',
      resolution: 'Original',
      bitrate: 'N/A',
      fileNaming: 'YFL_Cull_Select_{index}.jpg',
    },
    assetLinks: [
      { label: 'Capture One catalog', url: 'https://drive.google.com/yfl/catalog' },
      {
        label: 'Selection criteria',
        url: 'https://docs.google.com/yfl/cull-rules',
      },
    ],
    status: 'not_started',
    dueDate: '2026-07-01T12:00:00Z',
    assignedEditorId: 'ed-omar',
    revisions: [],
    comments: [],
    deliveryLink: '',
    flatRateAmount: 280,
    approvedAt: null,
  },
]

const MOCK_TIME_ENTRIES: TimeEntry[] = [
  {
    id: 'te-1',
    projectId: 'p-yfl-r1',
    editorId: 'ed-savithru',
    hours: 3.5,
    date: '2026-06-24T18:35:00Z',
    rateApplied: 24,
  },
  {
    id: 'te-2',
    projectId: 'p-land-lf1',
    editorId: 'ed-savithru',
    hours: 2.25,
    date: '2026-06-25T00:10:00Z',
    rateApplied: 24,
  },
  {
    id: 'te-3',
    projectId: 'p-event-batch1',
    editorId: 'ed-elena',
    hours: 4,
    date: '2026-06-17T16:30:00Z',
    rateApplied: 0,
  },
  {
    id: 'te-4',
    projectId: 'p-mrg-photo1',
    editorId: 'ed-elena',
    hours: 5.5,
    date: '2026-06-24T13:20:00Z',
    rateApplied: 0,
  },
]

const RESOURCES = [
  {
    title: 'File naming',
    body: 'Use project short code + deliverable + version number before final exports.',
  },
  {
    title: 'Export presets',
    body: 'Social: H.264 12-16 Mbps. Archive masters: ProRes 422 HQ with source frame rate.',
  },
  {
    title: 'Brand graphics standards',
    body: 'Keep lower-thirds inside safe margins and use approved type scale from the latest kit.',
  },
  {
    title: 'Style references',
    body: 'Match pacing and transitions from approved examples before introducing new treatments.',
  },
]

function Icon({ name, className }: { name: IconName; className?: string }) {
  if (name === 'queue') {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="5" width="16" height="3" rx="1.5" fill="currentColor" />
        <rect x="4" y="10.5" width="16" height="3" rx="1.5" fill="currentColor" />
        <rect x="4" y="16" width="16" height="3" rx="1.5" fill="currentColor" />
      </svg>
    )
  }

  if (name === 'hours') {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 8v4.6l3 2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    )
  }

  if (name === 'resources') {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M5.5 6.5a3 3 0 0 1 3-3H18v15h-9.5a3 3 0 1 0 0 6H18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path d="M5.5 6.5V21" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    )
  }

  if (name === 'chevron_left') {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="m14.5 5.5-6 6.5 6 6.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (name === 'chevron_right') {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="m9.5 5.5 6 6.5-6 6.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (name === 'sun') {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.8 5.8 7.6 7.6M16.4 16.4l1.8 1.8M5.8 18.2l1.8-1.8M16.4 7.6l1.8-1.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    )
  }

  if (name === 'moon') {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M14.3 4.2a7.7 7.7 0 1 0 5.5 13.3 8.8 8.8 0 0 1-5.5-13.3Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (name === 'alert') {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 4.5 20 19H4L12 4.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M12 9v4.6M12 16.6h.01" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    )
  }

  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 3.7v3.5M16 3.7v3.5M3.5 10h17" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function runWithViewTransition(updateFn: () => void): void {
  if (typeof document === 'undefined') {
    updateFn()
    return
  }

  if (document.startViewTransition) {
    document.startViewTransition(updateFn)
    return
  }

  updateFn()
}

function monthKey(isoDate: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    timeZone,
  }).formatToParts(new Date(isoDate))

  const year = parts.find((part) => part.type === 'year')?.value ?? '1970'
  const month = parts.find((part) => part.type === 'month')?.value ?? '01'
  return `${year}-${month}`
}

function monthLabel(periodKey: string, timeZone: string): string {
  const date = new Date(`${periodKey}-01T00:00:00Z`)
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone,
  }).format(date)
}

function formatDateTime(isoDate: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(new Date(isoDate))
}

function formatDate(isoDate: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone,
  }).format(new Date(isoDate))
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(amount)
}

function projectUrgency(dueDate: string, status: ProjectStatus): UrgencyState {
  if (status === 'approved') {
    return 'on_track'
  }

  const hoursLeft = (new Date(dueDate).getTime() - Date.now()) / 36e5
  if (hoursLeft < 0) {
    return 'overdue'
  }
  if (hoursLeft <= 24) {
    return 'due_soon'
  }
  return 'on_track'
}

function sectionTitle(section: NavSection): string {
  if (section === 'queue') {
    return 'Queue'
  }
  if (section === 'hours') {
    return 'Hours & pay'
  }
  return 'Resources'
}

function sectionIcon(section: NavSection): IconName {
  if (section === 'queue') {
    return 'queue'
  }
  if (section === 'hours') {
    return 'hours'
  }
  return 'resources'
}

function App() {
  const [editors] = useState(MOCK_EDITORS)
  const [clients] = useState(MOCK_CLIENTS)
  const [projects, setProjects] = useState(MOCK_PROJECTS)
  const [timeEntries, setTimeEntries] = useState(MOCK_TIME_ENTRIES)

  const [activeEditorId, setActiveEditorId] = useState(MOCK_EDITORS[0].id)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [clientFilter, setClientFilter] = useState<'all' | string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all')

  const [activeSection, setActiveSection] = useState<NavSection>('queue')
  const [isRailCollapsed, setIsRailCollapsed] = useState(false)
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark')

  const [deliveryLinkDraft, setDeliveryLinkDraft] = useState('')
  const [revisionDraft, setRevisionDraft] = useState('')
  const [commentDraft, setCommentDraft] = useState('')
  const [hoursDraft, setHoursDraft] = useState('1')
  const [logProjectId, setLogProjectId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [recentlyChangedProjectId, setRecentlyChangedProjectId] = useState<string | null>(null)
  const queueItemRefs = useRef<Record<string, HTMLLIElement | null>>({})
  const queuePositionsRef = useRef<Map<string, number>>(new Map())

  const activeEditor = useMemo(
    () => editors.find((editor) => editor.id === activeEditorId) ?? editors[0],
    [activeEditorId, editors],
  )

  const scopedProjects = useMemo(
    () => projects.filter((project) => project.assignedEditorId === activeEditor.id),
    [activeEditor.id, projects],
  )

  const queueProjects = useMemo(() => {
    return scopedProjects
      .filter((project) => (clientFilter === 'all' ? true : project.clientId === clientFilter))
      .filter((project) => (statusFilter === 'all' ? true : project.status === statusFilter))
      .sort(
        (projectA, projectB) =>
          new Date(projectA.dueDate).getTime() - new Date(projectB.dueDate).getTime(),
      )
  }, [clientFilter, scopedProjects, statusFilter])

  const selectedProject = useMemo(
    () => scopedProjects.find((project) => project.id === selectedProjectId) ?? null,
    [scopedProjects, selectedProjectId],
  )

  const clientById = useMemo(
    () => Object.fromEntries(clients.map((client) => [client.id, client])) as Record<string, Client>,
    [clients],
  )

  const projectById = useMemo(
    () =>
      Object.fromEntries(projects.map((project) => [project.id, project])) as Record<
        string,
        Project
      >,
    [projects],
  )

  const paySummary = useMemo(() => {
    const editorEntries = timeEntries.filter((entry) => entry.editorId === activeEditor.id)
    const approvedProjects = scopedProjects.filter((project) => project.approvedAt)

    const knownPeriods = new Set<string>([
      ...editorEntries.map((entry) => monthKey(entry.date, activeEditor.timezone)),
      ...approvedProjects.map((project) =>
        monthKey(project.approvedAt ?? new Date().toISOString(), activeEditor.timezone),
      ),
      monthKey(new Date().toISOString(), activeEditor.timezone),
    ])

    const periodSummaries: PayPeriodSummary[] = Array.from(knownPeriods)
      .sort((periodA, periodB) => periodB.localeCompare(periodA))
      .map((period) => {
        const periodEntries = editorEntries.filter(
          (entry) => monthKey(entry.date, activeEditor.timezone) === period,
        )
        const periodHours = periodEntries.reduce((sum, entry) => sum + entry.hours, 0)
        const periodApprovals = approvedProjects.filter(
          (project) =>
            project.approvedAt &&
            monthKey(project.approvedAt, activeEditor.timezone) === period,
        )

        const pay =
          activeEditor.payModel === 'hourly'
            ? periodEntries.reduce((sum, entry) => sum + entry.hours * entry.rateApplied, 0)
            : periodApprovals.reduce((sum, project) => sum + project.flatRateAmount, 0)

        return {
          periodKey: period,
          hours: periodHours,
          approvedDeliverables: periodApprovals.length,
          pay,
        }
      })

    const currentPeriod = monthKey(new Date().toISOString(), activeEditor.timezone)
    const currentSummary =
      periodSummaries.find((summary) => summary.periodKey === currentPeriod) ?? {
        periodKey: currentPeriod,
        hours: 0,
        approvedDeliverables: 0,
        pay: 0,
      }

    return {
      currentSummary,
      history: periodSummaries.filter((summary) => summary.periodKey !== currentPeriod),
    }
  }, [activeEditor, scopedProjects, timeEntries])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsLoading(false)
    }, 850)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (queueProjects.length === 0) {
      setSelectedProjectId(null)
      return
    }

    const exists = queueProjects.some((project) => project.id === selectedProjectId)
    if (!exists) {
      setSelectedProjectId(queueProjects[0].id)
    }
  }, [queueProjects, selectedProjectId])

  useEffect(() => {
    if (queueProjects.length === 0) {
      setLogProjectId('')
      return
    }

    const exists = queueProjects.some((project) => project.id === logProjectId)
    if (!exists) {
      setLogProjectId(queueProjects[0].id)
    }
  }, [queueProjects, logProjectId])

  useEffect(() => {
    if (!toast) {
      return
    }
    const timer = window.setTimeout(() => {
      setToast((currentToast) => (currentToast?.id === toast.id ? null : currentToast))
    }, 2200)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!recentlyChangedProjectId) {
      return
    }
    const timer = window.setTimeout(() => {
      setRecentlyChangedProjectId((current) =>
        current === recentlyChangedProjectId ? null : current,
      )
    }, 1100)
    return () => window.clearTimeout(timer)
  }, [recentlyChangedProjectId])

  useLayoutEffect(() => {
    if (queueProjects.length === 0) {
      queuePositionsRef.current = new Map()
      return
    }

    const nextPositions = new Map<string, number>()
    for (const project of queueProjects) {
      const node = queueItemRefs.current[project.id]
      if (node) {
        nextPositions.set(project.id, node.getBoundingClientRect().top)
      }
    }

    for (const project of queueProjects) {
      const node = queueItemRefs.current[project.id]
      const previousTop = queuePositionsRef.current.get(project.id)
      const currentTop = nextPositions.get(project.id)
      if (!node || previousTop === undefined || currentTop === undefined) {
        continue
      }
      const delta = previousTop - currentTop
      if (Math.abs(delta) < 2) {
        continue
      }
      node.style.transform = `translateY(${delta}px)`
      node.style.transition = 'transform 0ms'
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          node.style.transform = 'translateY(0)'
          node.style.transition = 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)'
        })
      })
    }

    queuePositionsRef.current = nextPositions
  }, [queueProjects])

  const showToast = (message: string): void => {
    setToast({ id: Date.now(), message })
  }

  const markProjectUpdated = (projectId: string, message: string): void => {
    setRecentlyChangedProjectId(projectId)
    showToast(message)
  }

  function updateProject(projectId: string, updater: (project: Project) => Project): void {
    runWithViewTransition(() => {
      setProjects((prev) => prev.map((project) => (project.id === projectId ? updater(project) : project)))
    })
  }

  function setProjectStatus(projectId: string, status: ProjectStatus): void {
    updateProject(projectId, (project) => ({
      ...project,
      status,
      approvedAt: status === 'approved' ? new Date().toISOString() : null,
    }))
    markProjectUpdated(projectId, `Status updated to ${STATUS_LABELS[status]}`)
  }

  function submitForReview(): void {
    if (!selectedProject || deliveryLinkDraft.trim().length === 0) {
      return
    }

    updateProject(selectedProject.id, (project) => {
      const nextRevisions = project.revisions.map((revision) =>
        revision.resolvedAt === null
          ? {
              ...revision,
              resolvedAt: new Date().toISOString(),
            }
          : revision,
      )

      return {
        ...project,
        status: 'submitted',
        deliveryLink: deliveryLinkDraft.trim(),
        revisions: nextRevisions,
        approvedAt: null,
      }
    })

    setDeliveryLinkDraft('')
    markProjectUpdated(selectedProject.id, 'Delivery submitted for review')
  }

  function requestRevision(): void {
    if (!selectedProject) {
      return
    }

    const notes = revisionDraft
      .split('\n')
      .map((note) => note.trim())
      .filter(Boolean)

    const safeNotes = notes.length > 0 ? notes : ['Please tighten the pacing in opening sequence.']

    updateProject(selectedProject.id, (project) => ({
      ...project,
      status: 'revisions_requested',
      revisions: [
        ...project.revisions,
        {
          round: project.revisions.length + 1,
          notes: safeNotes,
          requestedAt: new Date().toISOString(),
          resolvedAt: null,
        },
      ],
      approvedAt: null,
    }))

    setRevisionDraft('')
    markProjectUpdated(selectedProject.id, 'Revision notes added')
  }

  function addComment(): void {
    if (!selectedProject || commentDraft.trim().length === 0) {
      return
    }

    updateProject(selectedProject.id, (project) => ({
      ...project,
      comments: [
        ...project.comments,
        {
          id: `cm-${crypto.randomUUID()}`,
          authorName: activeEditor.name,
          body: commentDraft.trim(),
          createdAt: new Date().toISOString(),
        },
      ],
    }))

    setCommentDraft('')
    showToast('Comment posted')
  }

  function logHours(): void {
    if (logProjectId.length === 0) {
      return
    }

    const parsedHours = Number(hoursDraft)
    if (!Number.isFinite(parsedHours) || parsedHours <= 0) {
      return
    }

    runWithViewTransition(() => {
      setTimeEntries((prev) => [
        ...prev,
        {
          id: `te-${crypto.randomUUID()}`,
          projectId: logProjectId,
          editorId: activeEditor.id,
          hours: parsedHours,
          date: new Date().toISOString(),
          rateApplied: activeEditor.hourlyRate ?? 0,
        },
      ])
    })

    setHoursDraft('1')
    showToast('Hours logged')
  }

  const overdueCount = queueProjects.filter(
    (project) => projectUrgency(project.dueDate, project.status) === 'overdue',
  ).length

  const renderQueueContent = () => {
    if (isLoading) {
      return (
        <>
          <ul className="queue-list" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <li key={`queue-skeleton-${index}`} className="queue-card queue-card-skeleton">
                <div className="skeleton-line width-40"></div>
                <div className="skeleton-line width-75"></div>
                <div className="skeleton-line width-55"></div>
                <div className="skeleton-tags">
                  <span className="skeleton-pill"></span>
                  <span className="skeleton-pill"></span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )
    }

    if (queueProjects.length === 0) {
      return (
        <p className="panel-empty">Nothing assigned yet - check back or message the team.</p>
      )
    }

    return (
      <ul className="queue-list">
        {queueProjects.map((project) => {
          const client = clientById[project.clientId]
          const urgency = projectUrgency(project.dueDate, project.status)
          return (
            <li
              key={project.id}
              ref={(element) => {
                queueItemRefs.current[project.id] = element
              }}
            >
              <button
                type="button"
                className={`queue-card ${
                  project.id === selectedProjectId ? 'queue-card-active' : ''
                } ${project.id === recentlyChangedProjectId ? 'queue-card-updated' : ''}`}
                onClick={() => setSelectedProjectId(project.id)}
              >
                <div className="queue-client-row">
                  <span
                    className="client-dot"
                    style={{ backgroundColor: client?.accentColor ?? '#999999' }}
                    aria-hidden="true"
                  ></span>
                  <span>{client?.name ?? 'Unknown client'}</span>
                </div>

                <h3>{project.title}</h3>

                <p className="muted tabular">{DELIVERABLE_LABELS[project.deliverableType]}</p>
                <p className="muted tabular">
                  Due {formatDateTime(project.dueDate, activeEditor.timezone)}
                </p>

                <div className="pill-row">
                  <span className={`pill urgency-${urgency}`}>{URGENCY_LABELS[urgency]}</span>
                  <span className={`pill status-${project.status}`}>{STATUS_LABELS[project.status]}</span>
                  {project.status === 'revisions_requested' ? (
                    <span className="pill status-revisions_requested">Round {project.revisions.length}</span>
                  ) : null}
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    )
  }

  const renderProjectDetail = () => {
    if (isLoading) {
      return (
        <div className="detail-skeleton" aria-hidden="true">
          <div className="skeleton-line width-45"></div>
          <div className="skeleton-line width-85"></div>
          <div className="skeleton-box"></div>
          <div className="skeleton-box"></div>
          <div className="skeleton-box"></div>
        </div>
      )
    }

    if (!selectedProject) {
      return <p className="panel-empty">Select a project from the queue to see full details.</p>
    }

    return (
      <div className="project-detail">
        <header className="project-header">
          <div>
            <p className="muted">{clientById[selectedProject.clientId]?.name ?? 'Client'}</p>
            <h3>{selectedProject.title}</h3>
          </div>
          <span className={`pill status-${selectedProject.status}`}>{STATUS_LABELS[selectedProject.status]}</span>
        </header>

        <section className="detail-section">
          <h4>Brief</h4>
          <p>{selectedProject.brief}</p>
        </section>

        <section className="detail-section">
          <h4>Status workflow</h4>
          <div className="status-flow" role="list" aria-label="Project status flow">
            {STATUS_FLOW.map((status) => (
              <button
                key={status}
                type="button"
                role="listitem"
                className={`flow-pill ${selectedProject.status === status ? 'flow-pill-active' : ''}`}
                onClick={() => setProjectStatus(selectedProject.id, status)}
              >
                {STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </section>

        <section className="detail-section">
          <h4>Deliverable specs</h4>
          <ul className="spec-grid">
            <li>
              <span>Aspect ratio</span>
              <strong className="tabular">{selectedProject.specs.aspectRatio}</strong>
            </li>
            <li>
              <span>Resolution</span>
              <strong className="tabular">{selectedProject.specs.resolution}</strong>
            </li>
            <li>
              <span>Bitrate</span>
              <strong className="tabular">{selectedProject.specs.bitrate}</strong>
            </li>
            <li>
              <span>File naming</span>
              <strong className="tabular">{selectedProject.specs.fileNaming}</strong>
            </li>
          </ul>
        </section>

        <section className="detail-section">
          <h4>Assets</h4>
          <ul className="link-list">
            {selectedProject.assetLinks.map((asset) => (
              <li key={asset.url}>
                <a href={asset.url} target="_blank" rel="noreferrer">
                  {asset.label}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="detail-section">
          <h4>Delivery</h4>
          <div className="input-row">
            <input
              type="url"
              value={deliveryLinkDraft}
              onChange={(event) => setDeliveryLinkDraft(event.target.value)}
              placeholder="Paste final file or Frame.io link"
              aria-label="Delivery link"
            />
            <button
              type="button"
              onClick={submitForReview}
              disabled={deliveryLinkDraft.trim().length === 0}
            >
              Submit for review
            </button>
          </div>
        </section>

        <section className="detail-section">
          <h4>Revision history</h4>
          {selectedProject.revisions.length === 0 ? (
            <p className="muted">No revision rounds yet.</p>
          ) : (
            <ol className="revision-list">
              {selectedProject.revisions.map((revision) => (
                <li key={revision.round}>
                  <p className="tabular muted">
                    Round {revision.round} - requested{' '}
                    {formatDateTime(revision.requestedAt, activeEditor.timezone)}
                  </p>
                  <ul>
                    {revision.notes.map((note) => (
                      <li key={`${revision.round}-${note}`}>{note}</li>
                    ))}
                  </ul>
                  <p className="tabular muted">
                    {revision.resolvedAt
                      ? `Resolved ${formatDateTime(revision.resolvedAt, activeEditor.timezone)}`
                      : 'Awaiting redelivery'}
                  </p>
                </li>
              ))}
            </ol>
          )}

          <div className="input-stack">
            <textarea
              value={revisionDraft}
              onChange={(event) => setRevisionDraft(event.target.value)}
              placeholder="Add revision notes (one note per line)"
              rows={3}
            ></textarea>
            <button type="button" onClick={requestRevision}>
              Add revision request
            </button>
          </div>
        </section>

        <section className="detail-section">
          <h4>Comments</h4>
          {selectedProject.comments.length === 0 ? (
            <p className="muted">No comments yet.</p>
          ) : (
            <ul className="comment-list">
              {selectedProject.comments.map((comment) => (
                <li key={comment.id}>
                  <p className="tabular muted">
                    {comment.authorName} - {formatDateTime(comment.createdAt, activeEditor.timezone)}
                  </p>
                  <p>{comment.body}</p>
                </li>
              ))}
            </ul>
          )}

          <div className="input-stack">
            <textarea
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
              placeholder="Add comment"
              rows={2}
            ></textarea>
            <button type="button" onClick={addComment} disabled={commentDraft.trim().length === 0}>
              Post comment
            </button>
          </div>
        </section>
      </div>
    )
  }

  const renderHoursSection = () => {
    if (isLoading) {
      return (
        <div className="hours-skeleton" aria-hidden="true">
          <div className="skeleton-box"></div>
          <div className="skeleton-box"></div>
          <div className="skeleton-box"></div>
        </div>
      )
    }

    return (
      <section className="content-grid-single">
        <article className="surface-card">
          <header className="surface-head">
            <h2>Hours & pay</h2>
            <p className="muted">Monthly totals aligned to studio payout cadence.</p>
          </header>

          <div className="totals-grid">
            <div className="total-card">
              <p>Current period</p>
              <strong>{monthLabel(paySummary.currentSummary.periodKey, activeEditor.timezone)}</strong>
            </div>
            <div className="total-card">
              <p>Logged hours</p>
              <strong className="tabular">{paySummary.currentSummary.hours.toFixed(2)}</strong>
            </div>
            <div className="total-card">
              <p>
                {activeEditor.payModel === 'hourly'
                  ? `Rate ${formatCurrency(activeEditor.hourlyRate ?? 0)}/hr`
                  : 'Approved deliverables'}
              </p>
              <strong className="tabular">
                {activeEditor.payModel === 'hourly'
                  ? formatCurrency(paySummary.currentSummary.pay)
                  : paySummary.currentSummary.approvedDeliverables}
              </strong>
            </div>
            <div className="total-card">
              <p>Current payout</p>
              <strong className="tabular">{formatCurrency(paySummary.currentSummary.pay)}</strong>
            </div>
          </div>

          <div className="hours-form">
            <label>
              Project
              <select value={logProjectId} onChange={(event) => setLogProjectId(event.target.value)}>
                {scopedProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Hours
              <input
                type="number"
                min={0.25}
                step={0.25}
                value={hoursDraft}
                onChange={(event) => setHoursDraft(event.target.value)}
              />
            </label>
            <button type="button" onClick={logHours}>
              Log hours
            </button>
          </div>

          {paySummary.history.length === 0 ? (
            <p className="muted">No historical periods yet.</p>
          ) : (
            <ul className="history-list">
              {paySummary.history.map((summary) => (
                <li key={summary.periodKey}>
                  <p>{monthLabel(summary.periodKey, activeEditor.timezone)}</p>
                  <p className="tabular">{summary.hours.toFixed(2)} hrs</p>
                  <p className="tabular">{formatCurrency(summary.pay)}</p>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="surface-card">
          <header className="surface-head">
            <h2>Recent time entries</h2>
            <p className="muted">Latest logged activity in your local timezone.</p>
          </header>

          <ul className="time-entry-list">
            {timeEntries
              .filter((entry) => entry.editorId === activeEditor.id)
              .sort((entryA, entryB) => new Date(entryB.date).getTime() - new Date(entryA.date).getTime())
              .slice(0, 8)
              .map((entry) => (
                <li key={entry.id}>
                  <p>{projectById[entry.projectId]?.title ?? 'Unknown project'}</p>
                  <p className="tabular muted">
                    {entry.hours.toFixed(2)} hrs - {formatDateTime(entry.date, activeEditor.timezone)}
                  </p>
                </li>
              ))}
          </ul>
        </article>
      </section>
    )
  }

  const renderResourcesSection = () => {
    if (isLoading) {
      return (
        <div className="content-grid-single" aria-hidden="true">
          <div className="surface-card">
            <div className="skeleton-box"></div>
            <div className="skeleton-box"></div>
            <div className="skeleton-box"></div>
          </div>
        </div>
      )
    }

    return (
      <section className="content-grid-single">
        <article className="surface-card">
          <header className="surface-head">
            <h2>Resources & standards</h2>
            <p className="muted">Fast references for exports, naming, graphics, and style consistency.</p>
          </header>

          <ul className="resource-list">
            {RESOURCES.map((resource) => (
              <li key={resource.title}>
                <h3>{resource.title}</h3>
                <p>{resource.body}</p>
              </li>
            ))}
          </ul>
        </article>
      </section>
    )
  }

  return (
    <div className="workspace-shell" data-theme={themeMode}>
      <aside className={`left-rail ${isRailCollapsed ? 'left-rail-collapsed' : ''}`}>
        <div className="rail-top">
          <div className="brand-lockup">
            <p>Contentout</p>
            <h1>Editor panel</h1>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={() => setIsRailCollapsed((prev) => !prev)}
            aria-label={isRailCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            <Icon
              name={isRailCollapsed ? 'chevron_right' : 'chevron_left'}
              className="icon icon-inline"
            />
          </button>
        </div>

        <nav className="rail-nav" aria-label="Primary navigation">
          <button
            type="button"
            className={activeSection === 'queue' ? 'nav-item nav-item-active' : 'nav-item'}
            onClick={() => setActiveSection('queue')}
          >
            <Icon name="queue" className="icon nav-icon" />
            <span className="nav-label">Queue</span>
          </button>
          <button
            type="button"
            className={activeSection === 'hours' ? 'nav-item nav-item-active' : 'nav-item'}
            onClick={() => setActiveSection('hours')}
          >
            <Icon name="hours" className="icon nav-icon" />
            <span className="nav-label">Hours</span>
          </button>
          <button
            type="button"
            className={activeSection === 'resources' ? 'nav-item nav-item-active' : 'nav-item'}
            onClick={() => setActiveSection('resources')}
          >
            <Icon name="resources" className="icon nav-icon" />
            <span className="nav-label">Resources</span>
          </button>
        </nav>

        <div className="rail-meta">
          <label htmlFor="editor-select">Logged in as</label>
          <select
            id="editor-select"
            value={activeEditor.id}
            onChange={(event) => {
              setActiveEditorId(event.target.value)
              setClientFilter('all')
              setStatusFilter('all')
              setActiveSection('queue')
            }}
          >
            {editors.map((editor) => (
              <option key={editor.id} value={editor.id}>
                {editor.name}
              </option>
            ))}
          </select>
          <p className="muted tabular">{activeEditor.timezone}</p>

          <button
            type="button"
            className="theme-toggle"
            onClick={() => setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'))}
          >
            <Icon name={themeMode === 'dark' ? 'sun' : 'moon'} className="icon icon-inline" />
            <span>Theme: {themeMode === 'dark' ? 'Dark' : 'Light'}</span>
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="main-header">
          <div>
            <p className="eyebrow">{activeEditor.name}</p>
            <div className="section-title">
              <Icon name={sectionIcon(activeSection)} className="icon" />
              <h2>{sectionTitle(activeSection)}</h2>
            </div>
          </div>
          <div className="header-metrics">
            <div>
              <p>
                <Icon name="alert" className="icon icon-inline" />
                Overdue
              </p>
              <strong className="tabular">{overdueCount}</strong>
            </div>
            <div>
              <p>
                <Icon name="calendar" className="icon icon-inline" />
                Now
              </p>
              <strong className="tabular">{formatDate(new Date().toISOString(), activeEditor.timezone)}</strong>
            </div>
          </div>
        </header>

        {activeSection === 'queue' ? (
          <section className="content-grid-two">
            <article className="surface-card">
              <header className="surface-head">
                <h2>My queue</h2>
                <p className="muted">Deadline-sorted and scoped to your assignments only.</p>
              </header>

              <div className="filters-row">
                <label>
                  Client
                  <select value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}>
                    <option value="all">All clients</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Status
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as 'all' | ProjectStatus)}
                  >
                    <option value="all">All statuses</option>
                    {Object.entries(STATUS_LABELS).map(([status, label]) => (
                      <option key={status} value={status}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {renderQueueContent()}
            </article>

            <article className="surface-card">{renderProjectDetail()}</article>
          </section>
        ) : null}

        {activeSection === 'hours' ? renderHoursSection() : null}
        {activeSection === 'resources' ? renderResourcesSection() : null}
      </main>

      {toast ? (
        <div className="toast" role="status" aria-live="polite">
          {toast.message}
        </div>
      ) : null}
    </div>
  )
}

export default App
