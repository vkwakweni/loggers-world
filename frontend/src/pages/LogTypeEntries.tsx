import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Pencil, Trash2, Plus, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import {
  getLogType,
  listLogEntries,
  deleteLogEntry,
  archiveLogType,
  deleteLogType,
  NetworkError,
  type LogType,
  type LogEntry,
} from '../api'
import { ErrorMessage, LoadingMessage } from '../components/StatusMessage'
import { formatDate } from '../formatDate'
import OfflineMessage from '../components/OfflineMessage'
import RowMenu from '../components/RowMenu'
import { useDelayedLoading } from '../hooks/useDelayedLoading'
import { useOnlineRetry } from '../hooks/useOnlineRetry'
import { ICON_SM } from '../iconSizes'

function LogTypeEntries() {
  const { typeId } = useParams<{ typeId: string }>()
  const { getAccessToken } = useAuth()
  const navigate = useNavigate()

  const [logType, setLogType] = useState<LogType | null>(null)
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [networkError, setNetworkError] = useState(false)
  const showLoading = useDelayedLoading(loading)
  const [error, setError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNetworkError(false)
    try {
      const accessToken = await getAccessToken()
      if (!accessToken || !typeId) throw new Error('Not signed in')

      const [type, entryList] = await Promise.all([
        getLogType(accessToken, typeId),
        listLogEntries(accessToken, typeId),
      ])
      setLogType(type)
      setEntries(entryList)
    } catch (err) {
      if (err instanceof NetworkError) {
        setNetworkError(true)
      } else {
        setError(err instanceof Error ? err.message : 'Could not load entries')
      }
    } finally {
      setLoading(false)
    }
  }, [getAccessToken, typeId])

  useEffect(() => {
    load()
  }, [load])

  useOnlineRetry(load)

  async function handleDelete(entry: LogEntry) {
    if (!typeId) return
    if (!confirm('Delete this entry? This action cannot be undone.')) return

    setDeleteError(null)
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('Not signed in')

      await deleteLogEntry(accessToken, typeId, entry.createdAt)
      setEntries((prev) => prev.filter((e) => e.entryId !== entry.entryId))
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete entry')
    }
  }

  async function handleArchiveToggle() {
    if (!logType) return

    setActionError(null)
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('Not signed in')

      setLogType(await archiveLogType(accessToken, logType.typeId, !logType.archived))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update log type')
    }
  }

  async function handleTypeDelete() {
    if (!logType) return
    if (!confirm(`Delete "${logType.name}"? This deletes all its entries too. This action cannot be undone.`)) return

    setActionError(null)
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('Not signed in')

      await deleteLogType(accessToken, logType.typeId)
      navigate('/dashboard')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete log type')
    }
  }

  if (loading) return showLoading ? <LoadingMessage /> : null
  if (networkError) return <OfflineMessage />
  if (error) return <ErrorMessage>{error}</ErrorMessage>
  if (!logType || !typeId) return null

  return (
    <div className="page wide">
      <div className="page-header">
        <h1>{logType.name} Entries</h1>
        <RowMenu label={`Actions for ${logType.name}`}>
          <button
            type="button"
            className="btn-icon"
            aria-label={logType.archived ? 'Unarchive' : 'Archive'}
            onClick={handleArchiveToggle}
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
          <button type="button" className="btn-icon btn-danger" aria-label="Delete" onClick={handleTypeDelete}>
            <Trash2 size={ICON_SM} aria-hidden="true" /> <span className="btn-label">Delete</span>
          </button>
        </RowMenu>
      </div>
      <Link to={`/log-types/${typeId}/entries/new`} className="btn btn-primary">
        <Plus size={ICON_SM} aria-hidden="true" /> Add entry
      </Link>

      {actionError && <ErrorMessage>{actionError}</ErrorMessage>}
      {deleteError && <ErrorMessage>{deleteError}</ErrorMessage>}

      {entries.length === 0 ? (
        <p className="empty-state">No entries yet.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {logType.fields.map((field) => (
                  <th key={field.name}>{field.name}</th>
                ))}
                <th>Edit</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.entryId}>
                  {logType.fields.map((field) => {
                    const raw = entry.fields[field.name] ?? ''
                    const value = field.type === 'date' ? formatDate(String(raw)) : raw
                    return (
                      <td key={field.name} className="truncate" title={String(value)}>
                        {value}
                      </td>
                    )
                  })}
                  <td>
                    <Link
                      to={`/log-types/${typeId}/entries/${encodeURIComponent(entry.createdAt)}/edit`}
                      className="btn"
                      aria-label="Edit"
                    >
                      <Pencil size={ICON_SM} aria-hidden="true" />
                    </Link>
                  </td>
                  <td>
                    <button type="button" className="btn-danger" aria-label="Delete" onClick={() => handleDelete(entry)}>
                      <Trash2 size={ICON_SM} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default LogTypeEntries
