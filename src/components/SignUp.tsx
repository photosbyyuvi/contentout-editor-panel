import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { useApp } from '../appContext'
import { api } from '../lib/api'
import { Logo } from './Logo'

export function SignUp() {
  const { login, theme, toggleTheme } = useApp()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async () => {
    setBusy(true)
    setError(null)
    try {
      await api.signup(fullName.trim(), email.trim(), password)
      await login(email.trim(), password)
      navigate('/')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign-up failed.')
      setBusy(false)
    }
  }

  return (
    <div className="signin-screen">
      <button
        type="button"
        className="ghost-button signin-theme"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <div className="signin-wordmark">
        <Logo className="logo-hero" />
      </div>

      <form
        className="signin-card"
        onSubmit={(event) => {
          event.preventDefault()
          handleSubmit()
        }}
      >
        <div className="signin-card-head">
          <h1>Create your account</h1>
          <p className="muted">Join your team's workspace as an editor.</p>
        </div>

        <label className="field">
          <span>Full name</span>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jordan Lee" />
        </label>
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@contentout.co" autoComplete="username" />
        </label>
        <label className="field">
          <span>Password (min 8 chars)</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </label>

        {error ? <p className="error" role="alert">{error}</p> : null}

        <button type="submit" className="primary-button signin-submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
        <p className="muted signin-alt">
          Already have an account? <Link to="/">Sign in</Link>
        </p>
      </form>
    </div>
  )
}
