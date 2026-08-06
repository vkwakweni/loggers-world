import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { LogOut, Trash2, Pencil, Check, X } from 'lucide-react'
import { useAuth, type UserAttributes } from '../auth/AuthContext'
import { deleteAccount } from '../api'
import { ErrorMessage, LoadingMessage } from '../components/StatusMessage'

// Stub: email change is out of scope for now (see roadmap.md backlog and
// artifacts/updates/2026-08-05-account-details.md).
function Profile() {
  const { signOut, getUserAttributes, getAccessToken, deleteCognitoUser, updateAttributes } = useAuth()
  const navigate = useNavigate()
  const [attributes, setAttributes] = useState<UserAttributes | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  useEffect(() => {
    getUserAttributes()
      .then(setAttributes)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load profile'))
      .finally(() => setLoading(false))
  }, [getUserAttributes])

  function handleStartEditName() {
    if (!attributes) return
    setNameDraft(attributes.displayName)
    setNameError(null)
    setEditingName(true)
  }

  function handleCancelEditName() {
    setEditingName(false)
    setNameError(null)
  }

  async function handleSaveName() {
    const trimmed = nameDraft.trim()
    if (trimmed === '') {
      setNameError('Display name is required')
      return
    }

    setNameError(null)
    setNameSaving(true)
    try {
      await updateAttributes({ displayName: trimmed })
      setAttributes((prev) => (prev ? { ...prev, displayName: trimmed } : prev))
      setEditingName(false)
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Could not update display name')
    } finally {
      setNameSaving(false)
    }
  }

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
            {editingName ? (
              <dd className="profile-attr-edit">
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  disabled={nameSaving}
                  autoFocus
                />
                <button type="button" className="btn-icon" onClick={handleSaveName} disabled={nameSaving} aria-label="Save">
                  <Check size={16} aria-hidden="true" />
                </button>
                <button type="button" className="btn-icon btn-icon-danger" onClick={handleCancelEditName} disabled={nameSaving} aria-label="Cancel">
                  <X size={16} aria-hidden="true" />
                </button>
              </dd>
            ) : (
              <dd className="profile-attr-edit">
                {attributes.displayName}
                <button type="button" className="btn-icon" onClick={handleStartEditName} aria-label="Edit display name">
                  <Pencil size={16} aria-hidden="true" />
                </button>
              </dd>
            )}
          </div>
        </dl>
      )}
      {nameError && <ErrorMessage>{nameError}</ErrorMessage>}
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
