import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router'
import { Bird, ShieldCheck, ShieldOff, Send, Database } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { NetworkError } from '../api'
import {
  ask,
  getConsent,
  getStats,
  setConsent,
  isChorusEnabled,
  ConsentRequiredError,
  type ChorusAnswer,
  type ChorusBucket,
  type ChorusConsent,
  type ChorusStats,
} from '../chorus'
import { ErrorMessage, LoadingMessage } from '../components/StatusMessage'
import { formatDate, isoDay } from '../formatDate'
import CategoryByPeriodChart from '../components/CategoryByPeriodChart'
import OfflineMessage from '../components/OfflineMessage'
import { useDelayedLoading } from '../hooks/useDelayedLoading'
import { useOnlineRetry } from '../hooks/useOnlineRetry'
import { ICON_SM, ICON_MD } from '../iconSizes'

const SUGGESTIONS = [
  'How many entries did I log this month?',
  'Which category do I log most?',
  'How active was I last week?',
]

// Date dimensions arrive with one bucket per saved timestamp. Merge those into
// one bar per calendar day, newest first; any other dimension shows its
// biggest buckets first.
function summariseBuckets(buckets: ChorusBucket[]): ChorusBucket[] {
  const isDateDimension = buckets.length > 0 && buckets.every((b) => isoDay(b.value))
  if (!isDateDimension) return [...buckets].sort((a, b) => b.count - a.count).slice(0, 6)

  const perDay = new Map<string, number>()
  for (const b of buckets) {
    const day = isoDay(b.value)!
    perDay.set(day, (perDay.get(day) ?? 0) + b.count)
  }
  return [...perDay.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 6)
    .map(([day, count]) => ({ value: formatDate(day), count }))
}

function StatsBars({ stats }: { stats: ChorusStats }) {
  return (
    <div className="stats-grid">
      {stats.dimensions.map((dimension) => {
        const top = summariseBuckets(dimension.buckets)
        const max = Math.max(1, ...top.map((b) => b.count))
        return (
          <div key={dimension.name} className="stats-card">
            <h3>By {dimension.name}</h3>
            {top.length === 0 ? (
              <p className="empty-state">Nothing to show yet.</p>
            ) : (
              <ul className="bar-list">
                {top.map((bucket) => (
                  <li key={bucket.value}>
                    <span className="bar-label" title={bucket.value}>
                      {bucket.value}
                    </span>
                    <span className="bar-track">
                      <span className="bar-fill" style={{ width: `${(bucket.count / max) * 100}%` }} />
                    </span>
                    <span className="bar-count">{bucket.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Chorus() {
  const { getAccessToken } = useAuth()
  const [stats, setStats] = useState<ChorusStats | null>(null)
  const [consent, setConsentState] = useState<ChorusConsent | null>(null)
  const [loading, setLoading] = useState(true)
  const [networkError, setNetworkError] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [consentBusy, setConsentBusy] = useState(false)
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [answer, setAnswer] = useState<ChorusAnswer | null>(null)
  const [askError, setAskError] = useState<string | null>(null)
  const showLoading = useDelayedLoading(loading)

  const requireToken = useCallback(async () => {
    const token = await getAccessToken()
    if (!token) throw new Error('Not signed in')
    return token
  }, [getAccessToken])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNetworkError(false)
    try {
      const token = await requireToken()
      const [nextStats, nextConsent] = await Promise.all([getStats(token), getConsent(token)])
      setStats(nextStats)
      setConsentState(nextConsent)
    } catch (err) {
      if (err instanceof NetworkError) setNetworkError(true)
      else setError(err instanceof Error ? err.message : 'Could not reach the answers service')
    } finally {
      setLoading(false)
    }
  }, [requireToken])

  useEffect(() => {
    load()
  }, [load])

  useOnlineRetry(load)

  async function handleConsent(granted: boolean) {
    setConsentBusy(true)
    setAskError(null)
    try {
      setConsentState(await setConsent(await requireToken(), granted))
      if (!granted) setAnswer(null)
    } catch (err) {
      setAskError(err instanceof Error ? err.message : 'Could not update consent')
    } finally {
      setConsentBusy(false)
    }
  }

  async function submitQuestion(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    setAsking(true)
    setAskError(null)
    setAnswer(null)
    try {
      setAnswer(await ask(await requireToken(), trimmed))
    } catch (err) {
      if (err instanceof ConsentRequiredError) {
        setConsentState({ granted: false })
        setAskError('Consent is required before answers can be given.')
      } else {
        // The service's catch-all 500 says nothing useful; the usual cause is
        // the AI provider being briefly unavailable or rate-limited.
        const message = err instanceof Error ? err.message : ''
        setAskError(
          !message || message === 'An unexpected error occurred.'
            ? 'The answer service hit a snag, possibly a busy AI provider. Give it a moment and try again.'
            : message,
        )
      }
    } finally {
      setAsking(false)
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    submitQuestion(question)
  }

  if (!isChorusEnabled) return <Navigate to="/dashboard" replace />
  if (networkError) return <OfflineMessage />

  const granted = consent?.granted ?? false

  return (
    <div className="page wide chorus">
      <header className="chorus-hero">
        <Bird size={ICON_MD} aria-hidden="true" />
        <div>
          <h1>Wonder aloud</h1>
          <p>Wonder about your logs in your own words. Only totals and counts are ever shared, never what you wrote in your entries.</p>
        </div>
      </header>

      {showLoading && <LoadingMessage />}
      {error && (
        <ErrorMessage>
          {error}. Is the answers service running and allowed to accept requests from this site?
        </ErrorMessage>
      )}

      {!loading && !error && stats && (
        <>
          <section className={granted ? 'consent-card granted' : 'consent-card'}>
            <div className="consent-icon">
              {granted ? <ShieldCheck size={ICON_MD} aria-hidden="true" /> : <ShieldOff size={ICON_MD} aria-hidden="true" />}
            </div>
            <div className="consent-body">
              <h2>{granted ? 'Answers are on' : 'Answers are switched off'}</h2>
              <p>
                {granted
                  ? 'Your aggregated counts are sent to the AI provider whenever you put a question. Every question is recorded in an audit log, and you can revoke this at any time.'
                  : 'To answer a question, aggregated counts (never entry text) are sent to an AI provider. Nothing is sent until you allow it.'}
              </p>
            </div>
            <button type="button" disabled={consentBusy} onClick={() => handleConsent(!granted)} className={granted ? '' : 'btn-primary'}>
              {granted ? 'Revoke consent' : 'Allow answers'}
            </button>
          </section>

          <section>
            <h2>What are you wondering?</h2>
            <form className="ask-form" onSubmit={handleSubmit}>
              <div className="ask-input">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={granted ? 'e.g. How many entries did I log this month?' : 'Allow answers above to get started'}
                  aria-label="Your question"
                  disabled={!granted || asking}
                />
                <button type="submit" disabled={!granted || asking || !question.trim()}>
                  <Send size={ICON_SM} aria-hidden="true" /> {asking ? 'Thinking...' : 'Find out'}
                </button>
              </div>
              <div className="suggestions">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="chip"
                    disabled={!granted || asking}
                    onClick={() => {
                      setQuestion(suggestion)
                      submitQuestion(suggestion)
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </form>
            {askError && <ErrorMessage>{askError}</ErrorMessage>}
            {answer && (
              <div className="answer-card" aria-live="polite">
                <p className="answer-text">{answer.answer}</p>
                <p className="answer-provenance">
                  <Database size={ICON_SM} aria-hidden="true" /> Based on{' '}
                  {answer.dataUsed.statsQueried.length > 0 ? answer.dataUsed.statsQueried.join(', ') : 'your totals'} from{' '}
                  {formatDate(answer.dataUsed.range.from)} to {formatDate(answer.dataUsed.range.to)}
                </p>
              </div>
            )}
          </section>

          <section>
            <h2>What gets shared</h2>
            <p className="stats-summary">
              {stats.totalEntries} {stats.totalEntries === 1 ? 'entry' : 'entries'} between {formatDate(stats.range.from)} and {formatDate(stats.range.to)}
            </p>
            <StatsBars stats={stats} />
            <h3>Category over time</h3>
            <CategoryByPeriodChart />
            {stats.totalEntries === 0 && (
              <p className="empty-state">
                Nothing logged in this range yet. <Link to="/dashboard">Add some entries</Link> and they will show up here.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default Chorus
