import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react'
import { StatusPill } from './StatusPill'
import { dueLabel, formatCurrency, monthKey, urgencyFor } from '../format'
import { useMediaQuery } from '../useMediaQuery'
import { DELIVERABLE_LABELS, type Client, type Project, type TimeEntry, type User } from '../types'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const pad = (n: number) => String(n).padStart(2, '0')

function localKey(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(iso))
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

type Cell = { key: string; day: number; inMonth: boolean; isToday: boolean }

function buildGrid(year: number, month: number, todayKey: string): Cell[] {
  const firstUTC = Date.UTC(year, month, 1)
  const startWeekday = new Date(firstUTC).getUTCDay()
  const start = firstUTC - startWeekday * 86400000
  const cells: Cell[] = []
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(start + i * 86400000)
    const key = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
    cells.push({ key, day: d.getUTCDate(), inMonth: d.getUTCMonth() === month, isToday: key === todayKey })
  }
  return cells
}

export function CalendarView({
  projects,
  clients,
  timeEntries,
  editor,
  timezone,
}: {
  projects: Project[]
  clients: Client[]
  timeEntries: TimeEntry[]
  editor: User | null
  timezone: string
}) {
  const todayKey = localKey(new Date().toISOString(), timezone)
  const [todayY, todayM] = todayKey.split('-').map(Number)
  const [cursor, setCursor] = useState({ year: todayY, month: todayM - 1 })
  const [dir, setDir] = useState(0)
  const [detail, setDetail] = useState<Project | null>(null)
  const [dayKey, setDayKey] = useState<string | null>(null)
  const isMobile = useMediaQuery('(max-width: 768px)')

  const clientById = useMemo(() => Object.fromEntries(clients.map((c) => [c.id, c])), [clients])

  const byDay = useMemo(() => {
    const map: Record<string, Project[]> = {}
    for (const p of projects) {
      const key = localKey(p.dueDate, timezone)
      ;(map[key] ??= []).push(p)
    }
    return map
  }, [projects, timezone])

  const monthLabel = `${MONTHS[cursor.month]} ${cursor.year}`
  const displayedMonthKey = `${cursor.year}-${pad(cursor.month + 1)}`

  const payout = useMemo(() => {
    if (!editor) {
      return null
    }
    if (editor.payModel === 'retainer') {
      return editor.retainerAmount ?? 0
    }
    if (editor.payModel === 'flat') {
      return projects
        .filter((p) => p.status === 'approved' && p.approvedAt && monthKey(p.approvedAt, timezone) === displayedMonthKey)
        .reduce((sum, p) => sum + (editor.flatRates?.[p.deliverableType] ?? 0), 0)
    }
    return timeEntries
      .filter((e) => e.editorId === editor.id && monthKey(e.date, timezone) === displayedMonthKey)
      .reduce((sum, e) => sum + e.hours * e.rateApplied, 0)
  }, [editor, projects, timeEntries, timezone, displayedMonthKey])

  const go = (delta: number) => {
    setDir(delta)
    setCursor((c) => {
      const m = c.month + delta
      if (m < 0) {
        return { year: c.year - 1, month: 11 }
      }
      if (m > 11) {
        return { year: c.year + 1, month: 0 }
      }
      return { year: c.year, month: m }
    })
  }
  const goToday = () => {
    setDir(0)
    setCursor({ year: todayY, month: todayM - 1 })
  }

  const cells = useMemo(() => buildGrid(cursor.year, cursor.month, todayKey), [cursor, todayKey])

  const chipClass = (p: Project) => {
    const u = urgencyFor(p.dueDate, p.status)
    return `cal-chip ${u === 'overdue' ? 'cal-chip-overdue' : u === 'due_soon' ? 'cal-chip-due' : ''}`
  }

  const renderChip = (p: Project) => {
    const client = clientById[p.clientId]
    return (
      <button
        key={p.id}
        type="button"
        className={chipClass(p)}
        style={{ ['--chip-accent' as string]: client?.accentColor ?? 'var(--text-tertiary)' }}
        onClick={() => {
          setDayKey(null)
          setDetail(p)
        }}
        title={p.title}
      >
        <span className="cal-chip-dot" aria-hidden="true" />
        <span className="cal-chip-title">{p.title}</span>
      </button>
    )
  }

  // Agenda (mobile): days with projects in the month, ascending
  const agendaDays = cells.filter((c) => c.inMonth && (byDay[c.key]?.length ?? 0) > 0)

  return (
    <div className="calendar">
      <div className="cal-header">
        <div className="cal-nav">
          <button type="button" className="icon-button" onClick={() => go(-1)} aria-label="Previous month">
            <ChevronLeft size={18} />
          </button>
          <h2 className="cal-title">{monthLabel}</h2>
          <button type="button" className="icon-button" onClick={() => go(1)} aria-label="Next month">
            <ChevronRight size={18} />
          </button>
          <button type="button" className="secondary-button cal-today" onClick={goToday}>
            Today
          </button>
        </div>
        {payout !== null ? (
          <p className="cal-payout muted">
            {MONTHS[cursor.month]} payout <span className="tabular">{formatCurrency(payout)}</span>
          </p>
        ) : null}
      </div>

      {isMobile ? (
        <div className="cal-agenda" key={displayedMonthKey}>
          {agendaDays.length === 0 ? (
            <p className="muted cal-empty">Nothing due in {monthLabel}.</p>
          ) : (
            agendaDays.map((c) => (
              <div key={c.key} className="agenda-day">
                <div className={`agenda-date ${c.isToday ? 'is-today' : ''}`}>
                  <span className="agenda-dow">{WEEKDAYS[new Date(`${c.key}T00:00:00Z`).getUTCDay()]}</span>
                  <span className="agenda-num tabular">{c.day}</span>
                </div>
                <div className="agenda-items">{byDay[c.key].map(renderChip)}</div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="cal-grid-wrap">
          <div className="cal-weekdays">
            {WEEKDAYS.map((d) => (
              <div key={d} className="cal-weekday">{d}</div>
            ))}
          </div>
          <div
            className={`cal-grid ${dir > 0 ? 'cal-slide-next' : dir < 0 ? 'cal-slide-prev' : 'cal-fade'}`}
            key={displayedMonthKey}
          >
            {cells.map((c) => {
              const items = byDay[c.key] ?? []
              const shown = items.slice(0, 3)
              const overflow = items.length - shown.length
              return (
                <div key={c.key} className={`cal-cell ${c.inMonth ? '' : 'cal-cell-out'} ${c.isToday ? 'cal-cell-today' : ''}`}>
                  <span className="cal-daynum tabular">{c.day}</span>
                  <div className="cal-chips">
                    {shown.map(renderChip)}
                    {overflow > 0 ? (
                      <button type="button" className="cal-more" onClick={() => { setDetail(null); setDayKey(c.key) }}>
                        +{overflow} more
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Detail / day side panel */}
      {(detail || dayKey) ? (
        <>
          <button type="button" className="cal-scrim" aria-label="Close" onClick={() => { setDetail(null); setDayKey(null) }} />
          <aside className="cal-panel" role="dialog" aria-modal="true">
            <header className="cal-panel-head">
              <h3>{detail ? 'Project' : 'Due this day'}</h3>
              <button type="button" className="icon-button" onClick={() => { setDetail(null); setDayKey(null) }} aria-label="Close">
                <X size={18} />
              </button>
            </header>
            {detail ? (
              <div className="cal-panel-body">
                <span className="detail-client">
                  <span className="client-dot" style={{ backgroundColor: clientById[detail.clientId]?.accentColor }} aria-hidden="true" />
                  {clientById[detail.clientId]?.name}
                </span>
                <h4 className="cal-panel-title">{detail.title}</h4>
                <StatusPill status={detail.status} />
                <dl className="cal-panel-meta">
                  <div>
                    <dt>Due</dt>
                    <dd className={`tabular urgency-${urgencyFor(detail.dueDate, detail.status)}`}>
                      {dueLabel(detail.dueDate, timezone, detail.status).text}
                    </dd>
                  </div>
                  <div>
                    <dt>Type</dt>
                    <dd>{DELIVERABLE_LABELS[detail.deliverableType]}</dd>
                  </div>
                  {detail.deliveryLink ? (
                    <div>
                      <dt>Delivery</dt>
                      <dd>
                        <a href={detail.deliveryLink} target="_blank" rel="noreferrer" className="delivery-current">
                          <ExternalLink size={13} aria-hidden="true" /> Latest delivery
                        </a>
                      </dd>
                    </div>
                  ) : null}
                </dl>
                <p className="prose cal-panel-brief">{detail.brief}</p>
                <Link to={`/project/${detail.id}`} className="primary-button cal-panel-open">
                  Open project
                </Link>
              </div>
            ) : (
              <div className="cal-panel-body">
                <div className="cal-chips cal-chips-stack">{(byDay[dayKey as string] ?? []).map(renderChip)}</div>
              </div>
            )}
          </aside>
        </>
      ) : null}
    </div>
  )
}
