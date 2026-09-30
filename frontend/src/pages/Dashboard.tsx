import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { Plus, Eye, EyeOff, Trash2, ArrowRight, Bird, X, Sprout } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { listLogTypes, listLogEntries, archiveLogType, deleteLogType, NetworkError, type LogType } from '../api'
import { ErrorMessage, LoadingMessage } from '../components/StatusMessage'
import OfflineMessage from '../components/OfflineMessage'
import RowMenu from '../components/RowMenu'
import { useDelayedLoading } from '../hooks/useDelayedLoading'
import { useOnlineRetry } from '../hooks/useOnlineRetry'
import { ICON_SM, ICON_MD, ICON_LG } from '../iconSizes'
import { isChorusEnabled } from '../chorus'
import { relativeDay } from '../relativeDate'
import { logTypeIcon, logTypeHue } from '../logTypeStyle'

const TEASER_DISMISSED_KEY = 'wonderTeaserDismissed'

function readTeaserDismissed(): boolean {
  try {
    return localStorage.getItem(TEASER_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

function Dashboard() {
  const [teaserDismissed, setTeaserDismissed] = useState(readTeaserDismissed)

  function dismissTeaser() {
    setTeaserDismissed(true)
    try {
      localStorage.setItem(TEASER_DISMISSED_KEY, '1')
    } catch {
      // Storage blocked: dismissal just lasts until the next page load.
    }
  }

  const { getAccessToken } = useAuth()
  const [logTypes, setLogTypes] = useState<LogType[]>([])
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [summaries, setSummaries] = useState<Record<string, { count: number; last?: string }>>({})
  const [networkError, setNetworkError] = useState(false)
  const showLoading = useDelayedLoading(loading)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNetworkError(false)
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('Not signed in')
      const types = await listLogTypes(accessToken)
      setLogTypes(types)
      // Fire-and-forget: cards render immediately, summaries fill in as they
      // arrive, and a failed fetch just leaves that card without a summary.
      types.forEach((t) =>
        listLogEntries(accessToken, t.typeId)
          .then((entries) =>
            setSummaries((prev) => ({ ...prev, [t.typeId]: { count: entries.length, last: entries[0]?.createdAt } })),
          )
          .catch(() => {}),
      )
    } catch (err) {
      if (err instanceof NetworkError) {
        setNetworkError(true)
      } else {
        setError(err instanceof Error ? err.message : 'Could not load log types')
      }
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  useEffect(() => {
    load()
  }, [load])

  useOnlineRetry(load)

  async function handleArchiveToggle(logType: LogType) {
    setActionError(null)
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('Not signed in')

      const updated = await archiveLogType(accessToken, logType.typeId, !logType.archived)
      setLogTypes((prev) => prev.map((t) => (t.typeId === updated.typeId ? updated : t)))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update log type')
    }
  }

  async function handleDelete(logType: LogType) {
    if (!confirm(`Delete "${logType.name}"? This deletes all its entries too. This action cannot be undone.`)) return

    setActionError(null)
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('Not signed in')

      await deleteLogType(accessToken, logType.typeId)
      setLogTypes((prev) => prev.filter((t) => t.typeId !== logType.typeId))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete log type')
    }
  }

  if (networkError) return <OfflineMessage />

  const activeTypes = logTypes.filter((t) => !t.archived)
  const archivedTypes = logTypes.filter((t) => t.archived)

  function renderLogTypeList(types: LogType[], withNewTile = false) {
    if (types.length === 0) return null

    return (
      <ul className="type-grid">
        {types.map((logType) => {
          const Icon = logTypeIcon(logType.name)
          const fieldCount = logType.fields.length
          const summary = summaries[logType.typeId]
          return (
            <li
              key={logType.typeId}
              className={logType.archived ? 'type-card archived' : 'type-card'}
              style={{ '--hue': logTypeHue(logType.name) } as CSSProperties}
            >
              <Link to={`/log-types/${logType.typeId}`} className="type-card-link">
                <span className="type-card-icon">
                  <Icon size={ICON_MD} aria-hidden="true" />
                </span>
                <span className="type-card-name">{logType.name}</span>
                <span className="type-card-meta">
                  {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
                </span>
                {summary && (
                  <span className="type-card-stats">
                    <strong>{summary.count}</strong> {summary.count === 1 ? 'entry' : 'entries'}
                    <span aria-hidden="true"> · </span>
                    {summary.last ? `last logged ${relativeDay(summary.last)}` : 'nothing logged yet'}
                  </span>
                )}
              </Link>
              <RowMenu label={`Actions for ${logType.name}`}>
                <button
                  type="button"
                  className="btn-icon"
                  aria-label={logType.archived ? 'Unarchive' : 'Archive'}
                  onClick={() => handleArchiveToggle(logType)}
                >
                  {logType.archived ? (
                    <>
                      <Eye size={ICON_SM} aria-hidden="true" /> <span className="btn-label">Unarchive</span>
                    </>
                  ) : (
                    <>
                      <EyeOff size={ICON_SM} aria-hidden="true" /> <span className="btn-label">Archive</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn-icon btn-danger"
                  aria-label="Delete"
                  onClick={() => handleDelete(logType)}
                >
                  <Trash2 size={ICON_SM} aria-hidden="true" /> <span className="btn-label">Delete</span>
                </button>
              </RowMenu>
            </li>
          )
        })}
        {withNewTile && (
          <li className="type-card type-card-new">
            <Link to="/log-types/new" className="type-card-link">
              <span className="type-card-icon">
                <Plus size={ICON_MD} aria-hidden="true" />
              </span>
              <span className="type-card-name">New log type</span>
              <span className="type-card-meta">Track something new</span>
            </Link>
          </li>
        )}
      </ul>
    )
  }

  return (
    <div className="page wide">
      <div className="page-header">
        <h1>Your world</h1>
        <Link to="/log-types/new" className="btn btn-primary">
          <Plus size={ICON_SM} aria-hidden="true" /> New Log Type
        </Link>
      </div>
      {isChorusEnabled && !teaserDismissed && (
        <div className="chorus-teaser">
          <Link to="/wonder" className="chorus-teaser-link">
            <Bird size={ICON_MD} aria-hidden="true" />
            <span>
              <strong>Curious about your logs?</strong>
              <small>Wonder away. Nothing is shared until you say so.</small>
            </span>
            <ArrowRight size={ICON_MD} aria-hidden="true" />
          </Link>
          <button type="button" className="btn-icon" aria-label="Dismiss" onClick={dismissTeaser}>
            <X size={ICON_SM} aria-hidden="true" />
          </button>
        </div>
      )}
      <section>
        <h2>My Log Types</h2>
        {showLoading && <LoadingMessage />}
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {actionError && <ErrorMessage>{actionError}</ErrorMessage>}
        {!loading && !error && activeTypes.length === 0 && (
          <div className="empty-hero">
            <Sprout size={ICON_LG} aria-hidden="true" />
            <h3>Nothing growing here yet</h3>
            <p>Create your first log type, say Books or Workouts, then start adding entries.</p>
            <Link to="/log-types/new" className="btn btn-primary">
              <Plus size={ICON_SM} aria-hidden="true" /> Create a log type
            </Link>
          </div>
        )}
        {activeTypes.length > 0 && renderLogTypeList(activeTypes, true)}
      </section>
      {archivedTypes.length > 0 && (
        <section>
          <h2>Archived</h2>
          {renderLogTypeList(archivedTypes)}
        </section>
      )}
    </div>
  )
}

export default Dashboard
