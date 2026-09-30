import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getStats, type ChorusStats } from '../chorus'
import { categoryDimension, stackByCategory, OTHER, type StackedSeries } from '../categoryByPeriod'
import { lastPeriods, type PeriodKind } from '../periods'
import { ErrorMessage } from './StatusMessage'

const WIDTH = 560
const HEIGHT = 240
const MARGIN = { top: 22, right: 8, bottom: 28, left: 32 }
const BAR_WIDTH = 24
const GAP = 2
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom

function seriesColour(category: string, categories: string[]): string {
  if (category === OTHER) return 'var(--series-other)'
  return `var(--series-${categories.indexOf(category) + 1})`
}

// Whole-number ticks, at most ~4 intervals, topping out at or above `max`.
function niceTicks(max: number): number[] {
  const top = Math.max(1, max)
  const step = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].find((s) => top / s <= 4) ?? Math.ceil(top / 4)
  const ticks: number[] = []
  for (let v = 0; v < top + step; v += step) {
    ticks.push(v)
    if (v >= top) break
  }
  return ticks
}

// Square at the baseline, 4px-rounded at the data end.
function roundedTop(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, h, w / 2)
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
}

interface Props {
  // Overrides the real /stats call, for tests and previews.
  loadStats?: (range: { from: string; to: string }) => Promise<ChorusStats>
}

export default function CategoryByPeriodChart({ loadStats }: Props) {
  const { getAccessToken } = useAuth()
  const [kind, setKind] = useState<PeriodKind>('week')
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const [series, setSeries] = useState<StackedSeries | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    async function load() {
      try {
        const token = loadStats ? '' : await getAccessToken()
        if (!token && !loadStats) throw new Error('Not signed in')
        const periods = lastPeriods(kind)
        // One /stats call per period. Bounds are inclusive and the periods never
        // overlap, so the per-period counts can be stacked as they are.
        const results = await Promise.all(
          periods.map((p) => (loadStats ?? ((range) => getStats(token!, range)))({ from: p.start, to: p.end })),
        )
        if (cancelled) return

        setSeries(
          stackByCategory(
            periods.map((p, i) => {
              const dimension = categoryDimension(results[i])
              return {
                label: p.label,
                counts: Object.fromEntries((dimension?.buckets ?? []).map((b) => [b.value, b.count])),
              }
            }),
          ),
        )
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the breakdown')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [getAccessToken, kind, loadStats])

  const ticks = niceTicks(series?.max ?? 0)
  const yMax = ticks[ticks.length - 1]
  const y = (value: number) => MARGIN.top + PLOT_H - (value / yMax) * PLOT_H
  const slot = series ? PLOT_W / series.periods.length : PLOT_W
  const hovered = hover !== null && series ? series.periods[hover] : null

  return (
    <div className="cat-chart">
      <div className="cat-chart-controls">
        <div className="segmented" role="group" aria-label="Group by">
          {(['week', 'month'] as const).map((option) => (
            <button key={option} type="button" aria-pressed={kind === option} onClick={() => setKind(option)}>
              {option === 'week' ? 'Weekly' : 'Monthly'}
            </button>
          ))}
        </div>
        <div className="segmented" role="group" aria-label="View">
          {(['chart', 'table'] as const).map((option) => (
            <button key={option} type="button" aria-pressed={view === option} onClick={() => setView(option)}>
              {option === 'chart' ? 'Chart' : 'Table'}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {series && series.categories.length === 0 && !error && (
        <p className="empty-state">Nothing logged in these {kind === 'week' ? 'weeks' : 'months'} yet.</p>
      )}

      {series && series.categories.length > 0 && (
        <div className={loading ? 'cat-chart-body is-loading' : 'cat-chart-body'}>
          {series.categories.length > 1 && (
            <div className="chart-legend">
              {series.categories.map((category) => (
                <span key={category} className="chart-legend-item">
                  <span className="chart-swatch" style={{ background: seriesColour(category, series.categories) }} />
                  {category}
                </span>
              ))}
            </div>
          )}

          {view === 'chart' ? (
            <div className="chart-frame">
              <div className="chart-inner">
              <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Entries per ${kind} by category`}>
                {ticks.map((tick) => (
                  <g key={tick}>
                    <line className="chart-grid" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(tick)} y2={y(tick)} />
                    <text className="chart-axis" x={MARGIN.left - 6} y={y(tick)} textAnchor="end" dominantBaseline="middle">
                      {tick}
                    </text>
                  </g>
                ))}

                {series.periods.map((period, index) => {
                  const centre = MARGIN.left + slot * index + slot / 2
                  const x = centre - BAR_WIDTH / 2
                  let cumulative = 0

                  return (
                    <g
                      key={period.label + index}
                      className={hover === index ? 'chart-column is-hovered' : 'chart-column'}
                      tabIndex={0}
                      aria-label={`${period.label}: ${period.total} ${period.total === 1 ? 'entry' : 'entries'}`}
                      onPointerEnter={() => setHover(index)}
                      onPointerLeave={() => setHover(null)}
                      onFocus={() => setHover(index)}
                      onBlur={() => setHover(null)}
                    >
                      {/* Hit target: the whole slot, far wider and taller than the bar. */}
                      <rect x={centre - slot / 2} y={MARGIN.top} width={slot} height={PLOT_H} fill="transparent" />

                      {period.segments.map((segment, i) => {
                        const top = y(cumulative + segment.count)
                        const bottom = y(cumulative)
                        cumulative += segment.count
                        const isTop = i === period.segments.length - 1
                        // The 2px surface gap sits under every segment except the bottom one.
                        const height = Math.max(1, bottom - top - (i > 0 ? GAP : 0))
                        const fill = seriesColour(segment.category, series.categories)
                        return isTop ? (
                          <path key={segment.category} d={roundedTop(x, top, BAR_WIDTH, height)} fill={fill} />
                        ) : (
                          <rect key={segment.category} x={x} y={top} width={BAR_WIDTH} height={height} fill={fill} />
                        )
                      })}

                      {period.total > 0 && (
                        <text className="chart-total" x={centre} y={y(period.total) - 6} textAnchor="middle">
                          {period.total}
                        </text>
                      )}
                      <text className="chart-axis" x={centre} y={HEIGHT - 8} textAnchor="middle">
                        {period.label}
                      </text>
                    </g>
                  )
                })}
              </svg>

              {hovered && hover !== null && (
                <div
                  className="chart-tooltip"
                  role="status"
                  style={{
                    left: `${((MARGIN.left + slot * hover + slot / 2) / WIDTH) * 100}%`,
                  }}
                >
                  <p className="chart-tooltip-title">{hovered.label}</p>
                  {hovered.segments.length === 0 && <p className="chart-tooltip-row">Nothing logged</p>}
                  {[...hovered.segments].reverse().map((segment) => (
                    <p key={segment.category} className="chart-tooltip-row">
                      <span className="chart-line-key" style={{ background: seriesColour(segment.category, series.categories) }} />
                      <strong>{segment.count}</strong>
                      <span>{segment.category}</span>
                    </p>
                  ))}
                </div>
              )}
              </div>
            </div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{kind === 'week' ? 'Week of' : 'Month'}</th>
                    {series.categories.map((category) => (
                      <th key={category}>{category}</th>
                    ))}
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {series.periods.map((period, index) => (
                    <tr key={period.label + index}>
                      <td>{period.label}</td>
                      {series.categories.map((category) => (
                        <td key={category}>{period.segments.find((s) => s.category === category)?.count ?? 0}</td>
                      ))}
                      <td>{period.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
