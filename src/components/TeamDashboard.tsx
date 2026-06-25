import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, Plus } from 'lucide-react'
import { useApp } from '../store'
import { isOwner } from '../permissions'
import { PageHeader } from './PageHeader'
import { NewProjectModal } from './NewProjectModal'
import { StatusPill } from './StatusPill'
import { dueLabel, formatCurrency, formatHours, monthKey } from '../format'
import { useFakeLoad } from '../useFakeLoad'

export function TeamDashboard() {
  const { user, users, clients, projects, timeEntries, enterViewAs } = useApp()
  const navigate = useNavigate()
  const isLoading = useFakeLoad()
  const [editorFilter, setEditorFilter] = useState<'all' | string>('all')
  const [showNewProject, setShowNewProject] = useState(false)

  const editors = useMemo(() => users.filter((u) => u.role === 'editor'), [users])
  const clientById = useMemo(
    () => Object.fromEntries(clients.map((client) => [client.id, client])),
    [clients],
  )
  const editorById = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u])),
    [users],
  )

  const counts = useMemo(
    () => ({
      inReview: projects.filter((p) => p.status === 'submitted').length,
      overdue: projects.filter(
        (p) => p.status !== 'approved' && new Date(p.dueDate).getTime() < Date.now(),
      ).length,
      awaiting: projects.filter((p) => p.assignedEditorId === null).length,
      active: projects.filter((p) => p.status !== 'approved').length,
    }),
    [projects],
  )

  const visible = useMemo(() => {
    return projects
      .filter((p) => (editorFilter === 'all' ? true : p.assignedEditorId === editorFilter))
      .slice()
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
  }, [projects, editorFilter])

  const billing = useMemo(() => {
    const period = monthKey(new Date().toISOString(), 'America/Toronto')
    return editors.map((editor) => {
      const entries = timeEntries.filter(
        (entry) => entry.editorId === editor.id && monthKey(entry.date, editor.timezone) === period,
      )
      const hours = entries.reduce((sum, entry) => sum + entry.hours, 0)
      const approved = projects.filter(
        (p) =>
          p.assignedEditorId === editor.id &&
          p.status === 'approved' &&
          p.approvedAt &&
          monthKey(p.approvedAt, editor.timezone) === period,
      )
      const pay =
        editor.payModel === 'flat'
          ? approved.reduce((sum, p) => sum + (editor.flatRates?.[p.deliverableType] ?? 0), 0)
          : entries.reduce((sum, entry) => sum + entry.hours * entry.rateApplied, 0)
      return { editor, hours, pay }
    })
  }, [editors, timeEntries, projects])

  const firstName = user?.fullName.split(' ')[0] ?? 'there'

  return (
    <>
      <PageHeader
        eyebrow={`Welcome back, ${firstName}`}
        title="Team"
        actions={
          <button type="button" className="primary-button" onClick={() => setShowNewProject(true)}>
            <Plus size={14} /> New project
          </button>
        }
      />
      {showNewProject ? <NewProjectModal onClose={() => setShowNewProject(false)} /> : null}

      {isLoading ? (
        <div className="hours-skeleton" aria-hidden="true">
          <div className="surface skeleton-box-lg" />
          <div className="surface skeleton-box-lg" />
        </div>
      ) : (
        <>
          <div className="metric-row">
            <div className="metric">
              <span className="metric-value tabular">{counts.active}</span>
              <span className="metric-label">Active</span>
            </div>
            <div className="metric">
              <span className="metric-value tabular">{counts.inReview}</span>
              <span className="metric-label">In review</span>
            </div>
            <div className="metric">
              <span className={`metric-value tabular ${counts.overdue > 0 ? 'is-overdue' : ''}`}>
                {counts.overdue}
              </span>
              <span className="metric-label">Overdue</span>
            </div>
            <div className="metric">
              <span className="metric-value tabular">{counts.awaiting}</span>
              <span className="metric-label">Awaiting assignment</span>
            </div>
          </div>

          <div className="filters">
            <div className="filter-group">
              <span className="filter-label">Editor</span>
              <div className="chip-row">
                <button
                  type="button"
                  className={`chip ${editorFilter === 'all' ? 'chip-active' : ''}`}
                  onClick={() => setEditorFilter('all')}
                >
                  All
                </button>
                {editors.map((editor) => (
                  <button
                    key={editor.id}
                    type="button"
                    className={`chip ${editorFilter === editor.id ? 'chip-active' : ''}`}
                    onClick={() => setEditorFilter(editor.id)}
                  >
                    {editor.fullName.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <section className="surface">
            <h2 className="section-head">All projects</h2>
            <ul className="team-project-list">
              {visible.map((project) => {
                const client = clientById[project.clientId]
                const editor = project.assignedEditorId ? editorById[project.assignedEditorId] : null
                const due = dueLabel(project.dueDate, 'America/Toronto', project.status)
                return (
                  <li key={project.id}>
                    <Link to={`/project/${project.id}`} className="team-project-row">
                      <span className="team-project-main">
                        <span className="queue-client">
                          <span className="client-dot" style={{ backgroundColor: client?.accentColor }} aria-hidden="true" />
                          {client?.name}
                        </span>
                        <span className="team-project-title">{project.title}</span>
                      </span>
                      <span className="team-project-editor">{editor?.fullName ?? 'Unassigned'}</span>
                      <span className={`due-label urgency-${due.urgency} tabular`}>{due.text}</span>
                      <StatusPill status={project.status} />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>

          {isOwner(user) ? (
            <section className="surface">
              <h2 className="section-head">Billing summary · this period (Owner only)</h2>
              <table className="entries-table">
                <thead>
                  <tr>
                    <th scope="col">Editor</th>
                    <th scope="col">Pay model</th>
                    <th scope="col" className="num">Hours</th>
                    <th scope="col" className="num">Payout</th>
                    <th scope="col" />
                  </tr>
                </thead>
                <tbody>
                  {billing.map(({ editor, hours, pay }) => (
                    <tr key={editor.id}>
                      <td>{editor.fullName}</td>
                      <td className="muted">{editor.payModel === 'flat' ? 'Flat / deliverable' : 'Hourly'}</td>
                      <td className="num tabular">{formatHours(hours)}</td>
                      <td className="num tabular">{formatCurrency(pay)}</td>
                      <td className="num">
                        <button
                          type="button"
                          className="ghost-button view-as-btn"
                          onClick={() => {
                            enterViewAs(editor.id)
                            navigate('/queue')
                          }}
                          title={`View the portal as ${editor.fullName}`}
                        >
                          <Eye size={14} /> View as
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
        </>
      )}
    </>
  )
}
