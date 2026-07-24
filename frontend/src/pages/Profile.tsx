import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth, type UserAttributes } from '../auth/AuthContext'

// Stub: full profile screen (editing, etc.) is out of scope for now.
// Currently just shows account info + sign-out, per the wireframe's [Profile] element.
function Profile() {
  const { signOut, getUserAttributes } = useAuth()
  const navigate = useNavigate()
  const [attributes, setAttributes] = useState<UserAttributes | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getUserAttributes()
      .then(setAttributes)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load profile'))
  }, [getUserAttributes])

  function handleSignOut() {
    signOut()
    navigate('/')
  }

  return (
    <div>
      <h1>Profile</h1>
      {error && <p role="alert">{error}</p>}
      {attributes && (
        <ul>
          <li>Email: {attributes.email}</li>
          <li>Display name: {attributes.displayName}</li>
        </ul>
      )}
      <button type="button" onClick={handleSignOut}>
        Sign out
      </button>
    </div>
  )
}

export default Profile
