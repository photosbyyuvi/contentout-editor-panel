import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { useApp } from '../store'
import { NotificationBell } from './NotificationBell'
import { StatusPill } from './StatusPill'
import { fullDateTime, relativeTime, formatHours } from '../format'
import { todayInputValue, validateHours } from '../validation'
import { useFakeLoad } from '../useFakeLoad'
import type { Project } from '../types'

export function ProjectDetail() {
  const { projectId } = useParams()
  const {
    activeEditor,
    clients,
    projects,
    timeEntries,
    startEditing,
    submitWork,
    resubmitWork,
    saveDeliveryLink,
    addComment,
    logHours,
  } = useApp()
  const isLoading = useFakeLoad()

  const project = projects.find((item) => item.id === projectId) ?? null
  const timezone = activeEditor?.timezone ?? 'UTC'

  const [linkDraft, setLinkDraft] = useState('')
  const [commentDraft, setCommentDraft] = useState('')
  const [hoursDraft, setHoursDraft] = useState('')
  const [dateDraft, setDateDraft] = useState(todayInputValue(timezone))
  const [hoursError, setHoursError] = useState<string | null>(null)

  const client = clients.find((item) => item.id === project?.clientId)

  const projectHours = useMemo(() => {
    if (!project || !activeEditor) {
      return 0
    }
    return timeEntries
      .filter((entry) => entry.projectId === project.id && entry.editorId === activeEditor.id)
      .reduce((sum, entry) => sum + entry.hours, 0)
  }, [project, activeEditor, timeEntries])

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

  if (!project || !activeEditor) {
    return (
      <div className="empty-state">
        <h2>Project not found</h2>
        <Link to="/queue" className="secondary-button">
          Back to queue
        </Link>
      </div>
    )
  }

  const savedLink = project.deliveryLink ?? ''
  const effectiveLink = linkDraft.trim() || savedLink
  const needsLink = project.status === 'editing' || project.status === 'revisions_requested'
  const submitDisabled = needsLink && effectiveLink.length === 0

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

  return (
    <div className="detail">
      <div className="detail-topbar">
        <Link to="/queue" className="back-link">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to queue
        </Link>
        <NotificationBell />
      </div>

      <header className="detail-header">
        <div className="detail-header-text">
          <span className="detail-client">
            <span className="client-dot" style={{ backgroundColor: client?.accentColor }} aria-hidden="true" />
            {client?.name}
          </span>
          <h1 className="page-title">{project.title}</h1>
          <StatusPill status={project.status} />
        </div>
        <div className="detail-action">
          <PrimaryAction
            project={project}
            submitDisabled={submitDisabled}
            onStart={() => startEditing(project.id)}
            onSubmit={() => submitWork(project.id, effectiveLink)}
            onResubmit={() => resubmitWork(project.id, effectiveLink)}
          />
          {submitDisabled ? <p className="helper">Add a delivery link to submit.</p> : null}
        </div>
      </header>

      <div className="detail-grid">
        <div className="detail-main">
          <section className="surface">
            <h2 className="section-head">Brief</h2>
            <p className="prose">{project.brief}</p>
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
                placeholder="Add a comment"
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
            {savedLink ? (
              <a href={savedLink} target="_blank" rel="noreferrer" className="delivery-current">
                <ExternalLink size={14} aria-hidden="true" />
                Current delivery
              </a>
            ) : (
              <p className="muted">No delivery link yet.</p>
            )}
            <input
              type="url"
              value={linkDraft}
              onChange={(event) => setLinkDraft(event.target.value)}
              placeholder="Paste delivery link"
              aria-label="Delivery link"
            />
            <button
              type="button"
              className="secondary-button"
              disabled={linkDraft.trim().length === 0}
              onClick={() => {
                saveDeliveryLink(project.id, linkDraft)
                setLinkDraft('')
              }}
            >
              Save link
            </button>
          </section>

          <section className="surface">
            <h2 className="section-head">Revision history</h2>
            {project.revisions.length === 0 ? (
              <p className="muted">No revisions yet.</p>
            ) : (
              <div className="revisions">
                {project.revisions.map((revision, index) => (
                  <details
                    key={revision.round}
                    className="revision"
                    open={index === project.revisions.length - 1}
                  >
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
                      Requested {relativeTime(revision.requestedAt)}
                    </p>
                  </details>
                ))}
              </div>
            )}
          </section>

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
        </aside>
      </div>
    </div>
  )
}

function PrimaryAction({
  project,
  submitDisabled,
  onStart,
  onSubmit,
  onResubmit,
}: {
  project: Project
  submitDisabled: boolean
  onStart: () => void
  onSubmit: () => void
  onResubmit: () => void
}) {
  switch (project.status) {
    case 'not_started':
      return (
        <button type="button" className="primary-button" onClick={onStart}>
          Start editing
        </button>
      )
    case 'editing':
      return (
        <button type="button" className="primary-button" disabled={submitDisabled} onClick={onSubmit}>
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
        <button type="button" className="primary-button" disabled={submitDisabled} onClick={onResubmit}>
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

function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
