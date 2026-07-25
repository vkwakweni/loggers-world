import { useEffect, useState, type SubmitEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { getLogType, createLogEntry, type LogType } from '../api'
import { ErrorMessage, LoadingMessage } from '../components/StatusMessage'

function CreateEntry() {
  const { typeId } = useParams<{ typeId: string }>()
  const { getAccessToken } = useAuth()
  const navigate = useNavigate()

  const [logType, setLogType] = useState<LogType | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const accessToken = await getAccessToken()
        if (!accessToken || !typeId) throw new Error('Not signed in')
        setLogType(await getLogType(accessToken, typeId))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load log type')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [getAccessToken, typeId])

  function updateValue(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    setError(null)

    if (!logType || !typeId) return

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

      await createLogEntry(accessToken, typeId, fields)
      navigate(`/log-types/${typeId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create entry')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingMessage />
  if (error && !logType) return <ErrorMessage>{error}</ErrorMessage>
  if (!logType) return null

  return (
    <div>
      <h1>Add {logType.name} Entry</h1>
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
          {submitting ? 'Adding...' : 'Add entry'}
        </button>
      </form>
    </div>
  )
}

export default CreateEntry
