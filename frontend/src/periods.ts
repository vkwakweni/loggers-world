import { formatDate } from './formatDate'

export type PeriodKind = 'week' | 'month'

export interface Period {
  // Inclusive `YYYY-MM-DD` bounds, in the user's local calendar.
  start: string
  end: string
  label: string
}

function iso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// The last `count` periods ending with the current one, oldest first. Weeks
// run Monday to Sunday; months run first to last day. Neighbouring periods
// never overlap, so their counts can be stacked without double-counting.
export function lastPeriods(kind: PeriodKind, now: Date = new Date(), count = 6): Period[] {
  const periods: Period[] = []

  for (let i = count - 1; i >= 0; i--) {
    let start: Date
    let end: Date

    if (kind === 'week') {
      const mondayOffset = (now.getDay() + 6) % 7
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset - 7 * i)
      end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)
    } else {
      start = new Date(now.getFullYear(), now.getMonth() - i, 1)
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
    }

    const [day, month, year] = formatDate(iso(start)).split(' ')
    const label =
      kind === 'week' ? `${day} ${month}` : start.getFullYear() === now.getFullYear() ? month : `${month} ${year}`

    periods.push({ start: iso(start), end: iso(end), label })
  }

  return periods
}
