import { Link } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import AxeLogIcon from '../components/AxeLogIcon'

function NotFound() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="landing">
      <AxeLogIcon aria-hidden="true" className="landing-logo" />
      <h1>Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <Link to={isAuthenticated ? '/dashboard' : '/'} className="btn btn-primary">
        {isAuthenticated ? 'Back to Dashboard' : 'Back to Landing'}
      </Link>
    </div>
  )
}

export default NotFound
