import { describe, expect, it } from 'vitest'
import { formatDate, isoDay } from './formatDate'

describe('formatDate', () => {
  it('formats ISO dates as "30 Sep 2026"', () => {
    expect(formatDate('2026-09-30')).toBe('30 Sep 2026')
  })
  it('drops the leading zero on the day', () => {
    expect(formatDate('2026-01-05')).toBe('5 Jan 2026')
  })
  it('handles leap days', () => {
    expect(formatDate('2024-02-29')).toBe('29 Feb 2024')
  })
  it('returns the raw value for impossible dates', () => {
    expect(formatDate('2026-02-30')).toBe('2026-02-30')
    expect(formatDate('2026-13-01')).toBe('2026-13-01')
  })
  it('returns the raw value for anything else', () => {
    expect(formatDate('')).toBe('')
    expect(formatDate('yesterday')).toBe('yesterday')
    expect(formatDate('2026-09-30T10:00:00Z')).toBe('2026-09-30T10:00:00Z')
  })
})

describe('isoDay', () => {
  it('extracts the day from dates and timestamps', () => {
    expect(isoDay('2026-07-27')).toBe('2026-07-27')
    expect(isoDay('2026-07-27T10:15:00.000Z')).toBe('2026-07-27')
  })
  it('returns null for non-dates', () => {
    expect(isoDay('Books')).toBeNull()
    expect(isoDay('')).toBeNull()
    expect(isoDay('12026-07-27')).toBeNull()
  })
})
