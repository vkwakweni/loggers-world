import { describe, expect, it } from 'vitest'
import { relativeDay } from './relativeDate'

const now = new Date(2026, 8, 30, 12)

describe('relativeDay', () => {
  it('handles today and yesterday by calendar day', () => {
    expect(relativeDay(new Date(2026, 8, 30, 1).toISOString(), now)).toBe('today')
    expect(relativeDay(new Date(2026, 8, 29, 23).toISOString(), now)).toBe('yesterday')
  })
  it('scales through days, weeks, months and years', () => {
    expect(relativeDay(new Date(2026, 8, 27).toISOString(), now)).toBe('3 days ago')
    expect(relativeDay(new Date(2026, 8, 16).toISOString(), now)).toBe('2w ago')
    expect(relativeDay(new Date(2026, 5, 30).toISOString(), now)).toBe('3mo ago')
    expect(relativeDay(new Date(2024, 8, 30).toISOString(), now)).toBe('2y ago')
  })
  it('returns empty for invalid input', () => {
    expect(relativeDay('nope', now)).toBe('')
  })
})
