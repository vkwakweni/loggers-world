import { useState, type SubmitEvent } from 'react'
import { useNavigate, Link } from 'react-router'
import { useAuth } from '../auth/AuthContext'

function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    setError(null)
    try {
      await signIn(username, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Log in failed')
    }
  }

  return (
    <div>
      <h1>Log In</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Email: <input type="email" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <br></br>
        <label>
          Password: <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p role="alert">{error}</p>}
        <br></br>
        <button type="submit">Log in</button>
      </form>
      <p>
        Don't have an account? <Link to="/signup">Sign up</Link>
      </p>
    </div>
  )
}

export default Login
