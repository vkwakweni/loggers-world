import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { LogOut, Trash2 } from 'lucide-react'
import { useAuth, type UserAttributes } from '../auth/AuthContext'
import { deleteAccount } from '../api'
import { ErrorMessage, LoadingMessage } from '../components/StatusMessage'

// Stub: editable fields / password change are out of scope for now (see roadmap.md backlog).
// Currently shows account info + sign-out + delete-account, per the wireframe's [Profile] element.
function Profile() {
  const { signOut, getUserAttributes, getAccessToken, deleteCognitoUser } = useAuth()
  const navigate = useNavigate()
  const [attributes, setAttributes] = useState<UserAttributes | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    getUserAttributes()
      .then(setAttributes)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load profile'))
      .finally(() => setLoading(false))
  }, [getUserAttributes])

  function handleSignOut() {
    signOut()
    navigate('/')
  }

  async function handleDeleteAccount() {
    if (!confirm('Delete your account? This permanently deletes all your log types and entries. This action cannot be undone.')) return

    setDeleteError(null)
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('Not signed in')

      await deleteAccount(accessToken)
      deleteCognitoUser()
      navigate('/')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete account')
    }
  }

  return (
    <div className="page">
      <h1>Profile</h1>
      {loading && <LoadingMessage />}
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

      <div className="danger-zone">
        <h2>Delete account</h2>
        <p>Permanently deletes your account, along with all your log types and entries. This action cannot be undone.</p>
        {deleteError && <ErrorMessage>{deleteError}</ErrorMessage>}
        <button type="button" className="btn-danger" onClick={handleDeleteAccount}>
          <Trash2 size={16} aria-hidden="true" /> Delete account
        </button>
      </div>
    </div>
  )
}

export default Profile
