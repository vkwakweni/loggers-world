import { describe, expect, it } from 'vitest'
import { categoryDimension, stackByCategory, OTHER } from './categoryByPeriod'

describe('stackByCategory', () => {
  it('orders categories alphabetically and totals each period', () => {
    const result = stackByCategory([
      { label: 'a', counts: { Movies: 1, Books: 2 } },
      { label: 'b', counts: { Books: 1 } },
    ])
    expect(result.categories).toEqual(['Books', 'Movies'])
    expect(result.periods[0].segments).toEqual([
      { category: 'Books', count: 2 },
      { category: 'Movies', count: 1 },
    ])
    expect(result.periods.map((p) => p.total)).toEqual([3, 1])
    expect(result.max).toBe(3)
  })

  it('folds the smallest categories into Other past the series cap', () => {
    const result = stackByCategory([{ label: 'a', counts: { A: 5, B: 4, C: 1, D: 2 } }], 2)
    expect(result.categories).toEqual(['A', 'B', OTHER])
    expect(result.periods[0].segments.at(-1)).toEqual({ category: OTHER, count: 3 })
    expect(result.periods[0].total).toBe(12)
  })

  it('has no Other when everything fits, and handles empty data', () => {
    expect(stackByCategory([{ label: 'a', counts: { A: 1 } }]).categories).toEqual(['A'])
    const empty = stackByCategory([{ label: 'a', counts: {} }])
    expect(empty.categories).toEqual([])
    expect(empty.max).toBe(0)
  })

  it('ignores zero counts', () => {
    expect(stackByCategory([{ label: 'a', counts: { A: 0, B: 1 } }]).categories).toEqual(['B'])
  })
})

describe('categoryDimension', () => {
  const stats = (names: [string, string[]][]) => ({
    range: { from: '', to: '' },
    totalEntries: 0,
    dimensions: names.map(([name, values]) => ({ name, buckets: values.map((value) => ({ value, count: 1 })) })),
  })

  it('prefers a dimension named category', () => {
    expect(categoryDimension(stats([['date', ['2026-01-01']], ['Category', ['Books']]]))?.name).toBe('Category')
  })
  it('falls back to the first non-date dimension', () => {
    expect(categoryDimension(stats([['when', ['2026-01-01']], ['kind', ['x']]]))?.name).toBe('kind')
  })
  it('returns undefined when only dates exist', () => {
    expect(categoryDimension(stats([['date', ['2026-01-01T10:00:00Z']]]))).toBeUndefined()
  })
})
