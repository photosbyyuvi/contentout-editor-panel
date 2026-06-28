export type HoursValidation =
  | { ok: true; hours: number }
  | { ok: false; error: string }

// Part F — reject empty, zero, negative, non-numeric, or >24/day; future dates rejected.
// Dates are compared at day granularity (YYYY-MM-DD) in the editor's timezone, so logging
// "today" is always allowed regardless of the time of day.
export function validateHours(
  raw: string,
  dateInput: string,
  todayInput: string,
): HoursValidation {
  const trimmed = raw.trim()
  if (trimmed.length === 0) {
    return { ok: false, error: 'Enter hours between 0.1 and 24.' }
  }
  const hours = Number(trimmed)
  if (!Number.isFinite(hours) || hours < 0.1 || hours > 24) {
    return { ok: false, error: 'Enter hours between 0.1 and 24.' }
  }
  if (dateInput && todayInput && dateInput > todayInput) {
    return { ok: false, error: "Date can't be in the future." }
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
