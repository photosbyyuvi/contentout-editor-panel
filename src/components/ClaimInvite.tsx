import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../appContext'
import { api } from '../lib/api'
import { USE_BACKEND } from '../config'

const TIMEZONES = ['America/Toronto', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Skopje', 'Asia/Kolkata', 'Asia/Singapore', 'Australia/Sydney']

export function ClaimInvite() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const { login } = useApp()

  const [invite, setInvite] = useState<{ fullName: string; email: string } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [timezone, setTimezone] = useState('America/Toronto')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!USE_BACKEND) {
      setLoadError('Invites require the official (backend) deployment.')
      return
    }
    if (!token) {
      setLoadError('This invite link is missing its token.')
      return
    }
    api
      .getInvite(token)
      .then((data) => {
        setInvite(data)
        setFullName(data.fullName)
      })
      .catch((caught) => setLoadError(caught instanceof Error ? caught.message : 'Invalid invite.'))
  }, [token])

  const submit = async () => {
    if (password.length < 8) {
      setError('Choose a password of at least 8 characters.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api.claim({ token, password, fullName, timezone })
      if (invite) {
        await login(invite.email, password)
      }
      navigate('/')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not accept the invite.')
      setBusy(false)
    }
  }

  return (
    <div className="signin-screen">
      <div className="signin-wordmark">
        <span className="wordmark-mark wordmark-mark-lg" aria-hidden="true" />
        <span className="signin-wordmark-text">Contentout</span>
      </div>
      <div className="signin-card">
        {loadError ? (
          <>
            <div className="signin-card-head">
              <h1>Invite unavailable</h1>
              <p className="muted">{loadError}</p>
            </div>
            <button type="button" className="secondary-button" onClick={() => navigate('/')}>
              Go to sign in
            </button>
          </>
        ) : !invite ? (
          <p className="muted">Loading your invite…</p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
            className="signin-card"
            style={{ border: 'none', padding: 0 }}
          >
            <div className="signin-card-head">
              <h1>Welcome to Contentout</h1>
              <p className="muted">Set up your account for {invite.email}.</p>
            </div>
            <label className="field">
              <span>Your name</span>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </label>
            <label className="field">
              <span>Timezone</span>
              <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                {[...new Set([timezone, ...TIMEZONES])].map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Choose a password (min 8 chars)</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            </label>
            {error ? <p className="error" role="alert">{error}</p> : null}
            <button type="submit" className="primary-button signin-submit" disabled={busy}>
              {busy ? 'Setting up…' : 'Activate account'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
