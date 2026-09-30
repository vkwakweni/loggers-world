const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Entry date fields are stored as plain `YYYY-MM-DD`. Parsed by hand rather
// than via `new Date()`, which reads that form as UTC midnight and can shift
// the day backwards in timezones west of UTC. Month names are fixed English
// rather than `Intl`, so the display never varies with the browser's locale.
export function formatDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return value

  const [, year, month, day] = match
  const monthIndex = Number(month) - 1
  const probe = new Date(Number(year), monthIndex, Number(day))
  const isRealDate =
    probe.getFullYear() === Number(year) && probe.getMonth() === monthIndex && probe.getDate() === Number(day)
  if (!isRealDate) return value

  return `${Number(day)} ${MONTHS[monthIndex]} ${year}`
}

// The `YYYY-MM-DD` part of a date or ISO timestamp, or null for anything else.
// Takes the date as written (the timestamp's own calendar day), no timezone
// conversion.
export function isoDay(value: string): string | null {
  return /^\d{4}-\d{2}-\d{2}(T|$)/.test(value) ? value.slice(0, 10) : null
}
