// Appendix S seed (server-side source of truth). Passwords are plaintext here and
// hashed with bcrypt at seed time. "now" reference = 2026-06-25T09:00:00-04:00.
export const MOCK_PASSWORD = 'contentout'

export const USERS = [
  { id: 'u_yuvi', fullName: 'Yuvi', email: 'yuvi@contentout.co', role: 'owner', status: 'active', avatarInitials: 'YV', timezone: 'America/Toronto', payModel: null, hourlyRate: null, flatRates: null, createdAt: '2025-09-01T12:00:00-04:00', lastActiveAt: '2026-06-25T08:40:00-04:00' },
  { id: 'u_amrit', fullName: 'Amrit Singh', email: 'amrit@contentout.co', role: 'admin', status: 'active', avatarInitials: 'AS', timezone: 'America/Toronto', payModel: null, hourlyRate: null, flatRates: null, createdAt: '2025-11-15T12:00:00-05:00', lastActiveAt: '2026-06-25T08:10:00-04:00' },
  { id: 'u_savithru', fullName: 'Savithru', email: 'savithru@contentout.co', role: 'editor', status: 'active', avatarInitials: 'SV', timezone: 'Asia/Kolkata', payModel: 'hourly', hourlyRate: 22, flatRates: null, createdAt: '2025-10-02T12:00:00+05:30', lastActiveAt: '2026-06-25T17:30:00+05:30' },
  { id: 'u_mihail', fullName: 'Mihail', email: 'mihail@contentout.co', role: 'editor', status: 'active', avatarInitials: 'MH', timezone: 'Europe/Skopje', payModel: 'flat', hourlyRate: null, flatRates: { reel: 120, long_form: 260, photo_cull: 60, photo_retouch: 80, batch_graphics: 90 }, createdAt: '2025-10-10T12:00:00+02:00', lastActiveAt: '2026-06-25T14:05:00+02:00' },
  { id: 'u_gaurav', fullName: 'Gaurav', email: 'gaurav@contentout.co', role: 'editor', status: 'active', avatarInitials: 'GR', timezone: 'Asia/Kolkata', payModel: 'hourly', hourlyRate: 20, flatRates: null, createdAt: '2025-12-01T12:00:00+05:30', lastActiveAt: '2026-06-24T20:15:00+05:30' },
]

export const CLIENTS = [
  { id: 'c_yford', name: 'Yorkdale Ford Lincoln', accentColor: '#3B82F6' },
  { id: 'c_legends', name: 'Landscaping Legends', accentColor: '#22C55E' },
  { id: 'c_mrg', name: 'MRG Group', accentColor: '#A855F7' },
  { id: 'c_events', name: 'Event Coverage', accentColor: '#F5A623' },
]

export const PROJECTS = [
  { id: 'p_yford_inv', clientId: 'c_yford', title: 'Spring Inventory Walkaround Reel', deliverableType: 'reel', assignedEditorId: 'u_savithru', createdByUserId: 'u_yuvi', status: 'editing',
    brief: 'Fast-cut walkaround of three new F-150 trims on the lot. Punchy, music-led, no VO. Hook in first 1.5s. Keep it under 30s.',
    specs: { aspectRatio: '9:16', resolution: '1080x1920', bitrate: '12 Mbps H.264', fileNaming: 'YFORD_inventory_reel_v{n}.mp4' },
    assetLinks: [{ label: 'Raw footage (Drive)', url: 'https://drive.google.com/yford-inventory' }, { label: 'Track + brand kit', url: 'https://drive.google.com/yford-brandkit' }],
    dueDate: '2026-06-26T03:00:00+05:30', deliveries: [], revisions: [], comments: [], deliveryLink: null, approvedAt: null },

  { id: 'p_legends_cleanup', clientId: 'c_legends', title: 'Spring Cleanup Before/After', deliverableType: 'reel', assignedEditorId: 'u_gaurav', createdByUserId: 'u_amrit', status: 'editing',
    brief: 'Before/after transition reel of the Oakville backyard project. Lead with the worst before shot, satisfying reveal on the beat.',
    specs: { aspectRatio: '9:16', resolution: '1080x1920', bitrate: '12 Mbps H.264', fileNaming: 'LEGENDS_cleanup_v{n}.mp4' },
    assetLinks: [{ label: 'Before/after clips', url: 'https://drive.google.com/legends-cleanup' }],
    dueDate: '2026-06-25T12:00:00+05:30', deliveries: [], revisions: [], comments: [], deliveryLink: null, approvedAt: null },

  { id: 'p_mrg_gibbons', clientId: 'c_mrg', title: 'Gibbons Bar Launch Recap', deliverableType: 'long_form', assignedEditorId: 'u_mihail', createdByUserId: 'u_yuvi', status: 'submitted',
    brief: '90s recap of the Gibbons Bar opening night. Energy, crowd, signature cocktails, owner soundbite at the end. Landscape for web.',
    specs: { aspectRatio: '16:9', resolution: '1920x1080', bitrate: '20 Mbps H.264', fileNaming: 'MRG_gibbons_recap_v{n}.mp4' },
    assetLinks: [{ label: 'Event footage', url: 'https://drive.google.com/mrg-gibbons' }, { label: 'Owner interview', url: 'https://drive.google.com/mrg-gibbons-interview' }],
    dueDate: '2026-06-27T20:00:00+02:00',
    deliveries: [
      { id: 'd_gib_1', projectId: 'p_mrg_gibbons', editorId: 'u_mihail', fileLink: 'https://frame.io/gibbons-v1', note: 'First pass, full 95s.', version: 1, submittedAt: '2026-06-22T18:00:00+02:00', reviewedByUserId: 'u_yuvi', outcome: 'changes_requested', reviewedAt: '2026-06-23T10:00:00-04:00' },
      { id: 'd_gib_2', projectId: 'p_mrg_gibbons', editorId: 'u_mihail', fileLink: 'https://frame.io/gibbons-v2', note: 'Tightened to 88s, fixed audio dip, soundbite moved to end.', version: 2, submittedAt: '2026-06-24T16:30:00+02:00', reviewedByUserId: null, outcome: 'pending', reviewedAt: null },
    ],
    revisions: [{ round: 1, requestedByUserId: 'u_yuvi', requestedAt: '2026-06-23T10:00:00-04:00', resolvedAt: '2026-06-24T16:30:00+02:00', notes: ['Cut to ~88s — the mid-section drags.', 'Audio dips around 0:42, fix the levels.', 'Move the owner soundbite to the very end.'] }],
    comments: [{ id: 'cm_1', authorUserId: 'u_yuvi', authorName: 'Yuvi', body: 'Great energy on this. Notes in the revision round.', createdAt: '2026-06-23T10:01:00-04:00' }],
    deliveryLink: 'https://frame.io/gibbons-v2', approvedAt: null },

  { id: 'p_yford_testi', clientId: 'c_yford', title: 'Customer Delivery Testimonial', deliverableType: 'reel', assignedEditorId: 'u_savithru', createdByUserId: 'u_amrit', status: 'revisions_requested',
    brief: '30s testimonial reel — happy customer taking delivery of a Bronco. Warm, authentic, captions burned in.',
    specs: { aspectRatio: '9:16', resolution: '1080x1920', bitrate: '12 Mbps H.264', fileNaming: 'YFORD_testimonial_v{n}.mp4' },
    assetLinks: [{ label: 'Delivery day footage', url: 'https://drive.google.com/yford-testimonial' }],
    dueDate: '2026-06-28T03:00:00+05:30',
    deliveries: [{ id: 'd_testi_1', projectId: 'p_yford_testi', editorId: 'u_savithru', fileLink: 'https://frame.io/testimonial-v1', note: 'First cut with captions.', version: 1, submittedAt: '2026-06-24T22:00:00+05:30', reviewedByUserId: 'u_amrit', outcome: 'changes_requested', reviewedAt: '2026-06-25T07:30:00-04:00' }],
    revisions: [{ round: 1, requestedByUserId: 'u_amrit', requestedAt: '2026-06-25T07:30:00-04:00', resolvedAt: null, notes: ['Captions are too small — bump to brand size and reposition above the fold.', 'Trim the intro handshake by ~1s, get to the smile faster.'] }],
    comments: [], deliveryLink: 'https://frame.io/testimonial-v1', approvedAt: null },

  { id: 'p_events_wedding', clientId: 'c_events', title: 'All Roads Weekend Highlight', deliverableType: 'long_form', assignedEditorId: 'u_mihail', createdByUserId: 'u_yuvi', status: 'approved',
    brief: '2-min highlight from the All Roads weekend event coverage. Cinematic, emotional build, licensed track.',
    specs: { aspectRatio: '16:9', resolution: '1920x1080', bitrate: '20 Mbps H.264', fileNaming: 'EVENTS_allroads_v{n}.mp4' },
    assetLinks: [{ label: 'Weekend footage', url: 'https://drive.google.com/events-allroads' }],
    dueDate: '2026-06-20T20:00:00+02:00',
    deliveries: [{ id: 'd_ar_1', projectId: 'p_events_wedding', editorId: 'u_mihail', fileLink: 'https://frame.io/allroads-v1', note: 'Final highlight, 2:05.', version: 1, submittedAt: '2026-06-19T19:00:00+02:00', reviewedByUserId: 'u_yuvi', outcome: 'approved', reviewedAt: '2026-06-20T09:00:00-04:00' }],
    revisions: [],
    comments: [{ id: 'cm_ar', authorUserId: 'u_yuvi', authorName: 'Yuvi', body: 'Nailed it. Client loved it.', createdAt: '2026-06-20T09:01:00-04:00' }],
    deliveryLink: 'https://frame.io/allroads-v1', approvedAt: '2026-06-20T09:00:00-04:00' },

  { id: 'p_legends_bank', clientId: 'c_legends', title: 'Seasonal Content Bank — Batch Graphics', deliverableType: 'batch_graphics', assignedEditorId: 'u_gaurav', createdByUserId: 'u_amrit', status: 'not_started',
    brief: 'Restyle 12 tip-graphics to the new Landscaping Legends brand kit. Consistent template, swap copy + photos.',
    specs: { aspectRatio: '4:5', resolution: '1080x1350', bitrate: 'n/a (export PNG/MP4)', fileNaming: 'LEGENDS_tip_{nn}.png' },
    assetLinks: [{ label: 'Brand kit + copy doc', url: 'https://drive.google.com/legends-brandkit' }],
    dueDate: '2026-07-06T20:30:00+05:30', deliveries: [], revisions: [], comments: [], deliveryLink: null, approvedAt: null },

  { id: 'p_yford_photo', clientId: 'c_yford', title: 'Lot Inventory Photo Cull', deliverableType: 'photo_cull', assignedEditorId: 'u_savithru', createdByUserId: 'u_amrit', status: 'not_started',
    brief: 'Cull ~400 lot photos down to the best 60, consistent framing, no plates/people in shot.',
    specs: { aspectRatio: 'varied', resolution: 'full-res JPEG', bitrate: 'n/a', fileNaming: 'YFORD_lot_{nnn}.jpg' },
    assetLinks: [{ label: 'Photo dump (Drive)', url: 'https://drive.google.com/yford-lot' }],
    dueDate: '2026-06-29T03:00:00+05:30', deliveries: [], revisions: [], comments: [], deliveryLink: null, approvedAt: null },

  { id: 'p_mrg_promo', clientId: 'c_mrg', title: 'Weekend Promo Teaser', deliverableType: 'reel', assignedEditorId: 'u_mihail', createdByUserId: 'u_yuvi', status: 'editing',
    brief: "15s teaser for this weekend's lineup. Bold text-led, fast, one CTA card at the end.",
    specs: { aspectRatio: '9:16', resolution: '1080x1920', bitrate: '12 Mbps H.264', fileNaming: 'MRG_promo_v{n}.mp4' },
    assetLinks: [{ label: 'B-roll + logos', url: 'https://drive.google.com/mrg-promo' }],
    dueDate: '2026-06-30T20:00:00+02:00', deliveries: [], revisions: [], comments: [], deliveryLink: null, approvedAt: null },

  { id: 'p_events_recap', clientId: 'c_events', title: 'Coliseum Show B-Roll Recap', deliverableType: 'reel', assignedEditorId: 'u_savithru', createdByUserId: 'u_yuvi', status: 'approved',
    brief: '20s recap reel of the Coliseum show b-roll. Energy, crowd, lights. Music-led.',
    specs: { aspectRatio: '9:16', resolution: '1080x1920', bitrate: '12 Mbps H.264', fileNaming: 'EVENTS_coliseum_v{n}.mp4' },
    assetLinks: [{ label: 'Show footage', url: 'https://drive.google.com/events-coliseum' }],
    dueDate: '2026-06-15T03:00:00+05:30',
    deliveries: [{ id: 'd_col_1', projectId: 'p_events_recap', editorId: 'u_savithru', fileLink: 'https://frame.io/coliseum-v1', note: 'Recap cut.', version: 1, submittedAt: '2026-06-14T21:00:00+05:30', reviewedByUserId: 'u_yuvi', outcome: 'approved', reviewedAt: '2026-06-15T09:00:00-04:00' }],
    revisions: [], comments: [], deliveryLink: 'https://frame.io/coliseum-v1', approvedAt: '2026-06-15T09:00:00-04:00' },

  { id: 'p_legends_drone', clientId: 'c_legends', title: 'Estate Drone Flythrough', deliverableType: 'long_form', assignedEditorId: null, createdByUserId: 'u_amrit', status: 'not_started',
    brief: '60s cinematic drone flythrough of the finished estate project. Slow, premium, ambient track.',
    specs: { aspectRatio: '16:9', resolution: '3840x2160', bitrate: '40 Mbps H.265', fileNaming: 'LEGENDS_drone_v{n}.mp4' },
    assetLinks: [{ label: 'Drone footage', url: 'https://drive.google.com/legends-drone' }],
    dueDate: '2026-07-04T20:30:00-04:00', deliveries: [], revisions: [], comments: [], deliveryLink: null, approvedAt: null },
]

export const TIME_ENTRIES = [
  { id: 't1', projectId: 'p_events_recap', editorId: 'u_savithru', hours: 4.0, date: '2026-06-14', rateApplied: 22 },
  { id: 't2', projectId: 'p_yford_testi', editorId: 'u_savithru', hours: 3.0, date: '2026-06-24', rateApplied: 22 },
  { id: 't3', projectId: 'p_yford_inv', editorId: 'u_savithru', hours: 3.5, date: '2026-06-25', rateApplied: 22 },
  { id: 't4', projectId: 'p_legends_cleanup', editorId: 'u_gaurav', hours: 5.5, date: '2026-06-23', rateApplied: 20 },
  { id: 't5', projectId: 'p_legends_cleanup', editorId: 'u_gaurav', hours: 2.0, date: '2026-06-24', rateApplied: 20 },
  { id: 't6', projectId: 'p_mrg_gibbons', editorId: 'u_mihail', hours: 6.0, date: '2026-06-22', rateApplied: 0 },
  { id: 't7', projectId: 'p_mrg_gibbons', editorId: 'u_mihail', hours: 3.0, date: '2026-06-24', rateApplied: 0 },
  { id: 't8', projectId: 'p_events_wedding', editorId: 'u_mihail', hours: 7.5, date: '2026-06-19', rateApplied: 0 },
]

export const NOTIFICATIONS = [
  { id: 'n1', recipientUserId: 'u_savithru', type: 'revision', projectId: 'p_yford_testi', body: 'Changes requested on Customer Delivery Testimonial', createdAt: '2026-06-25T07:30:00-04:00', readAt: null, channelsSent: ['portal', 'email', 'discord', 'push'] },
  { id: 'n2', recipientUserId: 'u_savithru', type: 'assignment', projectId: 'p_yford_photo', body: 'New project assigned: Lot Inventory Photo Cull', createdAt: '2026-06-24T15:00:00-04:00', readAt: '2026-06-24T15:10:00-04:00', channelsSent: ['portal', 'email'] },
  { id: 'n3', recipientUserId: 'u_yuvi', type: 'delivery_received', projectId: 'p_mrg_gibbons', body: 'Mihail delivered Gibbons Bar Launch Recap (v2)', createdAt: '2026-06-24T16:30:00+02:00', readAt: null, channelsSent: ['portal', 'email'] },
  { id: 'n4', recipientUserId: 'u_mihail', type: 'approval', projectId: 'p_events_wedding', body: 'All Roads Weekend Highlight approved 🎉', createdAt: '2026-06-20T09:00:00-04:00', readAt: '2026-06-20T11:00:00+02:00', channelsSent: ['portal', 'email', 'discord'] },
  { id: 'n5', recipientUserId: 'u_gaurav', type: 'assignment', projectId: 'p_legends_bank', body: 'New project assigned: Seasonal Content Bank — Batch Graphics', createdAt: '2026-06-22T10:00:00-04:00', readAt: null, channelsSent: ['portal', 'push'] },
]

export const ACTIVITY_LOG = [
  { id: 'al-1', actorUserId: 'u_amrit', action: 'requested changes', targetType: 'project', targetId: 'p_yford_testi', createdAt: '2026-06-25T07:30:00-04:00' },
  { id: 'al-2', actorUserId: 'u_mihail', action: 'submitted delivery v2', targetType: 'project', targetId: 'p_mrg_gibbons', createdAt: '2026-06-24T16:30:00+02:00' },
  { id: 'al-3', actorUserId: 'u_yuvi', action: 'approved delivery v1', targetType: 'project', targetId: 'p_events_wedding', createdAt: '2026-06-20T09:00:00-04:00' },
  { id: 'al-4', actorUserId: 'u_amrit', action: 'assigned project', targetType: 'project', targetId: 'p_yford_photo', createdAt: '2026-06-24T15:00:00-04:00' },
]

export function defaultNotificationPrefs() {
  return {
    channels: { portal: true, email: true, discord: true, push: false },
    events: { assignment: true, delivery_received: true, feedback: true, revision: true, approval: true, mention: true },
  }
}
