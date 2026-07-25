import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { LogOut } from 'lucide-react'
import { useAuth, type UserAttributes } from '../auth/AuthContext'
import { ErrorMessage } from '../components/StatusMessage'

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
    <div className="page">
      <h1>Profile</h1>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {attributes && (
        <dl className="profile-attrs">
          <div className="profile-attr">
            <dt>Email</dt>
            <dd>{attributes.email}</dd>
          </div>
          <div className="profile-attr">
            <dt>Display name</dt>
            <dd>{attributes.displayName}</dd>
          </div>
        </dl>
      )}
      <button type="button" onClick={handleSignOut}>
        <LogOut size={16} aria-hidden="true" /> Sign out
      </button>
    </div>
  )
}

export default Profile
