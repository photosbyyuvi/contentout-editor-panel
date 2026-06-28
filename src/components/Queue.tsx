import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, Inbox, LayoutList, SearchX } from 'lucide-react'
import { useApp, useEditorProjects, useVisibleProjects } from '../store'
import { isManager } from '../permissions'
import { PageHeader } from './PageHeader'
import { StatusPill } from './StatusPill'
import { CalendarView } from './CalendarView'
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
  const { user, users, clients, timeEntries } = useApp()
  const projects = useEditorProjects()
  const allVisible = useVisibleProjects()
  const isLoading = useFakeLoad()
  const manager = isManager(user)

  const [view, setView] = useState<'queue' | 'calendar'>('queue')
  const [clientFilter, setClientFilter] = useState<'all' | string>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const editors = useMemo(() => users.filter((u) => u.role === 'editor'), [users])
  const [calEditorId, setCalEditorId] = useState<string>('')
  const calEditorIdResolved = manager ? calEditorId || editors[0]?.id || '' : user?.id ?? ''
  const calEditor = users.find((u) => u.id === calEditorIdResolved) ?? null
  const calProjects = useMemo(
    () => (manager ? allVisible.filter((p) => p.assignedEditorId === calEditorIdResolved) : projects),
    [manager, allVisible, projects, calEditorIdResolved],
  )

  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({})
  const prevTops = useRef<Map<string, number>>(new Map())

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

  const firstName = user?.fullName.split(' ')[0] ?? 'there'

  // FLIP reorder (Q4): animate cards to new positions when the queue re-sorts.
  useLayoutEffect(() => {
    const nextTops = new Map<string, number>()
    for (const project of visibleProjects) {
      const node = itemRefs.current[project.id]
      if (node) {
        nextTops.set(project.id, node.getBoundingClientRect().top)
      }
    }
    let index = 0
    for (const project of visibleProjects) {
      const node = itemRefs.current[project.id]
      const prev = prevTops.current.get(project.id)
      const next = nextTops.get(project.id)
      if (node && prev !== undefined && next !== undefined) {
        const delta = prev - next
        if (Math.abs(delta) > 1) {
          const stagger = Math.min(index * 30, 180)
          node.style.transform = `translateY(${delta}px)`
          node.style.transition = 'transform 0s'
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              node.style.transform = ''
              node.style.transition = `transform 240ms cubic-bezier(0.2,0,0,1) ${stagger}ms`
            })
          })
        }
      }
      index += 1
    }
    prevTops.current = nextTops
  }, [visibleProjects])

  return (
    <>
      <PageHeader
        eyebrow={`Welcome back, ${firstName}`}
        title="Queue"
        actions={
          <div className="view-tabs" role="tablist" aria-label="View">
            <button
              type="button"
              role="tab"
              aria-selected={view === 'queue'}
              className={`view-tab ${view === 'queue' ? 'view-tab-active' : ''}`}
              onClick={() => setView('queue')}
            >
              <LayoutList size={14} aria-hidden="true" /> Queue
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'calendar'}
              className={`view-tab ${view === 'calendar' ? 'view-tab-active' : ''}`}
              onClick={() => setView('calendar')}
            >
              <CalendarDays size={14} aria-hidden="true" /> Calendar
            </button>
          </div>
        }
      />

      {view === 'calendar' ? (
        <>
          {manager ? (
            <div className="filter-group cal-editor-pick">
              <span className="filter-label">Editor</span>
              <div className="chip-row">
                {editors.map((ed) => (
                  <button
                    key={ed.id}
                    type="button"
                    className={`chip ${calEditorIdResolved === ed.id ? 'chip-active' : ''}`}
                    onClick={() => setCalEditorId(ed.id)}
                  >
                    {ed.fullName.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <CalendarView
            projects={calProjects}
            clients={clients}
            timeEntries={timeEntries}
            editor={calEditor}
            timezone={calEditor?.timezone ?? user?.timezone ?? 'UTC'}
          />
        </>
      ) : (
      <>
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
          <Inbox size={48} strokeWidth={1.5} aria-hidden="true" />
          <h2>Nothing assigned yet</h2>
          <p className="muted">Check back soon, or message the team.</p>
        </div>
      ) : visibleProjects.length === 0 ? (
        <div className="empty-state">
          <SearchX size={48} strokeWidth={1.5} aria-hidden="true" />
          <h2>No projects match these filters</h2>
          <button type="button" className="secondary-button" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="queue-list" key={`${clientFilter}-${statusFilter}`}>
          {visibleProjects.map((project) => {
            const client = clientById[project.clientId]
            const due = dueLabel(project.dueDate, user?.timezone ?? 'UTC', project.status)
            const openRound = project.revisions.find((revision) => revision.resolvedAt === null)
            return (
              <li
                key={project.id}
                ref={(node) => {
                  itemRefs.current[project.id] = node
                }}
              >
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
      )}
    </>
  )
}
