export type HoursValidation =
  | { ok: true; hours: number }
  | { ok: false; error: string }

// Part F — reject empty, zero, negative, non-numeric, or >24/day; future dates rejected.
export function validateHours(raw: string, dateISO: string, now: number = Date.now()): HoursValidation {
  const trimmed = raw.trim()
  if (trimmed.length === 0) {
    return { ok: false, error: 'Enter hours between 0.1 and 24.' }
  }
  const hours = Number(trimmed)
  if (!Number.isFinite(hours) || hours < 0.1 || hours > 24) {
    return { ok: false, error: 'Enter hours between 0.1 and 24.' }
  }
  if (dateISO) {
    const picked = new Date(dateISO).getTime()
    if (Number.isFinite(picked) && picked > now + 60_000) {
      return { ok: false, error: "Date can't be in the future." }
    }
  }
  return { ok: true, hours }
}

// YYYY-MM-DD for the editor's timezone, suitable for <input type="date"> defaults.
export function todayInputValue(timeZone: string, now: number = Date.now()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).formatToParts(new Date(now))
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970'
  const month = parts.find((part) => part.type === 'month')?.value ?? '01'
  const day = parts.find((part) => part.type === 'day')?.value ?? '01'
  return `${year}-${month}-${day}`
}
