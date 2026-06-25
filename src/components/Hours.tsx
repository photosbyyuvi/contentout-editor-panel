import { useMemo, useState } from 'react'
import { ArrowDownUp } from 'lucide-react'
import { useApp, useEditorProjects } from '../store'
import { PageHeader } from './PageHeader'
import {
  formatCurrency,
  formatHours,
  monthKey,
  monthLabel,
  tableDate,
} from '../format'
import { todayInputValue, validateHours } from '../validation'
import { useFakeLoad } from '../useFakeLoad'

type PeriodSummary = {
  periodKey: string
  hours: number
  pay: number
  approvedDeliverables: number
}

export function Hours() {
  const { activeEditor, timeEntries, logHours } = useApp()
  const projects = useEditorProjects()
  const isLoading = useFakeLoad()
  const timezone = activeEditor?.timezone ?? 'UTC'

  const [logProjectId, setLogProjectId] = useState('')
  const [hoursDraft, setHoursDraft] = useState('')
  const [dateDraft, setDateDraft] = useState(todayInputValue(timezone))
  const [hoursError, setHoursError] = useState<string | null>(null)
  const [sortDescending, setSortDescending] = useState(true)

  const projectById = useMemo(
    () => Object.fromEntries(projects.map((project) => [project.id, project])),
    [projects],
  )

  const editorEntries = useMemo(
    () => (activeEditor ? timeEntries.filter((entry) => entry.editorId === activeEditor.id) : []),
    [timeEntries, activeEditor],
  )

  const { current, history } = useMemo(() => {
    if (!activeEditor) {
      return { current: null as PeriodSummary | null, history: [] as PeriodSummary[] }
    }
    const approvedProjects = projects.filter((project) => project.status === 'approved' && project.approvedAt)
    const periods = new Set<string>([
      monthKey(new Date().toISOString(), timezone),
      ...editorEntries.map((entry) => monthKey(entry.date, timezone)),
      ...approvedProjects.map((project) => monthKey(project.approvedAt as string, timezone)),
    ])

    const summaries: PeriodSummary[] = Array.from(periods)
      .sort((a, b) => b.localeCompare(a))
      .map((periodKey) => {
        const periodEntries = editorEntries.filter((entry) => monthKey(entry.date, timezone) === periodKey)
        const hours = periodEntries.reduce((sum, entry) => sum + entry.hours, 0)
        const periodApprovals = approvedProjects.filter(
          (project) => monthKey(project.approvedAt as string, timezone) === periodKey,
        )
        const pay =
          activeEditor.payModel === 'hourly'
            ? periodEntries.reduce((sum, entry) => sum + entry.hours * entry.rateApplied, 0)
            : periodApprovals.reduce(
                (sum, project) => sum + (activeEditor.flatRates?.[project.deliverableType] ?? 0),
                0,
              )
        return { periodKey, hours, pay, approvedDeliverables: periodApprovals.length }
      })

    const currentKey = monthKey(new Date().toISOString(), timezone)
    return {
      current: summaries.find((summary) => summary.periodKey === currentKey) ?? null,
      history: summaries.filter((summary) => summary.periodKey !== currentKey),
    }
  }, [activeEditor, projects, editorEntries, timezone])

  const sortedEntries = useMemo(() => {
    return editorEntries.slice().sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime()
      return sortDescending ? -diff : diff
    })
  }, [editorEntries, sortDescending])

  if (!activeEditor) {
    return null
  }

  const onLogHours = () => {
    if (!logProjectId) {
      setHoursError('Pick a project to log against.')
      return
    }
    const result = validateHours(hoursDraft, dateDraft, todayInputValue(timezone))
    if (!result.ok) {
      setHoursError(result.error)
      return
    }
    setHoursError(null)
    logHours(logProjectId, result.hours, new Date(`${dateDraft}T12:00:00`).toISOString())
    setHoursDraft('')
  }

  return (
    <>
      <PageHeader eyebrow={current ? monthLabel(current.periodKey, timezone) : 'Earnings'} title="Hours & pay" />

      {isLoading ? (
        <div className="hours-skeleton" aria-hidden="true">
          <div className="surface skeleton-box-lg" />
          <div className="surface skeleton-box-lg" />
        </div>
      ) : (
        <>
          <section className="surface period-summary">
            <p className="eyebrow">This period · {current ? monthLabel(current.periodKey, timezone) : ''}</p>
            <p className="period-total tabular">{formatCurrency(current?.pay ?? 0)}</p>
            <p className="muted tabular">
              {formatHours(current?.hours ?? 0)} logged
              {activeEditor.payModel === 'hourly'
                ? ` · ${formatCurrency(activeEditor.hourlyRate ?? 0)}/h`
                : ` · ${current?.approvedDeliverables ?? 0} approved deliverables`}
            </p>
          </section>

          <section className="surface">
            <h2 className="section-head">Log hours</h2>
            <div className="log-row">
              <label>
                <span>Project</span>
                <select value={logProjectId} onChange={(event) => setLogProjectId(event.target.value)}>
                  <option value="">Select a project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              </label>
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
              <button type="button" className="primary-button" onClick={onLogHours}>
                Log hours
              </button>
            </div>
            {hoursError ? (
              <p className="error" role="alert">
                {hoursError}
              </p>
            ) : null}
          </section>

          <section className="surface">
            <h2 className="section-head">Time entries</h2>
            {sortedEntries.length === 0 ? (
              <p className="muted">No time logged yet.</p>
            ) : (
              <table className="entries-table">
                <thead>
                  <tr>
                    <th scope="col">
                      <button
                        type="button"
                        className="th-sort"
                        onClick={() => setSortDescending((prev) => !prev)}
                      >
                        Date
                        <ArrowDownUp size={13} aria-hidden="true" />
                      </button>
                    </th>
                    <th scope="col">Project</th>
                    <th scope="col" className="num">Hours</th>
                    <th scope="col" className="num">Rate</th>
                    <th scope="col" className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="tabular">{tableDate(entry.date, timezone)}</td>
                      <td>{projectById[entry.projectId]?.title ?? 'Unknown project'}</td>
                      <td className="num tabular">{entry.hours.toFixed(1)}</td>
                      <td className="num tabular">
                        {entry.rateApplied > 0 ? formatCurrency(entry.rateApplied) : '—'}
                      </td>
                      <td className="num tabular">
                        {entry.rateApplied > 0 ? formatCurrency(entry.hours * entry.rateApplied) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="surface">
            <h2 className="section-head">History</h2>
            {history.length === 0 ? (
              <p className="muted">No previous periods yet.</p>
            ) : (
              <ul className="history-list">
                {history.map((summary) => (
                  <li key={summary.periodKey}>
                    <span>{monthLabel(summary.periodKey, timezone)}</span>
                    <span className="tabular">{formatHours(summary.hours)}</span>
                    <span className="tabular">{formatCurrency(summary.pay)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  )
}
