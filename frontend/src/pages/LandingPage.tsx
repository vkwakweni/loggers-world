import { Link } from 'react-router'

function LandingPage() {
  return (
    <div>
      <h1>Logger's World</h1>
      <Link to="/signup">Sign Up</Link>  <Link to="/login">Log In</Link>
    </div>
  )
}

export default LandingPage
