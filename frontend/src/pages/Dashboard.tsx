import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Plus, Eye, EyeOff, Trash2 } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { listLogTypes, archiveLogType, deleteLogType, type LogType } from '../api'
import { ErrorMessage, LoadingMessage } from '../components/StatusMessage'
import RowMenu from '../components/RowMenu'

function Dashboard() {
  const { getAccessToken } = useAuth()
  const [logTypes, setLogTypes] = useState<LogType[]>([])
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const accessToken = await getAccessToken()
        if (!accessToken) throw new Error('Not signed in')
        setLogTypes(await listLogTypes(accessToken))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load log types')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [getAccessToken])

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

  const activeTypes = logTypes.filter((t) => !t.archived)
  const archivedTypes = logTypes.filter((t) => t.archived)

  function renderLogTypeList(types: LogType[]) {
    return (
      <ul>
        {types.map((logType) => (
          <li key={logType.typeId}>
            <Link to={`/log-types/${logType.typeId}`}>{logType.name}</Link>
            <RowMenu label={`Actions for ${logType.name}`}>
              <button type="button" onClick={() => handleArchiveToggle(logType)}>
                {logType.archived ? (
                  <>
                    <Eye size={16} aria-hidden="true" /> Unarchive
                  </>
                ) : (
                  <>
                    <EyeOff size={16} aria-hidden="true" /> Archive
                  </>
                )}
              </button>
              <button type="button" onClick={() => handleDelete(logType)}>
                <Trash2 size={16} aria-hidden="true" /> Delete
              </button>
            </RowMenu>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="page wide">
      <h1>Dashboard</h1>
      <section>
        <h2>My Log Types</h2>
        <Link to="/log-types/new" className="btn btn-primary">
          <Plus size={16} aria-hidden="true" /> New Log Type
        </Link>
        {loading && <LoadingMessage />}
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {actionError && <ErrorMessage>{actionError}</ErrorMessage>}
        {!loading && !error && activeTypes.length === 0 && <p className="empty-state">No log types yet.</p>}
        {renderLogTypeList(activeTypes)}
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
