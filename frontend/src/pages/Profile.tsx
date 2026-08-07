import { useEffect, useState, type SubmitEvent } from 'react'
import { useNavigate } from 'react-router'
import { LogOut, Trash2, Pencil, Check, X } from 'lucide-react'
import { useAuth, type UserAttributes } from '../auth/AuthContext'
import { deleteAccount } from '../api'
import { ErrorMessage, LoadingMessage } from '../components/StatusMessage'
import PasswordInput from '../components/PasswordInput'

// Stub: email change is out of scope for now (see roadmap.md backlog and
// artifacts/updates/2026-08-05-account-details.md).
function Profile() {
  const { signOut, getUserAttributes, getAccessToken, deleteCognitoUser, updateAttributes, changePassword } = useAuth()
  const navigate = useNavigate()
  const [attributes, setAttributes] = useState<UserAttributes | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  const [changingPassword, setChangingPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

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

  function handleStartChangePassword() {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError(null)
    setChangingPassword(true)
  }

  function handleCancelChangePassword() {
    setChangingPassword(false)
    setPasswordError(null)
  }

  async function handleChangePassword(e: SubmitEvent) {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    setPasswordError(null)
    setPasswordSubmitting(true)
    try {
      await changePassword(currentPassword, newPassword)
      setChangingPassword(false)
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Could not change password')
    } finally {
      setPasswordSubmitting(false)
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
          <div className={changingPassword ? 'profile-attr profile-attr-stacked' : 'profile-attr'}>
            <dt>Password</dt>
            {changingPassword ? (
              <dd>
                <form onSubmit={handleChangePassword}>
                  <label>
                    Current password:{' '}
                    <PasswordInput
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                  </label>
                  <label>
                    New password:{' '}
                    <PasswordInput
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </label>
                  <label>
                    Confirm new password:{' '}
                    <PasswordInput
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </label>
                  {passwordError && <ErrorMessage>{passwordError}</ErrorMessage>}
                  <button type="submit" disabled={passwordSubmitting}>
                    {passwordSubmitting ? 'Updating...' : 'Update password'}
                  </button>
                  <button type="button" onClick={handleCancelChangePassword} disabled={passwordSubmitting}>
                    Cancel
                  </button>
                </form>
              </dd>
            ) : (
              <dd className="profile-attr-edit">
                &bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;
                <button type="button" className="btn-icon" onClick={handleStartChangePassword} aria-label="Change password">
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
