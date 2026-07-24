import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { listLogTypes, type LogType } from '../api'

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
    <div>
      <h1>Dashboard</h1>
      <Link to="/profile">Profile</Link>
      <section>
        <h2>My Log Types</h2>
        <Link to="/log-types/new">New Log Type</Link>
        {loading && <p>Loading...</p>}
        {error && <p role="alert">{error}</p>}
        {!loading && !error && logTypes.length === 0 && <p>No log types yet.</p>}
        <ul>
          {logTypes.map((logType) => (
            <li key={logType.typeId}>
              <Link to={`/log-types/${logType.typeId}`}>{logType.name}</Link>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>My Log Entries</h2>
      </section>
    </div>
  )
}

export default Dashboard
