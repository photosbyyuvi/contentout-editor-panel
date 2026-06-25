import { useEffect, useMemo, useState } from 'react'

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
  { id: 'c-yfl', name: 'Yorkdale Ford Lincoln', accentColor: '#6ea8ff' },
  { id: 'c-land', name: 'Landscaping Legends', accentColor: '#7fdb8a' },
  { id: 'c-mrg', name: 'MRG Group', accentColor: '#d9a3ff' },
  { id: 'c-event', name: 'Event Coverage', accentColor: '#ffd18f' },
]

const MOCK_PROJECTS: Project[] = [
  {
    id: 'p-yfl-r1',
    clientId: 'c-yfl',
    title: 'Yorkdale 9:16 Summer Lease Reel',
    deliverableType: 'reel',
    brief:
      'Fast paced social cut, 20-25s, bold text callouts, clean transitions. Prioritize SUVs and dealership team moments.',
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
    body: 'Use project short code + deliverable + version number (v1, v2...) before final export.',
  },
  {
    title: 'Export presets',
    body: 'Social masters: H.264 12-16 Mbps. Archive masters: ProRes 422 HQ with matching frame rate.',
  },
  {
    title: 'Brand graphics',
    body: 'Keep lower-thirds inside safe margins and use approved typography scale from the latest kit.',
  },
  {
    title: 'Style references',
    body: 'Match pacing and transitions from approved showcase reels for each client before trying new treatments.',
  },
]

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
  const labelDate = new Date(`${periodKey}-01T00:00:00Z`)
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone,
  }).format(labelDate)
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

function App() {
  const [editors] = useState<Editor[]>(MOCK_EDITORS)
  const [clients] = useState<Client[]>(MOCK_CLIENTS)
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS)
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(MOCK_TIME_ENTRIES)

  const [activeEditorId, setActiveEditorId] = useState(editors[0].id)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [clientFilter, setClientFilter] = useState<'all' | string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all')
  const [deliveryLinkDraft, setDeliveryLinkDraft] = useState('')
  const [commentDraft, setCommentDraft] = useState('')
  const [revisionDraft, setRevisionDraft] = useState('')
  const [hoursDraft, setHoursDraft] = useState('1')
  const [logProjectId, setLogProjectId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 700)
    return () => window.clearTimeout(timer)
  }, [])

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

  useEffect(() => {
    if (queueProjects.length === 0) {
      setSelectedProjectId(null)
      return
    }

    const currentExists = queueProjects.some((project) => project.id === selectedProjectId)
    if (!currentExists) {
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
  }, [logProjectId, queueProjects])

  const selectedProject =
    scopedProjects.find((project) => project.id === selectedProjectId) ?? null

  const clientById = useMemo(
    () => Object.fromEntries(clients.map((client) => [client.id, client])) as Record<string, Client>,
    [clients],
  )

  const projectById = useMemo(
    () => Object.fromEntries(projects.map((project) => [project.id, project])) as Record<string, Project>,
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

    const history = periodSummaries.filter((summary) => summary.periodKey !== currentPeriod)
    return { currentSummary, history }
  }, [activeEditor, scopedProjects, timeEntries])

  function updateProject(projectId: string, updater: (project: Project) => Project): void {
    setProjects((previous) =>
      previous.map((project) => (project.id === projectId ? updater(project) : project)),
    )
  }

  function setProjectStatus(projectId: string, status: ProjectStatus): void {
    updateProject(projectId, (project) => ({
      ...project,
      status,
      approvedAt: status === 'approved' ? new Date().toISOString() : null,
    }))
  }

  function submitForReview(): void {
    if (!selectedProject || deliveryLinkDraft.trim().length === 0) {
      return
    }

    updateProject(selectedProject.id, (project) => {
      const updatedRevisions = project.revisions.map((revision) => {
        if (revision.resolvedAt === null) {
          return { ...revision, resolvedAt: new Date().toISOString() }
        }
        return revision
      })

      return {
        ...project,
        status: 'submitted',
        deliveryLink: deliveryLinkDraft.trim(),
        revisions: updatedRevisions,
        approvedAt: null,
      }
    })

    setDeliveryLinkDraft('')
  }

  function requestRevision(): void {
    if (!selectedProject) {
      return
    }

    const notes = revisionDraft
      .split('\n')
      .map((note) => note.trim())
      .filter(Boolean)

    const safeNotes = notes.length > 0 ? notes : ['Please adjust pacing and tighten intro.']

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
  }

  function logHours(): void {
    if (logProjectId.length === 0) {
      return
    }

    const parsed = Number(hoursDraft)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return
    }

    setTimeEntries((previous) => [
      ...previous,
      {
        id: `te-${crypto.randomUUID()}`,
        projectId: logProjectId,
        editorId: activeEditor.id,
        hours: parsed,
        date: new Date().toISOString(),
        rateApplied: activeEditor.hourlyRate ?? 0,
      },
    ])
    setHoursDraft('1')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Contentout editor panel</p>
          <h1>My Queue</h1>
        </div>
        <div className="editor-switcher">
          <label htmlFor="editorSelect">Logged in as</label>
          <select
            id="editorSelect"
            value={activeEditor.id}
            onChange={(event) => {
              setActiveEditorId(event.target.value)
              setClientFilter('all')
              setStatusFilter('all')
            }}
          >
            {editors.map((editor) => (
              <option key={editor.id} value={editor.id}>
                {editor.name} ({editor.avatarInitials})
              </option>
            ))}
          </select>
          <p className="timezone">{activeEditor.timezone}</p>
        </div>
      </header>

      <section className="layout-primary">
        <article className="panel">
          <div className="panel-header">
            <h2>Queue</h2>
            <p>Sorted by due date, scoped to your assignments only.</p>
          </div>

          <div className="filters">
            <label>
              Client
              <select
                value={clientFilter}
                onChange={(event) => setClientFilter(event.target.value)}
              >
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
                onChange={(event) =>
                  setStatusFilter(event.target.value as 'all' | ProjectStatus)
                }
              >
                <option value="all">All statuses</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {isLoading ? (
            <p className="loading">Loading queue…</p>
          ) : queueProjects.length === 0 ? (
            <p className="empty">
              Nothing assigned yet - check back or message the team.
            </p>
          ) : (
            <ul className="queue-list">
              {queueProjects.map((project) => {
                const urgency = projectUrgency(project.dueDate, project.status)
                const client = clientById[project.clientId]
                return (
                  <li key={project.id}>
                    <button
                      type="button"
                      className={`queue-card ${
                        project.id === selectedProjectId ? 'queue-card-active' : ''
                      }`}
                      onClick={() => setSelectedProjectId(project.id)}
                    >
                      <div className="queue-card-header">
                        <span
                          className="client-dot"
                          style={{ backgroundColor: client.accentColor }}
                          aria-hidden="true"
                        ></span>
                        <p>{client.name}</p>
                      </div>
                      <h3>{project.title}</h3>
                      <p className="meta-row">{DELIVERABLE_LABELS[project.deliverableType]}</p>
                      <p className="meta-row">
                        Due {formatDateTime(project.dueDate, activeEditor.timezone)}
                      </p>
                      <div className="pill-row">
                        <span className={`pill urgency-${urgency}`}>
                          {URGENCY_LABELS[urgency]}
                        </span>
                        <span className={`pill status-${project.status}`}>
                          {STATUS_LABELS[project.status]}
                        </span>
                        {project.status === 'revisions_requested' ? (
                          <span className="pill badge">New notes</span>
                        ) : null}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>Project detail</h2>
            <p>Brief, assets, revisions, comments, and delivery in one place.</p>
          </div>

          {isLoading ? (
            <p className="loading">Loading project…</p>
          ) : !selectedProject ? (
            <p className="empty">Select a project from your queue to start working.</p>
          ) : (
            <div className="project-detail">
              <div className="project-title-row">
                <div>
                  <p className="project-client">{clientById[selectedProject.clientId].name}</p>
                  <h3>{selectedProject.title}</h3>
                </div>
                <span className={`pill status-${selectedProject.status}`}>
                  {STATUS_LABELS[selectedProject.status]}
                </span>
              </div>

              <section>
                <h4>Brief</h4>
                <p>{selectedProject.brief}</p>
              </section>

              <section>
                <h4>Deliverable specs</h4>
                <ul className="spec-grid">
                  <li>
                    <span>Aspect ratio</span>
                    <strong>{selectedProject.specs.aspectRatio}</strong>
                  </li>
                  <li>
                    <span>Resolution</span>
                    <strong>{selectedProject.specs.resolution}</strong>
                  </li>
                  <li>
                    <span>Bitrate</span>
                    <strong>{selectedProject.specs.bitrate}</strong>
                  </li>
                  <li>
                    <span>File naming</span>
                    <strong>{selectedProject.specs.fileNaming}</strong>
                  </li>
                </ul>
              </section>

              <section>
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

              <section>
                <h4>Workflow</h4>
                <div className="action-row">
                  <button
                    type="button"
                    onClick={() => setProjectStatus(selectedProject.id, 'not_started')}
                  >
                    Mark not started
                  </button>
                  <button
                    type="button"
                    onClick={() => setProjectStatus(selectedProject.id, 'editing')}
                  >
                    Start editing
                  </button>
                  <button
                    type="button"
                    onClick={() => setProjectStatus(selectedProject.id, 'approved')}
                  >
                    Mark approved
                  </button>
                </div>
                <div className="delivery-form">
                  <input
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
                <div className="revision-form">
                  <textarea
                    value={revisionDraft}
                    onChange={(event) => setRevisionDraft(event.target.value)}
                    placeholder="Line-break separated revision notes"
                    aria-label="Revision notes"
                    rows={3}
                  />
                  <button type="button" onClick={requestRevision}>
                    Add revision request
                  </button>
                </div>
              </section>

              <section>
                <h4>Revision history</h4>
                {selectedProject.revisions.length === 0 ? (
                  <p className="empty-inline">No revision rounds yet.</p>
                ) : (
                  <ol className="revision-list">
                    {selectedProject.revisions.map((revision) => (
                      <li key={revision.round}>
                        <p className="revision-heading">
                          Round {revision.round} - requested{' '}
                          {formatDateTime(revision.requestedAt, activeEditor.timezone)}
                        </p>
                        <ul>
                          {revision.notes.map((note) => (
                            <li key={`${revision.round}-${note}`}>{note}</li>
                          ))}
                        </ul>
                        <p className="revision-state">
                          {revision.resolvedAt
                            ? `Resolved ${formatDateTime(
                                revision.resolvedAt,
                                activeEditor.timezone,
                              )}`
                            : 'Awaiting redelivery'}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section>
                <h4>Comments</h4>
                {selectedProject.comments.length === 0 ? (
                  <p className="empty-inline">No comments yet.</p>
                ) : (
                  <ul className="comment-list">
                    {selectedProject.comments.map((comment) => (
                      <li key={comment.id}>
                        <p className="comment-meta">
                          {comment.authorName} -{' '}
                          {formatDateTime(comment.createdAt, activeEditor.timezone)}
                        </p>
                        <p>{comment.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="comment-form">
                  <textarea
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value)}
                    placeholder="Add a project comment"
                    aria-label="Project comment"
                    rows={2}
                  />
                  <button type="button" onClick={addComment}>
                    Post comment
                  </button>
                </div>
              </section>
            </div>
          )}
        </article>
      </section>

      <section className="layout-secondary">
        <article className="panel">
          <div className="panel-header">
            <h2>Hours & pay</h2>
            <p>Monthly payout view with historical periods.</p>
          </div>

          <div className="totals-grid">
            <div className="total-card">
              <p>Current period</p>
              <h3>{monthLabel(paySummary.currentSummary.periodKey, activeEditor.timezone)}</h3>
            </div>
            <div className="total-card">
              <p>Logged hours</p>
              <h3>{paySummary.currentSummary.hours.toFixed(2)}</h3>
            </div>
            <div className="total-card">
              <p>
                {activeEditor.payModel === 'hourly'
                  ? `Rate ${formatCurrency(activeEditor.hourlyRate ?? 0)}/hr`
                  : 'Approved deliverables'}
              </p>
              <h3>
                {activeEditor.payModel === 'hourly'
                  ? formatCurrency(paySummary.currentSummary.pay)
                  : paySummary.currentSummary.approvedDeliverables}
              </h3>
            </div>
            <div className="total-card">
              <p>Current payout</p>
              <h3>{formatCurrency(paySummary.currentSummary.pay)}</h3>
            </div>
          </div>

          <div className="hours-form">
            <label>
              Project
              <select
                value={logProjectId}
                onChange={(event) => setLogProjectId(event.target.value)}
              >
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
            <p className="empty-inline">No historical periods yet.</p>
          ) : (
            <ul className="history-list">
              {paySummary.history.map((period) => (
                <li key={period.periodKey}>
                  <p>{monthLabel(period.periodKey, activeEditor.timezone)}</p>
                  <p>{period.hours.toFixed(2)} hrs</p>
                  <p>{formatCurrency(period.pay)}</p>
                </li>
              ))}
            </ul>
          )}

          <ul className="timeentry-list">
            {timeEntries
              .filter((entry) => entry.editorId === activeEditor.id)
              .slice()
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 5)
              .map((entry) => (
                <li key={entry.id}>
                  <p>{projectById[entry.projectId]?.title ?? 'Unknown project'}</p>
                  <p>
                    {entry.hours} hrs - {formatDateTime(entry.date, activeEditor.timezone)}
                  </p>
                </li>
              ))}
          </ul>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>Resources & standards</h2>
            <p>Reference guidance for exports, naming, and style consistency.</p>
          </div>
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
    </div>
  )
}

export default App
