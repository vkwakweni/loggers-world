import { describe, expect, it } from 'vitest'
import { lastPeriods } from './periods'

// Wednesday 30 September 2026
const now = new Date(2026, 8, 30, 12)

describe('lastPeriods', () => {
  it('returns Monday-to-Sunday weeks ending with the current one, oldest first', () => {
    const weeks = lastPeriods('week', now, 3)
    expect(weeks.map((w) => [w.start, w.end])).toEqual([
      ['2026-09-14', '2026-09-20'],
      ['2026-09-21', '2026-09-27'],
      ['2026-09-28', '2026-10-04'],
    ])
    expect(weeks[2].label).toBe('28 Sep')
  })

  it('returns whole calendar months, handling the year boundary', () => {
    const months = lastPeriods('month', new Date(2026, 1, 10), 3)
    expect(months.map((m) => [m.start, m.end])).toEqual([
      ['2025-12-01', '2025-12-31'],
      ['2026-01-01', '2026-01-31'],
      ['2026-02-01', '2026-02-28'],
    ])
    expect(months.map((m) => m.label)).toEqual(['Dec 2025', 'Jan', 'Feb'])
  })

  it('never overlaps neighbouring periods', () => {
    for (const kind of ['week', 'month'] as const) {
      const periods = lastPeriods(kind, now, 6)
      periods.slice(1).forEach((p, i) => expect(p.start > periods[i].end).toBe(true))
    }
  })

  it('treats Sunday as the last day of its week', () => {
    const sunday = new Date(2026, 8, 27, 9)
    expect(lastPeriods('week', sunday, 1)[0]).toMatchObject({ start: '2026-09-21', end: '2026-09-27' })
  })
})
