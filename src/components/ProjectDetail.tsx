import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check, ExternalLink, Pencil, Sparkles, X } from 'lucide-react'
import { useApp } from '../store'
import { isManager, canEditAnything } from '../permissions'
import { NotificationBell } from './NotificationBell'
import { StatusPill } from './StatusPill'
import { fullDateTime, relativeTime, formatHours } from '../format'
import { todayInputValue, validateHours } from '../validation'
import { useFakeLoad } from '../useFakeLoad'
import { summarizeFeedback } from '../ai'
import { STATUS_LABELS, type Delivery } from '../types'

export function ProjectDetail() {
  const { projectId } = useParams()
  const {
    user,
    users,
    clients,
    projects,
    timeEntries,
    startEditing,
    submitDelivery,
    approveDelivery,
    requestChanges,
    addComment,
    logHours,
    updateProject,
  } = useApp()
  const isLoading = useFakeLoad()

  const project = projects.find((item) => item.id === projectId) ?? null
  const timezone = user?.timezone ?? 'UTC'

  const [fileLinkDraft, setFileLinkDraft] = useState('')
  const [noteDraft, setNoteDraft] = useState('')
  const [commentDraft, setCommentDraft] = useState('')
  const [reviewNotes, setReviewNotes] = useState('')
  const [hoursDraft, setHoursDraft] = useState('')
  const [dateDraft, setDateDraft] = useState(todayInputValue(timezone))
  const [hoursError, setHoursError] = useState<string | null>(null)
  const [aiSummary, setAiSummary] = useState<string[] | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [briefDraft, setBriefDraft] = useState('')

  const client = clients.find((item) => item.id === project?.clientId)
  const userName = (id: string) => users.find((candidate) => candidate.id === id)?.fullName ?? 'Someone'

  const projectHours = useMemo(() => {
    if (!project || !user) {
      return 0
    }
    return timeEntries
      .filter((entry) => entry.projectId === project.id && entry.editorId === user.id)
      .reduce((sum, entry) => sum + entry.hours, 0)
  }, [project, user, timeEntries])

  if (isLoading) {
    return (
      <div className="detail-skeleton" aria-hidden="true">
        <div className="skeleton-line w-40" />
        <div className="skeleton-line w-70" />
        <div className="detail-grid">
          <div className="surface skeleton-box-lg" />
          <div className="surface skeleton-box-lg" />
        </div>
      </div>
    )
  }

  if (!project || !user) {
    return (
      <div className="empty-state">
        <h2>Project not found</h2>
        <Link to="/queue" className="secondary-button">
          Back to queue
        </Link>
      </div>
    )
  }

  const isAssignedEditor = user.id === project.assignedEditorId
  const manager = isManager(user)
  const canReview = manager && project.status === 'submitted'
  const openRound = project.revisions.find((revision) => revision.resolvedAt === null)
  const latestDelivery = project.deliveries.reduce<Delivery | null>(
    (latest, delivery) => (!latest || delivery.version > latest.version ? delivery : latest),
    null,
  )
  const versionHistory = project.deliveries.slice().sort((a, b) => b.version - a.version)
  const effectiveLink = fileLinkDraft.trim() || (project.status === 'editing' ? '' : project.deliveryLink ?? '')
  const needsLink = project.status === 'editing' || project.status === 'revisions_requested'

  const onSubmitDelivery = () => {
    const link = fileLinkDraft.trim() || (project.deliveryLink ?? '')
    if (!link) {
      return
    }
    submitDelivery(project.id, link, noteDraft)
    setFileLinkDraft('')
    setNoteDraft('')
  }

  const onLogHours = () => {
    const result = validateHours(hoursDraft, dateDraft, todayInputValue(timezone))
    if (!result.ok) {
      setHoursError(result.error)
      return
    }
    setHoursError(null)
    logHours(project.id, result.hours, new Date(`${dateDraft}T12:00:00`).toISOString())
    setHoursDraft('')
  }

  const runAiSummary = () => {
    if (!openRound) {
      return
    }
    setAiLoading(true)
    summarizeFeedback(openRound.notes).then((result) => {
      setAiSummary(result)
      setAiLoading(false)
    })
  }

  const startEdit = () => {
    setTitleDraft(project.title)
    setBriefDraft(project.brief)
    setEditing(true)
  }
  const saveEdit = () => {
    updateProject(project.id, { title: titleDraft.trim() || project.title, brief: briefDraft.trim() || project.brief })
    setEditing(false)
  }

  const primaryAction = () => {
    if (!isAssignedEditor) {
      return null
    }
    switch (project.status) {
      case 'not_started':
        return (
          <button type="button" className="primary-button" onClick={() => startEditing(project.id)}>
            Start editing
          </button>
        )
      case 'editing':
        return (
          <button
            type="button"
            className="primary-button"
            disabled={needsLink && effectiveLink.length === 0}
            onClick={onSubmitDelivery}
          >
            Submit work
          </button>
        )
      case 'submitted':
        return (
          <button type="button" className="primary-button" disabled>
            In review
          </button>
        )
      case 'revisions_requested':
        return (
          <button
            type="button"
            className="primary-button"
            disabled={needsLink && effectiveLink.length === 0}
            onClick={onSubmitDelivery}
          >
            Resubmit
          </button>
        )
      case 'approved':
        return (
          <button type="button" className="primary-button" disabled>
            Approved
          </button>
        )
      default:
        return null
    }
  }

  return (
    <div className="detail">
      <div className="detail-topbar">
        <Link to={manager ? '/team' : '/queue'} className="back-link">
          <ArrowLeft size={16} aria-hidden="true" />
          Back
        </Link>
        <NotificationBell />
      </div>

      <header className="detail-header">
        <div className="detail-header-text">
          <span className="detail-client">
            <span className="client-dot" style={{ backgroundColor: client?.accentColor }} aria-hidden="true" />
            {client?.name}
          </span>
          {editing ? (
            <input
              className="edit-title-input"
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              aria-label="Project title"
            />
          ) : (
            <h1 className="page-title">{project.title}</h1>
          )}
          <StatusPill key={project.status} status={project.status} />
        </div>
        <div className="detail-action">
          {primaryAction()}
          {isAssignedEditor && needsLink && effectiveLink.length === 0 ? (
            <p className="helper">Add a delivery link to submit.</p>
          ) : null}
          {canEditAnything(user) ? (
            editing ? (
              <div className="owner-edit-actions">
                <button type="button" className="secondary-button" onClick={saveEdit}>
                  <Check size={14} /> Save
                </button>
                <button type="button" className="ghost-button" onClick={() => setEditing(false)}>
                  <X size={14} /> Cancel
                </button>
              </div>
            ) : (
              <button type="button" className="ghost-button owner-edit" onClick={startEdit} title="Owner override: edit this project">
                <Pencil size={14} /> Edit
              </button>
            )
          ) : null}
        </div>
      </header>

      <div className="detail-grid">
        <div className="detail-main">
          {openRound ? (
            <section className="surface revision-callout">
              <div className="callout-head">
                <h2 className="section-head">What's being asked — Round {openRound.round}</h2>
                <button type="button" className="ai-chip" onClick={runAiSummary} disabled={aiLoading}>
                  <Sparkles size={13} aria-hidden="true" />
                  {aiLoading ? 'Summarizing…' : 'Summarize with AI'}
                </button>
              </div>
              {aiSummary ? (
                <div className="ai-summary">
                  <p className="ai-label">AI checklist</p>
                  <ul>
                    {aiSummary.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <ul className="revision-notes">
                  {openRound.notes.map((note, index) => (
                    <li key={index}>{note}</li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          <section className="surface">
            <h2 className="section-head">Brief</h2>
            {editing ? (
              <textarea
                className="edit-brief"
                value={briefDraft}
                onChange={(event) => setBriefDraft(event.target.value)}
                rows={4}
                aria-label="Project brief"
              />
            ) : (
              <p className="prose">{project.brief}</p>
            )}
          </section>

          <section className="surface">
            <h2 className="section-head">Specs</h2>
            <dl className="spec-grid">
              <div>
                <dt>Aspect ratio</dt>
                <dd className="tabular">{project.specs.aspectRatio}</dd>
              </div>
              <div>
                <dt>Resolution</dt>
                <dd className="tabular">{project.specs.resolution}</dd>
              </div>
              <div>
                <dt>Bitrate</dt>
                <dd className="tabular">{project.specs.bitrate}</dd>
              </div>
              <div>
                <dt>File naming</dt>
                <dd className="tabular">{project.specs.fileNaming}</dd>
              </div>
            </dl>
          </section>

          <section className="surface">
            <h2 className="section-head">Assets</h2>
            <ul className="asset-list">
              {project.assetLinks.map((asset) => (
                <li key={asset.url}>
                  <a href={asset.url} target="_blank" rel="noreferrer" className="asset-row">
                    <span>{asset.label}</span>
                    <ExternalLink size={16} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className="surface">
            <h2 className="section-head">Comments</h2>
            {project.comments.length === 0 ? (
              <p className="muted">No comments yet.</p>
            ) : (
              <ul className="comment-list">
                {project.comments.map((comment) => (
                  <li key={comment.id} className="comment">
                    <span className="avatar avatar-sm" aria-hidden="true">
                      {initialsFor(comment.authorName)}
                    </span>
                    <div className="comment-body">
                      <div className="comment-meta">
                        <span className="comment-author">{comment.authorName}</span>
                        <time className="comment-time" title={fullDateTime(comment.createdAt, timezone)}>
                          {relativeTime(comment.createdAt)}
                        </time>
                      </div>
                      <p>{comment.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="compose">
              <textarea
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                placeholder="Add a comment (use @name to mention)"
                rows={2}
                aria-label="Add a comment"
              />
              <button
                type="button"
                className="primary-button"
                disabled={commentDraft.trim().length === 0}
                onClick={() => {
                  addComment(project.id, commentDraft)
                  setCommentDraft('')
                }}
              >
                Add comment
              </button>
            </div>
          </section>
        </div>

        <aside className="detail-side">
          <section className="surface">
            <h2 className="section-head">Delivery</h2>
            <p className="delivery-version tabular">
              {latestDelivery ? `Current version v${latestDelivery.version}` : 'No delivery yet'}
            </p>
            {latestDelivery ? (
              <a href={latestDelivery.fileLink} target="_blank" rel="noreferrer" className="delivery-current">
                <ExternalLink size={14} aria-hidden="true" />
                Open latest delivery
              </a>
            ) : null}

            {canReview ? (
              <div className="reviewer-actions">
                <p className="helper">Review v{latestDelivery?.version}</p>
                <button type="button" className="primary-button" onClick={() => approveDelivery(project.id)}>
                  <Check size={14} /> Approve
                </button>
                <textarea
                  value={reviewNotes}
                  onChange={(event) => setReviewNotes(event.target.value)}
                  placeholder="Changes needed (one per line)"
                  rows={3}
                  aria-label="Change request notes"
                />
                <button
                  type="button"
                  className="secondary-button"
                  disabled={reviewNotes.trim().length === 0}
                  onClick={() => {
                    requestChanges(project.id, reviewNotes.split('\n'))
                    setReviewNotes('')
                  }}
                >
                  Request changes
                </button>
              </div>
            ) : isAssignedEditor && (project.status === 'editing' || project.status === 'revisions_requested') ? (
              <div className="delivery-composer">
                <input
                  type="url"
                  value={fileLinkDraft}
                  onChange={(event) => setFileLinkDraft(event.target.value)}
                  placeholder="Paste delivery link"
                  aria-label="Delivery link"
                />
                <textarea
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  placeholder="Note for reviewer (optional)"
                  rows={2}
                  aria-label="Delivery note"
                />
              </div>
            ) : null}
          </section>

          {versionHistory.length > 0 ? (
            <section className="surface">
              <h2 className="section-head">Version history</h2>
              <ul className="version-list">
                {versionHistory.map((delivery) => (
                  <li key={delivery.id} className="version-row">
                    <div className="version-top">
                      <span className="version-tag tabular">v{delivery.version}</span>
                      <span className={`delivery-outcome outcome-${delivery.outcome}`}>
                        {delivery.outcome === 'pending'
                          ? 'Pending review'
                          : delivery.outcome === 'approved'
                            ? 'Approved'
                            : 'Changes requested'}
                      </span>
                    </div>
                    {delivery.note ? <p className="version-note">{delivery.note}</p> : null}
                    <p className="version-meta tabular" title={fullDateTime(delivery.submittedAt, timezone)}>
                      Submitted {relativeTime(delivery.submittedAt)}
                      {delivery.reviewedByUserId
                        ? ` · reviewed by ${userName(delivery.reviewedByUserId)}`
                        : ''}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="surface">
            <h2 className="section-head">Revision history</h2>
            {project.revisions.length === 0 ? (
              <p className="muted">No revisions yet.</p>
            ) : (
              <div className="revisions">
                {project.revisions.map((revision, index) => (
                  <details key={revision.round} className="revision" open={index === project.revisions.length - 1}>
                    <summary>
                      <span>Round {revision.round}</span>
                      <span className={`revision-state ${revision.resolvedAt ? 'is-resolved' : 'is-open'}`}>
                        {revision.resolvedAt ? 'Resolved' : 'Open'}
                      </span>
                    </summary>
                    <ul className="revision-notes">
                      {revision.notes.map((note, noteIndex) => (
                        <li key={noteIndex}>{note}</li>
                      ))}
                    </ul>
                    <p className="revision-time" title={fullDateTime(revision.requestedAt, timezone)}>
                      Requested {relativeTime(revision.requestedAt)} by {userName(revision.requestedByUserId)}
                    </p>
                  </details>
                ))}
              </div>
            )}
          </section>

          {isAssignedEditor ? (
            <section className="surface">
              <h2 className="section-head">Time logged</h2>
              <p className="running-hours tabular">{formatHours(projectHours)}</p>
              <div className="log-fields">
                <label>
                  <span>Hours</span>
                  <input
                    type="number"
                    min={0.1}
                    max={24}
                    step={0.1}
                    value={hoursDraft}
                    onChange={(event) => setHoursDraft(event.target.value)}
                    placeholder="0.0"
                    aria-invalid={hoursError ? true : undefined}
                  />
                </label>
                <label>
                  <span>Date</span>
                  <input
                    type="date"
                    value={dateDraft}
                    max={todayInputValue(timezone)}
                    onChange={(event) => setDateDraft(event.target.value)}
                  />
                </label>
              </div>
              {hoursError ? (
                <p className="error" role="alert">
                  {hoursError}
                </p>
              ) : null}
              <button type="button" className="primary-button" onClick={onLogHours}>
                Log hours
              </button>
            </section>
          ) : (
            <section className="surface">
              <h2 className="section-head">Status</h2>
              <p className="muted">
                {STATUS_LABELS[project.status]} ·{' '}
                {project.assignedEditorId ? `assigned to ${userName(project.assignedEditorId)}` : 'Unassigned'}
              </p>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}

function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
