import { Link } from 'react-router'
import LogWoodIcon from '../components/LogWoodIcon'

function LandingPage() {
  return (
    <div className="landing">
      <h1>Logger's World</h1>
      <LogWoodIcon className="landing-logo" aria-hidden="true" />
      <div className="landing-actions">
        <Link to="/signup" className="btn btn-primary">
          Sign Up
        </Link>
        <Link to="/login" className="btn">
          Log In
        </Link>
      </div>
    </div>
  )
}

export default LandingPage
