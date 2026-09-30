import { isoDay } from './formatDate'
import type { ChorusDimension, ChorusStats } from './chorus'

export interface PeriodCounts {
  label: string
  counts: Record<string, number>
}

export interface StackedPeriod {
  label: string
  segments: { category: string; count: number }[]
  total: number
}

export interface StackedSeries {
  // Plotted categories in a fixed (alphabetical) order, so a category keeps
  // its colour however the counts change; "Other" is appended when used.
  categories: string[]
  periods: StackedPeriod[]
  max: number
}

export const OTHER = 'Other'

// The dimension to segment by: one named "category" if there is one, else the
// first that isn't a date dimension.
export function categoryDimension(stats: ChorusStats): ChorusDimension | undefined {
  const byName = stats.dimensions.find((d) => d.name.toLowerCase() === 'category')
  if (byName) return byName
  return stats.dimensions.find((d) => !d.buckets.every((b) => isoDay(b.value)))
}

export function stackByCategory(periods: PeriodCounts[], maxSeries = 6): StackedSeries {
  const totals = new Map<string, number>()
  for (const p of periods) {
    for (const [category, count] of Object.entries(p.counts)) {
      if (count > 0) totals.set(category, (totals.get(category) ?? 0) + count)
    }
  }

  const kept = [...totals.entries()]
    .sort(([nameA, a], [nameB, b]) => b - a || nameA.localeCompare(nameB))
    .slice(0, maxSeries)
    .map(([name]) => name)
    .sort((a, b) => a.localeCompare(b))
  const keptSet = new Set(kept)
  const usesOther = totals.size > kept.length

  const stacked = periods.map((p) => {
    const segments: { category: string; count: number }[] = []
    for (const category of kept) {
      const count = p.counts[category] ?? 0
      if (count > 0) segments.push({ category, count })
    }
    const other = Object.entries(p.counts)
      .filter(([category, count]) => !keptSet.has(category) && count > 0)
      .reduce((sum, [, count]) => sum + count, 0)
    if (other > 0) segments.push({ category: OTHER, count: other })

    return { label: p.label, segments, total: segments.reduce((sum, s) => sum + s.count, 0) }
  })

  return {
    categories: usesOther ? [...kept, OTHER] : kept,
    periods: stacked,
    max: Math.max(0, ...stacked.map((p) => p.total)),
  }
}
