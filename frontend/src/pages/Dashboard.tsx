import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Plus } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { listLogTypes, type LogType } from '../api'
import { ErrorMessage, LoadingMessage } from '../components/StatusMessage'

function Dashboard() {
  const { getAccessToken } = useAuth()
  const [logTypes, setLogTypes] = useState<LogType[]>([])
  const [error, setError] = useState<string | null>(null)
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
        {!loading && !error && logTypes.length === 0 && <p className="empty-state">No log types yet.</p>}
        <ul>
          {logTypes.map((logType) => (
            <li key={logType.typeId}>
              <Link to={`/log-types/${logType.typeId}`}>{logType.name}</Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export default Dashboard
