import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Inbox } from 'lucide-react'
import { useApp, useEditorProjects } from '../store'
import { PageHeader } from './PageHeader'
import { StatusPill } from './StatusPill'
import { dueLabel, urgencyFor } from '../format'
import { DELIVERABLE_LABELS, type ProjectStatus } from '../types'
import { useFakeLoad } from '../useFakeLoad'

type StatusFilter = 'all' | ProjectStatus

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'not_started', label: 'Not started' },
  { value: 'editing', label: 'Editing' },
  { value: 'submitted', label: 'In review' },
  { value: 'revisions_requested', label: 'Revisions' },
  { value: 'approved', label: 'Approved' },
]

export function Queue() {
  const { activeEditor, clients } = useApp()
  const projects = useEditorProjects()
  const isLoading = useFakeLoad()

  const [clientFilter, setClientFilter] = useState<'all' | string>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const clientById = useMemo(
    () => Object.fromEntries(clients.map((client) => [client.id, client])),
    [clients],
  )

  const summary = useMemo(() => {
    const active = projects.filter((project) => project.status !== 'approved')
    return {
      active: active.length,
      dueSoon: active.filter((project) => urgencyFor(project.dueDate, project.status) === 'due_soon')
        .length,
      overdue: active.filter((project) => urgencyFor(project.dueDate, project.status) === 'overdue')
        .length,
      inReview: projects.filter((project) => project.status === 'submitted').length,
    }
  }, [projects])

  const visibleProjects = useMemo(() => {
    return projects
      .filter((project) => (clientFilter === 'all' ? true : project.clientId === clientFilter))
      .filter((project) => (statusFilter === 'all' ? true : project.status === statusFilter))
      .slice()
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
  }, [projects, clientFilter, statusFilter])

  const clearFilters = () => {
    setClientFilter('all')
    setStatusFilter('all')
  }

  const firstName = activeEditor?.name.split(' ')[0] ?? 'there'

  return (
    <>
      <PageHeader eyebrow={`Welcome back, ${firstName}`} title="Queue" />

      <div className="summary-strip" role="status">
        <span className="tabular">{summary.active} active</span>
        <span className="dot-sep" aria-hidden="true">·</span>
        <span className="tabular">{summary.dueSoon} due soon</span>
        <span className="dot-sep" aria-hidden="true">·</span>
        <span className={`tabular ${summary.overdue > 0 ? 'is-overdue' : ''}`}>
          {summary.overdue} overdue
        </span>
        <span className="dot-sep" aria-hidden="true">·</span>
        <span className="tabular">{summary.inReview} in review</span>
      </div>

      <div className="filters">
        <div className="filter-group">
          <span className="filter-label">Client</span>
          <div className="chip-row">
            <button
              type="button"
              className={`chip ${clientFilter === 'all' ? 'chip-active' : ''}`}
              onClick={() => setClientFilter('all')}
            >
              All
            </button>
            {clients.map((client) => (
              <button
                key={client.id}
                type="button"
                className={`chip ${clientFilter === client.id ? 'chip-active' : ''}`}
                onClick={() => setClientFilter(client.id)}
              >
                <span className="client-dot" style={{ backgroundColor: client.accentColor }} aria-hidden="true" />
                {client.name}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <span className="filter-label">Status</span>
          <div className="chip-row">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={`chip ${statusFilter === filter.value ? 'chip-active' : ''}`}
                onClick={() => setStatusFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <ul className="queue-list" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <li key={index} className="queue-card queue-card-skeleton">
              <div className="skeleton-line w-40" />
              <div className="skeleton-line w-70" />
              <div className="skeleton-line w-55" />
            </li>
          ))}
        </ul>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <Inbox size={28} aria-hidden="true" />
          <h2>Nothing assigned yet</h2>
          <p className="muted">Check back soon, or message the team.</p>
        </div>
      ) : visibleProjects.length === 0 ? (
        <div className="empty-state">
          <h2>No projects match these filters</h2>
          <button type="button" className="secondary-button" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="queue-list" key={`${clientFilter}-${statusFilter}`}>
          {visibleProjects.map((project) => {
            const client = clientById[project.clientId]
            const due = dueLabel(project.dueDate, activeEditor?.timezone ?? 'UTC', project.status)
            const openRound = project.revisions.find((revision) => revision.resolvedAt === null)
            return (
              <li key={project.id}>
                <Link to={`/project/${project.id}`} className="queue-card">
                  <div className="queue-card-top">
                    <span className="queue-client">
                      <span
                        className="client-dot"
                        style={{ backgroundColor: client?.accentColor }}
                        aria-hidden="true"
                      />
                      {client?.name}
                    </span>
                    <span className={`due-label urgency-${due.urgency} tabular`}>{due.text}</span>
                  </div>
                  <h3 className="queue-title">{project.title}</h3>
                  <p className="queue-meta">
                    <span>{DELIVERABLE_LABELS[project.deliverableType]}</span>
                    <span className="dot-sep" aria-hidden="true">·</span>
                    <span className="tabular">{project.specs.aspectRatio}</span>
                    <span className="dot-sep" aria-hidden="true">·</span>
                    <span className="tabular">{project.specs.resolution}</span>
                  </p>
                  <div className="queue-card-bottom">
                    <span className="open-affordance">
                      Open
                      <ArrowRight size={14} aria-hidden="true" />
                    </span>
                    <span className="queue-card-status">
                      {project.status === 'revisions_requested' && openRound ? (
                        <span className="notes-badge">{openRound.notes.length} new notes</span>
                      ) : null}
                      <StatusPill status={project.status} />
                    </span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
