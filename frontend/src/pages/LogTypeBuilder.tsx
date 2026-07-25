import { useState, type SubmitEvent } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { createLogType, type FieldType, type LogTypeField } from '../api'
import { ErrorMessage } from '../components/StatusMessage'

const FIELD_TYPES: FieldType[] = ['text', 'number', 'date']

function emptyField(): LogTypeField {
  return { name: '', type: 'text', required: false }
}

function LogTypeBuilder() {
  const { getAccessToken } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [fields, setFields] = useState<LogTypeField[]>([emptyField()])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function updateField(index: number, patch: Partial<LogTypeField>) {
    setFields((prev) => prev.map((field, i) => (i === index ? { ...field, ...patch } : field)))
  }

  function addField() {
    setFields((prev) => [...prev, emptyField()])
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    setError(null)

    if (fields.length === 0) {
      setError('Add at least one field')
      return
    }
    if (fields.some((field) => field.name.trim() === '')) {
      setError('Every field needs a name')
      return
    }

    setSubmitting(true)
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('Not signed in')

      await createLogType(accessToken, name, fields)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create log type')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h1>Create Log Type</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Name: <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>

        {fields.map((field, index) => (
          <div key={index} className="field-row">
            <label>
              Field name:
              <input
                type="text"
                value={field.name}
                onChange={(e) => updateField(index, { name: e.target.value })}
                required
              />
            </label>
            <label>
              Type:
              <select
                value={field.type}
                onChange={(e) => updateField(index, { type: e.target.value as FieldType })}
              >
                {FIELD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Required:
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => updateField(index, { required: e.target.checked })}
              />
            </label>
            <button
              type="button"
              className="btn-danger"
              onClick={() => removeField(index)}
              disabled={fields.length === 1}
            >
              Remove
            </button>
          </div>
        ))}

        <button type="button" onClick={addField}>
          Add field
        </button>

        {error && <ErrorMessage>{error}</ErrorMessage>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating...' : 'Add type'}
        </button>
      </form>
    </div>
  )
}

export default LogTypeBuilder
