import type { ProjectStatus, UrgencyState } from './types'

const HOUR_MS = 36e5

function partsFor(iso: string, timeZone: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone }).format(new Date(iso))
}

export function urgencyFor(
  dueDate: string,
  status: ProjectStatus,
  now: number = Date.now(),
): UrgencyState {
  if (status === 'approved') {
    return 'on_track'
  }
  const hoursLeft = (new Date(dueDate).getTime() - now) / HOUR_MS
  if (hoursLeft < 0) {
    return 'overdue'
  }
  if (hoursLeft < 24) {
    return 'due_soon'
  }
  return 'on_track'
}

export type DueLabel = { text: string; urgency: UrgencyState }

// Part D — due labels, computed against the editor's IANA timezone.
export function dueLabel(
  dueDate: string,
  timeZone: string,
  status: ProjectStatus,
  now: number = Date.now(),
): DueLabel {
  const monthDay = partsFor(dueDate, timeZone, { month: 'short', day: 'numeric' })

  if (status === 'approved') {
    return { text: monthDay, urgency: 'on_track' }
  }

  const hoursLeft = (new Date(dueDate).getTime() - now) / HOUR_MS

  if (hoursLeft < 0) {
    const absHours = -hoursLeft
    if (absHours < 24) {
      return { text: `Overdue by ${Math.max(1, Math.round(absHours))}h`, urgency: 'overdue' }
    }
    return { text: `Overdue by ${Math.max(1, Math.round(absHours / 24))}d`, urgency: 'overdue' }
  }
  if (hoursLeft < 12) {
    return { text: `Due in ${Math.max(1, Math.round(hoursLeft))}h`, urgency: 'due_soon' }
  }
  if (hoursLeft < 24) {
    return { text: 'Due tomorrow', urgency: 'due_soon' }
  }
  if (hoursLeft <= 168) {
    const weekday = partsFor(dueDate, timeZone, { weekday: 'short' })
    return { text: `Due ${weekday}`, urgency: 'on_track' }
  }
  return { text: `Due ${monthDay}`, urgency: 'on_track' }
}

// Part D — relative timestamps.
export function relativeTime(iso: string, now: number = Date.now()): string {
  const diffMs = now - new Date(iso).getTime()
  const minutes = diffMs / 60000
  if (minutes < 60) {
    return `${Math.max(0, Math.floor(minutes))}m ago`
  }
  const hours = minutes / 60
  if (hours < 24) {
    return `${Math.floor(hours)}h ago`
  }
  const days = hours / 24
  if (days < 7) {
    return `${Math.floor(days)}d ago`
  }
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(iso))
}

export function fullDateTime(iso: string, timeZone: string): string {
  return partsFor(iso, timeZone, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// Part D — table dates: MMM D; add year only if not current year.
export function tableDate(iso: string, timeZone: string, now: number = Date.now()): string {
  const yearOf = (value: Date) =>
    new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone }).format(value)
  const sameYear = yearOf(new Date(iso)) === yearOf(new Date(now))
  return partsFor(iso, timeZone, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

// Part D — hours: one decimal, "3.5h".
export function formatHours(value: number): string {
  return `${value.toFixed(1)}h`
}

// Part D — currency: CAD, "$1,240.00", two decimals.
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function monthKey(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    timeZone,
  }).formatToParts(new Date(iso))
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970'
  const month = parts.find((part) => part.type === 'month')?.value ?? '01'
  return `${year}-${month}`
}

export function monthLabel(periodKey: string, timeZone: string): string {
  const date = new Date(`${periodKey}-15T12:00:00Z`)
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone,
  }).format(date)
}
