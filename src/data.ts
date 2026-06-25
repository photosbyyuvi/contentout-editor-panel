import {
  defaultNotificationPrefs,
  type ActivityLog,
  type AppNotification,
  type Client,
  type Delivery,
  type Project,
  type TimeEntry,
  type User,
} from './types'

// Seed dates are anchored relative to load time so urgency states stay realistic.
const NOW = Date.now()
const HOUR = 36e5
const DAY = 24 * HOUR

const hoursFromNow = (hours: number): string => new Date(NOW + hours * HOUR).toISOString()
const daysFromNow = (days: number): string => new Date(NOW + days * DAY).toISOString()

const MOCK_PASSWORD = 'contentout'

export const USERS: User[] = [
  {
    id: 'u-yuvi',
    fullName: 'Yuvi Gill',
    email: 'yuvi@contentout.studio',
    passwordHash: MOCK_PASSWORD,
    role: 'owner',
    status: 'active',
    avatarInitials: 'YG',
    timezone: 'America/Toronto',
    createdAt: daysFromNow(-220),
    lastActiveAt: hoursFromNow(-1),
    payModel: null,
    hourlyRate: null,
    flatRates: null,
    notificationPrefs: defaultNotificationPrefs(),
  },
  {
    id: 'u-priya',
    fullName: 'Priya Anand',
    email: 'priya@contentout.studio',
    passwordHash: MOCK_PASSWORD,
    role: 'admin',
    status: 'active',
    avatarInitials: 'PA',
    timezone: 'America/Toronto',
    createdAt: daysFromNow(-180),
    lastActiveAt: hoursFromNow(-3),
    payModel: null,
    hourlyRate: null,
    flatRates: null,
    notificationPrefs: defaultNotificationPrefs(),
  },
  {
    id: 'u-savithru',
    fullName: 'Savithru Perera',
    email: 'savithru@contentout.studio',
    passwordHash: MOCK_PASSWORD,
    role: 'editor',
    status: 'active',
    avatarInitials: 'SP',
    timezone: 'Asia/Kolkata',
    createdAt: daysFromNow(-140),
    lastActiveAt: hoursFromNow(-5),
    payModel: 'hourly',
    hourlyRate: 22,
    flatRates: null,
    notificationPrefs: defaultNotificationPrefs(),
  },
  {
    id: 'u-mihail',
    fullName: 'Mihail Trpkovski',
    email: 'mihail@contentout.studio',
    passwordHash: MOCK_PASSWORD,
    role: 'editor',
    status: 'active',
    avatarInitials: 'MT',
    timezone: 'Europe/Skopje',
    createdAt: daysFromNow(-120),
    lastActiveAt: hoursFromNow(-26),
    payModel: 'flat',
    hourlyRate: null,
    flatRates: { reel: 120, long_form: 260, batch_graphics: 90 },
    notificationPrefs: defaultNotificationPrefs(),
  },
  {
    id: 'u-gaurav',
    fullName: 'Gaurav Nair',
    email: 'gaurav@contentout.studio',
    passwordHash: MOCK_PASSWORD,
    role: 'editor',
    status: 'active',
    avatarInitials: 'GN',
    timezone: 'Asia/Kolkata',
    createdAt: daysFromNow(-60),
    lastActiveAt: hoursFromNow(-14),
    payModel: 'hourly',
    hourlyRate: 20,
    flatRates: null,
    notificationPrefs: defaultNotificationPrefs(),
  },
]

export const CLIENTS: Client[] = [
  { id: 'c-yfl', name: 'Yorkdale Ford Lincoln', accentColor: '#6E9BD8' },
  { id: 'c-land', name: 'Landscaping Legends', accentColor: '#7FB08A' },
  { id: 'c-mrg', name: 'MRG Group', accentColor: '#A98AD1' },
  { id: 'c-event', name: 'Event Coverage', accentColor: '#CBA76A' },
]

function delivery(
  partial: Omit<Delivery, 'id'> & { id: string },
): Delivery {
  return partial
}

export const PROJECTS: Project[] = [
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
    assignedEditorId: 'u-savithru',
    createdByUserId: 'u-priya',
    revisions: [],
    comments: [
      {
        id: 'cm-yfl-1',
        authorUserId: 'u-priya',
        authorName: 'Priya Anand',
        body: 'Lock the hook in the first 2 seconds — the lease offer card should land fast.',
        createdAt: hoursFromNow(-6),
      },
    ],
    deliveries: [],
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
    assignedEditorId: 'u-savithru',
    createdByUserId: 'u-priya',
    revisions: [
      {
        round: 1,
        notes: [
          'Trim the intro to land on the owner interview by 0:20.',
          'Color is slightly cool on the exterior shots — warm it a touch.',
        ],
        requestedByUserId: 'u-priya',
        requestedAt: daysFromNow(-3),
        resolvedAt: daysFromNow(-2),
      },
      {
        round: 2,
        notes: [
          'Add chapter markers for each yard transformation.',
          'Lower music under the interview VO by ~4 dB.',
        ],
        requestedByUserId: 'u-priya',
        requestedAt: hoursFromNow(-9),
        resolvedAt: null,
      },
    ],
    comments: [
      {
        id: 'cm-land-1',
        authorUserId: 'u-priya',
        authorName: 'Priya Anand',
        body: 'Round 2 notes are posted — mainly pacing and audio balance.',
        createdAt: hoursFromNow(-9),
      },
      {
        id: 'cm-land-2',
        authorUserId: 'u-savithru',
        authorName: 'Savithru Perera',
        body: 'On it — chapter markers in, re-balancing the VO now.',
        createdAt: hoursFromNow(-7),
      },
    ],
    deliveries: [
      delivery({
        id: 'dl-land-1',
        projectId: 'p-land-longform',
        editorId: 'u-savithru',
        fileLink: 'https://frame.io/landscaping-longform-v1',
        note: 'First full cut for review.',
        version: 1,
        submittedAt: daysFromNow(-4),
        reviewedByUserId: 'u-priya',
        outcome: 'changes_requested',
        reviewedAt: daysFromNow(-3),
      }),
      delivery({
        id: 'dl-land-2',
        projectId: 'p-land-longform',
        editorId: 'u-savithru',
        fileLink: 'https://frame.io/landscaping-longform-v2',
        note: 'Addressed round 1 pacing + color.',
        version: 2,
        submittedAt: daysFromNow(-2),
        reviewedByUserId: 'u-priya',
        outcome: 'changes_requested',
        reviewedAt: hoursFromNow(-9),
      }),
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
    assignedEditorId: 'u-savithru',
    createdByUserId: 'u-priya',
    revisions: [],
    comments: [],
    deliveries: [
      delivery({
        id: 'dl-mrg-1',
        projectId: 'p-mrg-retouch',
        editorId: 'u-savithru',
        fileLink: 'https://dropbox.com/mrg/retouch-delivery-v1',
        note: 'All 60 selects retouched, natural skin tones held.',
        version: 1,
        submittedAt: hoursFromNow(-3),
        reviewedByUserId: null,
        outcome: 'pending',
        reviewedAt: null,
      }),
    ],
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
    assignedEditorId: 'u-savithru',
    createdByUserId: 'u-priya',
    revisions: [],
    comments: [],
    deliveries: [],
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
    assetLinks: [{ label: 'Source footage', url: 'https://drive.google.com/mrg/brunch-footage' }],
    status: 'editing',
    dueDate: hoursFromNow(-5),
    assignedEditorId: 'u-savithru',
    createdByUserId: 'u-yuvi',
    revisions: [],
    comments: [
      {
        id: 'cm-mrg-1',
        authorUserId: 'u-priya',
        authorName: 'Priya Anand',
        body: 'This one slipped past due — prioritize it right after the Yorkdale reel.',
        createdAt: hoursFromNow(-2),
      },
    ],
    deliveries: [],
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
    assignedEditorId: 'u-savithru',
    createdByUserId: 'u-yuvi',
    revisions: [
      {
        round: 1,
        notes: ['Hold the award moment a beat longer.', 'Swap the opening title to the gold variant.'],
        requestedByUserId: 'u-yuvi',
        requestedAt: daysFromNow(-13),
        resolvedAt: daysFromNow(-12),
      },
    ],
    comments: [
      {
        id: 'cm-event-1',
        authorUserId: 'u-yuvi',
        authorName: 'Yuvi Gill',
        body: 'Approved — beautiful pacing. Client loved it.',
        createdAt: daysFromNow(-9),
      },
    ],
    deliveries: [
      delivery({
        id: 'dl-gala-1',
        projectId: 'p-event-gala',
        editorId: 'u-savithru',
        fileLink: 'https://frame.io/event-gala-v1',
        note: 'First highlight pass.',
        version: 1,
        submittedAt: daysFromNow(-14),
        reviewedByUserId: 'u-yuvi',
        outcome: 'changes_requested',
        reviewedAt: daysFromNow(-13),
      }),
      delivery({
        id: 'dl-gala-2',
        projectId: 'p-event-gala',
        editorId: 'u-savithru',
        fileLink: 'https://frame.io/event-gala-final',
        note: 'Award moment held, gold title in.',
        version: 2,
        submittedAt: daysFromNow(-10),
        reviewedByUserId: 'u-yuvi',
        outcome: 'approved',
        reviewedAt: daysFromNow(-9),
      }),
    ],
    deliveryLink: 'https://frame.io/event-gala-final',
    approvedAt: daysFromNow(-9),
  },
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
    assignedEditorId: 'u-mihail',
    createdByUserId: 'u-priya',
    revisions: [
      {
        round: 1,
        notes: ['Increase text padding on mobile safe-area assets.'],
        requestedByUserId: 'u-priya',
        requestedAt: daysFromNow(-9),
        resolvedAt: daysFromNow(-8),
      },
    ],
    comments: [
      {
        id: 'cm-batch-1',
        authorUserId: 'u-priya',
        authorName: 'Priya Anand',
        body: 'Approved. Great consistency across all graphics.',
        createdAt: daysFromNow(-6),
      },
    ],
    deliveries: [
      delivery({
        id: 'dl-batch-1',
        projectId: 'p-event-batch',
        editorId: 'u-mihail',
        fileLink: 'https://frame.io/event-graphics-v1',
        note: 'Full set, v1.',
        version: 1,
        submittedAt: daysFromNow(-9),
        reviewedByUserId: 'u-priya',
        outcome: 'changes_requested',
        reviewedAt: daysFromNow(-9),
      }),
      delivery({
        id: 'dl-batch-2',
        projectId: 'p-event-batch',
        editorId: 'u-mihail',
        fileLink: 'https://frame.io/event-graphics-final',
        note: 'Padding fixed on safe-area assets.',
        version: 2,
        submittedAt: daysFromNow(-7),
        reviewedByUserId: 'u-priya',
        outcome: 'approved',
        reviewedAt: daysFromNow(-6),
      }),
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
    assignedEditorId: 'u-mihail',
    createdByUserId: 'u-priya',
    revisions: [],
    comments: [],
    deliveries: [],
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
    assignedEditorId: 'u-mihail',
    createdByUserId: 'u-priya',
    revisions: [],
    comments: [],
    deliveries: [
      delivery({
        id: 'dl-conf-1',
        projectId: 'p-mrg-conference',
        editorId: 'u-mihail',
        fileLink: 'https://frame.io/mrg-conference-v1',
        note: 'Keynote-forward cut with floor energy.',
        version: 1,
        submittedAt: hoursFromNow(-30),
        reviewedByUserId: null,
        outcome: 'pending',
        reviewedAt: null,
      }),
    ],
    deliveryLink: 'https://frame.io/mrg-conference-v1',
    approvedAt: null,
  },
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
    assignedEditorId: 'u-gaurav',
    createdByUserId: 'u-priya',
    revisions: [
      {
        round: 1,
        notes: ['Cut the slow pan at 0:08.', 'Add the booking URL to the end card.'],
        requestedByUserId: 'u-priya',
        requestedAt: hoursFromNow(-14),
        resolvedAt: null,
      },
    ],
    comments: [
      {
        id: 'cm-service-1',
        authorUserId: 'u-priya',
        authorName: 'Priya Anand',
        body: 'Quick round — just the pan and the end card CTA.',
        createdAt: hoursFromNow(-14),
      },
    ],
    deliveries: [
      delivery({
        id: 'dl-service-1',
        projectId: 'p-yfl-service-reel',
        editorId: 'u-gaurav',
        fileLink: 'https://frame.io/yfl-service-v1',
        note: 'First cut.',
        version: 1,
        submittedAt: hoursFromNow(-18),
        reviewedByUserId: 'u-priya',
        outcome: 'changes_requested',
        reviewedAt: hoursFromNow(-14),
      }),
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
    assignedEditorId: 'u-gaurav',
    createdByUserId: 'u-priya',
    revisions: [],
    comments: [],
    deliveries: [],
    deliveryLink: null,
    approvedAt: null,
  },
]

export const TIME_ENTRIES: TimeEntry[] = [
  { id: 'te-s1', projectId: 'p-event-gala', editorId: 'u-savithru', hours: 4.5, date: daysFromNow(-12), rateApplied: 22 },
  { id: 'te-s2', projectId: 'p-event-gala', editorId: 'u-savithru', hours: 3.0, date: daysFromNow(-11), rateApplied: 22 },
  { id: 'te-s3', projectId: 'p-land-longform', editorId: 'u-savithru', hours: 5.25, date: daysFromNow(-6), rateApplied: 22 },
  { id: 'te-s4', projectId: 'p-land-longform', editorId: 'u-savithru', hours: 2.5, date: daysFromNow(-3), rateApplied: 22 },
  { id: 'te-s5', projectId: 'p-yfl-reel', editorId: 'u-savithru', hours: 3.5, date: daysFromNow(-1), rateApplied: 22 },
  { id: 'te-s6', projectId: 'p-mrg-brunch-reel', editorId: 'u-savithru', hours: 1.5, date: hoursFromNow(-4), rateApplied: 22 },

  { id: 'te-m1', projectId: 'p-event-batch', editorId: 'u-mihail', hours: 4.0, date: daysFromNow(-8), rateApplied: 0 },
  { id: 'te-m2', projectId: 'p-mrg-conference', editorId: 'u-mihail', hours: 6.5, date: daysFromNow(-2), rateApplied: 0 },
  { id: 'te-m3', projectId: 'p-land-brand-reel', editorId: 'u-mihail', hours: 2.0, date: hoursFromNow(-20), rateApplied: 0 },

  { id: 'te-g1', projectId: 'p-yfl-service-reel', editorId: 'u-gaurav', hours: 3.0, date: daysFromNow(-2), rateApplied: 20 },
  { id: 'te-g2', projectId: 'p-yfl-service-reel', editorId: 'u-gaurav', hours: 1.75, date: hoursFromNow(-15), rateApplied: 20 },
]

export const NOTIFICATIONS: AppNotification[] = [
  {
    id: 'nf-1',
    recipientUserId: 'u-savithru',
    type: 'revision',
    projectId: 'p-land-longform',
    body: 'Changes requested on Landscaping Legends June Long Form',
    createdAt: hoursFromNow(-9),
    readAt: null,
    channelsSent: ['portal', 'email', 'discord'],
  },
  {
    id: 'nf-2',
    recipientUserId: 'u-savithru',
    type: 'assignment',
    projectId: 'p-yfl-cull',
    body: 'New project assigned: Yorkdale Weekend Shoot Photo Cull',
    createdAt: daysFromNow(-2),
    readAt: daysFromNow(-2),
    channelsSent: ['portal', 'email'],
  },
  {
    id: 'nf-3',
    recipientUserId: 'u-savithru',
    type: 'approval',
    projectId: 'p-event-gala',
    body: 'Event Coverage Spring Gala Highlight approved 🎉',
    createdAt: daysFromNow(-9),
    readAt: daysFromNow(-9),
    channelsSent: ['portal', 'email', 'discord'],
  },
  {
    id: 'nf-4',
    recipientUserId: 'u-gaurav',
    type: 'revision',
    projectId: 'p-yfl-service-reel',
    body: 'Changes requested on Yorkdale Service Dept Promo Reel',
    createdAt: hoursFromNow(-14),
    readAt: null,
    channelsSent: ['portal', 'discord'],
  },
  {
    id: 'nf-5',
    recipientUserId: 'u-mihail',
    type: 'approval',
    projectId: 'p-event-batch',
    body: 'Event Coverage Batch Graphics Package approved 🎉',
    createdAt: daysFromNow(-6),
    readAt: null,
    channelsSent: ['portal', 'email'],
  },
  {
    id: 'nf-6',
    recipientUserId: 'u-priya',
    type: 'delivery_received',
    projectId: 'p-mrg-retouch',
    body: 'Savithru Perera delivered MRG Rooftop Event Photo Retouch (v1)',
    createdAt: hoursFromNow(-3),
    readAt: null,
    channelsSent: ['portal', 'email'],
  },
  {
    id: 'nf-7',
    recipientUserId: 'u-priya',
    type: 'delivery_received',
    projectId: 'p-mrg-conference',
    body: 'Mihail Trpkovski delivered MRG Group Annual Conference Long Form (v1)',
    createdAt: hoursFromNow(-30),
    readAt: hoursFromNow(-28),
    channelsSent: ['portal', 'email', 'discord'],
  },
  {
    id: 'nf-8',
    recipientUserId: 'u-yuvi',
    type: 'delivery_received',
    projectId: 'p-mrg-retouch',
    body: 'Savithru Perera delivered MRG Rooftop Event Photo Retouch (v1)',
    createdAt: hoursFromNow(-3),
    readAt: null,
    channelsSent: ['portal'],
  },
]

export const ACTIVITY_LOG: ActivityLog[] = [
  { id: 'al-1', actorUserId: 'u-savithru', action: 'submitted delivery v1', targetType: 'project', targetId: 'p-mrg-retouch', createdAt: hoursFromNow(-3) },
  { id: 'al-2', actorUserId: 'u-priya', action: 'requested changes', targetType: 'project', targetId: 'p-land-longform', createdAt: hoursFromNow(-9) },
  { id: 'al-3', actorUserId: 'u-yuvi', action: 'approved delivery v2', targetType: 'project', targetId: 'p-event-gala', createdAt: daysFromNow(-9) },
  { id: 'al-4', actorUserId: 'u-priya', action: 'assigned project', targetType: 'project', targetId: 'p-yfl-cull', createdAt: daysFromNow(-2) },
]

// ── Thin mock "API" layer ──

export function getUsers(): User[] {
  return USERS
}

export function getEditors(users: User[]): User[] {
  return users.filter((user) => user.role === 'editor')
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

export function getNotificationsForUser(
  notifications: AppNotification[],
  userId: string,
): AppNotification[] {
  return notifications
    .filter((notification) => notification.recipientUserId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function authenticate(email: string, password: string): User | null {
  const user = USERS.find(
    (candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase(),
  )
  if (!user || user.passwordHash !== password || user.status === 'disabled') {
    return null
  }
  return user
}

export { MOCK_PASSWORD }
