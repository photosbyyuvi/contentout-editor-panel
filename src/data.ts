import type {
  AppNotification,
  Client,
  Editor,
  Project,
  TimeEntry,
} from './types'

// Seed due/log dates are anchored relative to load time so urgency states
// (overdue / due soon / on track) always read realistically in the demo.
const NOW = Date.now()
const HOUR = 36e5
const DAY = 24 * HOUR

function hoursFromNow(hours: number): string {
  return new Date(NOW + hours * HOUR).toISOString()
}

function daysFromNow(days: number): string {
  return new Date(NOW + days * DAY).toISOString()
}

export const EDITORS: Editor[] = [
  {
    id: 'ed-savithru',
    name: 'Savithru Perera',
    timezone: 'Asia/Kolkata',
    payModel: 'hourly',
    hourlyRate: 22,
    flatRates: null,
    avatarInitials: 'SP',
  },
  {
    id: 'ed-mihail',
    name: 'Mihail Trpkovski',
    timezone: 'Europe/Skopje',
    payModel: 'flat',
    hourlyRate: null,
    flatRates: { reel: 120, long_form: 260, batch_graphics: 90 },
    avatarInitials: 'MT',
  },
  {
    id: 'ed-gaurav',
    name: 'Gaurav Nair',
    timezone: 'Asia/Kolkata',
    payModel: 'hourly',
    hourlyRate: 20,
    flatRates: null,
    avatarInitials: 'GN',
  },
]

export const CLIENTS: Client[] = [
  { id: 'c-yfl', name: 'Yorkdale Ford Lincoln', accentColor: '#6E9BD8' },
  { id: 'c-land', name: 'Landscaping Legends', accentColor: '#7FB08A' },
  { id: 'c-mrg', name: 'MRG Group', accentColor: '#A98AD1' },
  { id: 'c-event', name: 'Event Coverage', accentColor: '#CBA76A' },
]

export const PROJECTS: Project[] = [
  // ── Savithru (hourly) — covers all five statuses and urgencies ──
  {
    id: 'p-yfl-reel',
    clientId: 'c-yfl',
    title: 'Yorkdale 9:16 Summer Lease Reel',
    deliverableType: 'reel',
    brief:
      'Fast-paced social cut, 20–25s, bold text callouts, clean transitions. Prioritize SUVs and dealership team moments.',
    specs: {
      aspectRatio: '9:16',
      resolution: '1080×1920',
      bitrate: '16 Mbps',
      fileNaming: 'YFL_Reel_SummerLease_v{n}.mp4',
    },
    assetLinks: [
      { label: 'Source footage', url: 'https://drive.google.com/yfl/source-footage' },
      { label: 'Brand graphics pack', url: 'https://drive.google.com/yfl/graphics-pack' },
      { label: 'Reference cuts', url: 'https://vimeo.com/showcase/yfl-references' },
    ],
    status: 'editing',
    dueDate: hoursFromNow(18),
    assignedEditorId: 'ed-savithru',
    revisions: [],
    comments: [
      {
        id: 'cm-yfl-1',
        authorName: 'Daniel (Contentout)',
        body: 'Lock the hook in the first 2 seconds — the lease offer card should land fast.',
        createdAt: hoursFromNow(-6),
      },
    ],
    deliveryLink: null,
    approvedAt: null,
  },
  {
    id: 'p-land-longform',
    clientId: 'c-land',
    title: 'Landscaping Legends June Long Form',
    deliverableType: 'long_form',
    brief:
      '3–4 minute YouTube piece. Professional but warm tone. Show before/after progression and owner interview highlights.',
    specs: {
      aspectRatio: '16:9',
      resolution: '3840×2160',
      bitrate: '35 Mbps',
      fileNaming: 'LL_LongForm_June_v{n}.mp4',
    },
    assetLinks: [
      { label: 'Primary footage folder', url: 'https://drive.google.com/landscaping/primary' },
      { label: 'Interview transcript', url: 'https://docs.google.com/landscaping/transcript' },
    ],
    status: 'revisions_requested',
    dueDate: hoursFromNow(44),
    assignedEditorId: 'ed-savithru',
    revisions: [
      {
        round: 1,
        notes: [
          'Trim the intro to land on the owner interview by 0:20.',
          'Color is slightly cool on the exterior shots — warm it a touch.',
        ],
        requestedAt: daysFromNow(-3),
        resolvedAt: daysFromNow(-2),
      },
      {
        round: 2,
        notes: [
          'Add chapter markers for each yard transformation.',
          'Lower music under the interview VO by ~4 dB.',
        ],
        requestedAt: hoursFromNow(-9),
        resolvedAt: null,
      },
    ],
    comments: [
      {
        id: 'cm-land-1',
        authorName: 'Yasmeen (Contentout)',
        body: 'Round 2 notes are posted — mainly pacing and audio balance.',
        createdAt: hoursFromNow(-9),
      },
      {
        id: 'cm-land-2',
        authorName: 'Savithru Perera',
        body: 'On it — chapter markers in, re-balancing the VO now.',
        createdAt: hoursFromNow(-7),
      },
    ],
    deliveryLink: 'https://frame.io/landscaping-longform-v2',
    approvedAt: null,
  },
  {
    id: 'p-mrg-retouch',
    clientId: 'c-mrg',
    title: 'MRG Rooftop Event Photo Retouch',
    deliverableType: 'photo_retouch',
    brief:
      'Retouch 60 selects for web and press use. Keep skin tones natural and preserve venue ambiance.',
    specs: {
      aspectRatio: 'Mixed',
      resolution: '6000px long edge',
      bitrate: 'N/A',
      fileNaming: 'MRG_Rooftop_Retouch_{index}.jpg',
    },
    assetLinks: [
      { label: 'RAW selects', url: 'https://drive.google.com/mrg/raw-selects' },
      { label: 'Color reference', url: 'https://drive.google.com/mrg/color-reference' },
    ],
    status: 'submitted',
    dueDate: hoursFromNow(60),
    assignedEditorId: 'ed-savithru',
    revisions: [],
    comments: [],
    deliveryLink: 'https://dropbox.com/mrg/retouch-delivery-v1',
    approvedAt: null,
  },
  {
    id: 'p-yfl-cull',
    clientId: 'c-yfl',
    title: 'Yorkdale Weekend Shoot Photo Cull',
    deliverableType: 'photo_cull',
    brief:
      'Cull 1,200 images down to the top 180 for social and ad use. Tag hero shots and flag any missing angle coverage.',
    specs: {
      aspectRatio: 'Mixed',
      resolution: 'Original',
      bitrate: 'N/A',
      fileNaming: 'YFL_Cull_Select_{index}.jpg',
    },
    assetLinks: [
      { label: 'Capture One catalog', url: 'https://drive.google.com/yfl/catalog' },
      { label: 'Selection criteria', url: 'https://docs.google.com/yfl/cull-rules' },
    ],
    status: 'not_started',
    dueDate: daysFromNow(6),
    assignedEditorId: 'ed-savithru',
    revisions: [],
    comments: [],
    deliveryLink: null,
    approvedAt: null,
  },
  {
    id: 'p-mrg-brunch-reel',
    clientId: 'c-mrg',
    title: 'MRG Investor Brunch Recap Reel',
    deliverableType: 'reel',
    brief:
      'Punchy 30s recap of the investor brunch. Lead with the keynote moment, close on the group toast.',
    specs: {
      aspectRatio: '9:16',
      resolution: '1080×1920',
      bitrate: '16 Mbps',
      fileNaming: 'MRG_Reel_Brunch_v{n}.mp4',
    },
    assetLinks: [
      { label: 'Source footage', url: 'https://drive.google.com/mrg/brunch-footage' },
    ],
    status: 'editing',
    dueDate: hoursFromNow(-5),
    assignedEditorId: 'ed-savithru',
    revisions: [],
    comments: [
      {
        id: 'cm-mrg-1',
        authorName: 'Daniel (Contentout)',
        body: 'This one slipped past due — prioritize it right after the Yorkdale reel.',
        createdAt: hoursFromNow(-2),
      },
    ],
    deliveryLink: null,
    approvedAt: null,
  },
  {
    id: 'p-event-gala',
    clientId: 'c-event',
    title: 'Event Coverage Spring Gala Highlight',
    deliverableType: 'long_form',
    brief:
      '90-second highlight of the spring gala. Cinematic, warm, music-led. Feature the award presentation.',
    specs: {
      aspectRatio: '16:9',
      resolution: '3840×2160',
      bitrate: '35 Mbps',
      fileNaming: 'EVT_Highlight_SpringGala_v{n}.mp4',
    },
    assetLinks: [
      { label: 'Source footage', url: 'https://drive.google.com/event/gala-footage' },
      { label: 'Approved music bed', url: 'https://drive.google.com/event/gala-music' },
    ],
    status: 'approved',
    dueDate: daysFromNow(-10),
    assignedEditorId: 'ed-savithru',
    revisions: [
      {
        round: 1,
        notes: ['Hold the award moment a beat longer.', 'Swap the opening title to the gold variant.'],
        requestedAt: daysFromNow(-13),
        resolvedAt: daysFromNow(-12),
      },
      {
        round: 2,
        notes: ['Final polish on the closing fade.'],
        requestedAt: daysFromNow(-11),
        resolvedAt: daysFromNow(-10),
      },
    ],
    comments: [
      {
        id: 'cm-event-1',
        authorName: 'Yasmeen (Contentout)',
        body: 'Approved — beautiful pacing. Client loved it.',
        createdAt: daysFromNow(-9),
      },
    ],
    deliveryLink: 'https://frame.io/event-gala-final',
    approvedAt: daysFromNow(-9),
  },

  // ── Mihail (flat) ──
  {
    id: 'p-event-batch',
    clientId: 'c-event',
    title: 'Event Coverage Batch Graphics Package',
    deliverableType: 'batch_graphics',
    brief:
      'Create 10 lower-thirds and 6 endcards from the approved event kit. Maintain monochrome palette with one accent.',
    specs: {
      aspectRatio: '16:9 and 9:16',
      resolution: '1920×1080 / 1080×1920',
      bitrate: 'N/A',
      fileNaming: 'EVT_GFX_{assetName}_v{n}.png',
    },
    assetLinks: [
      { label: 'Template pack', url: 'https://figma.com/event/template-pack' },
      { label: 'Past approved examples', url: 'https://drive.google.com/event/approved-examples' },
    ],
    status: 'approved',
    dueDate: daysFromNow(-7),
    assignedEditorId: 'ed-mihail',
    revisions: [
      {
        round: 1,
        notes: ['Increase text padding on mobile safe-area assets.'],
        requestedAt: daysFromNow(-9),
        resolvedAt: daysFromNow(-8),
      },
    ],
    comments: [
      {
        id: 'cm-batch-1',
        authorName: 'Contentout Review',
        body: 'Approved. Great consistency across all graphics.',
        createdAt: daysFromNow(-6),
      },
    ],
    deliveryLink: 'https://frame.io/event-graphics-final',
    approvedAt: daysFromNow(-6),
  },
  {
    id: 'p-land-brand-reel',
    clientId: 'c-land',
    title: 'Landscaping Legends Brand Reel',
    deliverableType: 'reel',
    brief:
      'Evergreen 15s brand reel for the pinned profile slot. Confident, clean, one accent color only.',
    specs: {
      aspectRatio: '9:16',
      resolution: '1080×1920',
      bitrate: '16 Mbps',
      fileNaming: 'LL_Reel_Brand_v{n}.mp4',
    },
    assetLinks: [{ label: 'Source footage', url: 'https://drive.google.com/landscaping/brand' }],
    status: 'editing',
    dueDate: hoursFromNow(28),
    assignedEditorId: 'ed-mihail',
    revisions: [],
    comments: [],
    deliveryLink: null,
    approvedAt: null,
  },
  {
    id: 'p-mrg-conference',
    clientId: 'c-mrg',
    title: 'MRG Group Annual Conference Long Form',
    deliverableType: 'long_form',
    brief:
      '4-minute conference recap. Balance keynote substance with energy from the networking floor.',
    specs: {
      aspectRatio: '16:9',
      resolution: '3840×2160',
      bitrate: '35 Mbps',
      fileNaming: 'MRG_LongForm_Conf_v{n}.mp4',
    },
    assetLinks: [
      { label: 'Multi-cam footage', url: 'https://drive.google.com/mrg/conf-footage' },
      { label: 'Run of show', url: 'https://docs.google.com/mrg/conf-ros' },
    ],
    status: 'submitted',
    dueDate: hoursFromNow(50),
    assignedEditorId: 'ed-mihail',
    revisions: [],
    comments: [],
    deliveryLink: 'https://frame.io/mrg-conference-v1',
    approvedAt: null,
  },

  // ── Gaurav (hourly) ──
  {
    id: 'p-yfl-service-reel',
    clientId: 'c-yfl',
    title: 'Yorkdale Service Dept Promo Reel',
    deliverableType: 'reel',
    brief:
      'Trust-building 20s reel on the service department. Friendly techs, quick turnaround messaging.',
    specs: {
      aspectRatio: '9:16',
      resolution: '1080×1920',
      bitrate: '16 Mbps',
      fileNaming: 'YFL_Reel_Service_v{n}.mp4',
    },
    assetLinks: [{ label: 'Source footage', url: 'https://drive.google.com/yfl/service-footage' }],
    status: 'revisions_requested',
    dueDate: hoursFromNow(22),
    assignedEditorId: 'ed-gaurav',
    revisions: [
      {
        round: 1,
        notes: ['Cut the slow pan at 0:08.', 'Add the booking URL to the end card.'],
        requestedAt: hoursFromNow(-14),
        resolvedAt: null,
      },
    ],
    comments: [
      {
        id: 'cm-service-1',
        authorName: 'Daniel (Contentout)',
        body: 'Quick round — just the pan and the end card CTA.',
        createdAt: hoursFromNow(-14),
      },
    ],
    deliveryLink: 'https://frame.io/yfl-service-v1',
    approvedAt: null,
  },
  {
    id: 'p-event-wedding-cull',
    clientId: 'c-event',
    title: 'Event Coverage Wedding Photo Cull',
    deliverableType: 'photo_cull',
    brief:
      'Cull a full wedding day down to 250 delivery selects. Prioritize key moments and clean candids.',
    specs: {
      aspectRatio: 'Mixed',
      resolution: 'Original',
      bitrate: 'N/A',
      fileNaming: 'EVT_Wedding_Cull_{index}.jpg',
    },
    assetLinks: [{ label: 'RAW catalog', url: 'https://drive.google.com/event/wedding-catalog' }],
    status: 'not_started',
    dueDate: daysFromNow(5),
    assignedEditorId: 'ed-gaurav',
    revisions: [],
    comments: [],
    deliveryLink: null,
    approvedAt: null,
  },
]

export const TIME_ENTRIES: TimeEntry[] = [
  // Savithru — a month of activity ($22/h)
  { id: 'te-s1', projectId: 'p-event-gala', editorId: 'ed-savithru', hours: 4.5, date: daysFromNow(-12), rateApplied: 22 },
  { id: 'te-s2', projectId: 'p-event-gala', editorId: 'ed-savithru', hours: 3.0, date: daysFromNow(-11), rateApplied: 22 },
  { id: 'te-s3', projectId: 'p-land-longform', editorId: 'ed-savithru', hours: 5.25, date: daysFromNow(-6), rateApplied: 22 },
  { id: 'te-s4', projectId: 'p-land-longform', editorId: 'ed-savithru', hours: 2.5, date: daysFromNow(-3), rateApplied: 22 },
  { id: 'te-s5', projectId: 'p-yfl-reel', editorId: 'ed-savithru', hours: 3.5, date: daysFromNow(-1), rateApplied: 22 },
  { id: 'te-s6', projectId: 'p-mrg-brunch-reel', editorId: 'ed-savithru', hours: 1.5, date: hoursFromNow(-4), rateApplied: 22 },

  // Mihail — flat model still logs hours for visibility (rate 0)
  { id: 'te-m1', projectId: 'p-event-batch', editorId: 'ed-mihail', hours: 4.0, date: daysFromNow(-8), rateApplied: 0 },
  { id: 'te-m2', projectId: 'p-mrg-conference', editorId: 'ed-mihail', hours: 6.5, date: daysFromNow(-2), rateApplied: 0 },
  { id: 'te-m3', projectId: 'p-land-brand-reel', editorId: 'ed-mihail', hours: 2.0, date: hoursFromNow(-20), rateApplied: 0 },

  // Gaurav ($20/h)
  { id: 'te-g1', projectId: 'p-yfl-service-reel', editorId: 'ed-gaurav', hours: 3.0, date: daysFromNow(-2), rateApplied: 20 },
  { id: 'te-g2', projectId: 'p-yfl-service-reel', editorId: 'ed-gaurav', hours: 1.75, date: hoursFromNow(-15), rateApplied: 20 },
]

// ── Thin mock "API" layer (swap for a real backend without touching components) ──

export function getEditors(): Editor[] {
  return EDITORS
}

export function getEditor(editorId: string): Editor | undefined {
  return EDITORS.find((editor) => editor.id === editorId)
}

export function getClients(): Client[] {
  return CLIENTS
}

export function getProjectsForEditor(projects: Project[], editorId: string): Project[] {
  return projects.filter((project) => project.assignedEditorId === editorId)
}

export function getTimeEntriesForEditor(entries: TimeEntry[], editorId: string): TimeEntry[] {
  return entries.filter((entry) => entry.editorId === editorId)
}

export function buildNotificationsForEditor(projects: Project[], editorId: string): AppNotification[] {
  const scoped = getProjectsForEditor(projects, editorId)
  const notifications: AppNotification[] = []

  for (const project of scoped) {
    if (project.status === 'revisions_requested') {
      const latest = project.revisions[project.revisions.length - 1]
      notifications.push({
        id: `nf-rev-${project.id}`,
        kind: 'revisions',
        projectId: project.id,
        title: 'Revisions requested',
        body: `${project.title} · ${latest ? `${latest.notes.length} new notes` : 'new notes'}`,
        createdAt: latest?.requestedAt ?? project.dueDate,
        read: false,
      })
    } else if (project.status === 'approved' && project.approvedAt) {
      notifications.push({
        id: `nf-app-${project.id}`,
        kind: 'approval',
        projectId: project.id,
        title: 'Delivery approved',
        body: project.title,
        createdAt: project.approvedAt,
        read: false,
      })
    } else if (project.status === 'not_started') {
      notifications.push({
        id: `nf-asn-${project.id}`,
        kind: 'assignment',
        projectId: project.id,
        title: 'New assignment',
        body: project.title,
        createdAt: project.dueDate,
        read: false,
      })
    }
  }

  return notifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}
