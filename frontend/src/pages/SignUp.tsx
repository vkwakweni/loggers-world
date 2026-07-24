import { useState, type SubmitEvent } from 'react'
import { useNavigate, Link } from 'react-router'
import { useAuth } from '../auth/AuthContext'

function SignUp() {
  const { signUp, confirmSignUp, resendConfirmationCode } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [code, setCode] = useState('')
  const [stage, setStage] = useState<'form' | 'confirm'>('form')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    try {
      await signUp(email, displayName, password)
      setStage('confirm')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
    }
  }

  async function handleConfirm(e: SubmitEvent) {
    e.preventDefault()
    setError(null)
    try {
      await confirmSignUp(email, code)
      navigate('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirmation failed')
    }
  }

  async function handleResend() {
    setError(null)
    setNotice(null)
    try {
      await resendConfirmationCode(email)
      setNotice('A new code has been sent to your email.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend code')
    }
  }

  if (stage === 'confirm') {
    return (
      <div>
        <h1>Confirm Your Email</h1>
        <p>Enter the code sent to {email}.</p>
        <form onSubmit={handleConfirm}>
          <label>
            Confirmation code: <input type="text" value={code} onChange={(e) => setCode(e.target.value)} required />
          </label>
          {error && <p role="alert">{error}</p>}
          {notice && <p>{notice}</p>}
          <br></br><br></br>
          <button type="submit">Confirm</button>
        </form>
        <p>
          Didn't get a code? <button type="button" onClick={handleResend}>Resend code</button>
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1>Create Account</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Email: <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <br></br>
        <label>
          Display name: <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        </label>
        <br></br>
        <label>
          Password: <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <br></br>
        <label>
          Confirm password: {/* TODO get space represention */}
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <br></br><br></br>
        <button type="submit">Create account</button>
      </form>
      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  )
}

export default SignUp
