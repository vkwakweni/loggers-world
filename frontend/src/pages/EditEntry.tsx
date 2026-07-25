import { useEffect, useState, type SubmitEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { getLogType, listLogEntries, updateLogEntry, type LogType, type LogEntry } from '../api'
import { ErrorMessage, LoadingMessage } from '../components/StatusMessage'

function EditEntry() {
  const { typeId, createdAt } = useParams<{ typeId: string; createdAt: string }>()
  const { getAccessToken } = useAuth()
  const navigate = useNavigate()

  const [logType, setLogType] = useState<LogType | null>(null)
  const [entry, setEntry] = useState<LogEntry | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const accessToken = await getAccessToken()
        if (!accessToken || !typeId || !createdAt) throw new Error('Not signed in')

        const [type, entries] = await Promise.all([
          getLogType(accessToken, typeId),
          listLogEntries(accessToken, typeId),
        ])
        const found = entries.find((e) => e.createdAt === createdAt)
        if (!found) throw new Error('Entry not found')

        setLogType(type)
        setEntry(found)
        setValues(
          Object.fromEntries(type.fields.map((field) => [field.name, String(found.fields[field.name] ?? '')])),
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load entry')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [getAccessToken, typeId, createdAt])

  function updateValue(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    setError(null)

    if (!logType || !typeId || !entry) return

    const fields: Record<string, string | number> = {}
    for (const field of logType.fields) {
      const raw = values[field.name]
      if (raw === undefined || raw === '') continue
      fields[field.name] = field.type === 'number' ? Number(raw) : raw
    }

    setSubmitting(true)
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('Not signed in')

      await updateLogEntry(accessToken, typeId, entry.createdAt, fields)
      navigate(`/log-types/${typeId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update entry')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingMessage />
  if (error && !logType) return <ErrorMessage>{error}</ErrorMessage>
  if (!logType) return null

  return (
    <div>
      <h1>Edit {logType.name} Entry</h1>
      <form onSubmit={handleSubmit}>
        {logType.fields.map((field) => (
          <label key={field.name}>
            {field.name}:
            <input
              type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
              value={values[field.name] ?? ''}
              onChange={(e) => updateValue(field.name, e.target.value)}
              required={field.required}
            />
          </label>
        ))}
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save'}
        </button>
      </form>
    </div>
  )
}

export default EditEntry
