import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { getLogType, listLogEntries, deleteLogEntry, type LogType, type LogEntry } from '../api'
import { ErrorMessage, LoadingMessage } from '../components/StatusMessage'

function LogTypeEntries() {
  const { typeId } = useParams<{ typeId: string }>()
  const { getAccessToken } = useAuth()

  const [logType, setLogType] = useState<LogType | null>(null)
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
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
        setError(err instanceof Error ? err.message : 'Could not load entries')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [getAccessToken, typeId])

  async function handleDelete(entry: LogEntry) {
    if (!typeId) return
    if (!confirm('Delete this entry? This action cannot be undone.')) return

    try {
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('Not signed in')

      await deleteLogEntry(accessToken, typeId, entry.createdAt)
      setEntries((prev) => prev.filter((e) => e.entryId !== entry.entryId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete entry')
    }
  }

  if (loading) return <LoadingMessage />
  if (error) return <ErrorMessage>{error}</ErrorMessage>
  if (!logType || !typeId) return null

  return (
    <div className="page wide">
      <h1>{logType.name} Entries</h1>
      <Link to={`/log-types/${typeId}/entries/new`} className="btn btn-primary">
        <Plus size={16} aria-hidden="true" /> Add entry
      </Link>

      {entries.length === 0 ? (
        <p className="empty-state">No entries yet.</p>
      ) : (
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
                {logType.fields.map((field) => (
                  <td key={field.name}>{entry.fields[field.name] ?? ''}</td>
                ))}
                <td>
                  <Link to={`/log-types/${typeId}/entries/${encodeURIComponent(entry.createdAt)}/edit`}>
                    <Pencil size={16} aria-hidden="true" /> Edit
                  </Link>
                </td>
                <td>
                  <button type="button" className="btn-danger" onClick={() => handleDelete(entry)}>
                    <Trash2 size={16} aria-hidden="true" /> Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default LogTypeEntries
