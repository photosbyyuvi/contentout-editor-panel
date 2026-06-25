import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { useApp } from '../store'
import { MOCK_PASSWORD, USERS } from '../data'
import { ROLE_LABELS } from '../types'
import { USE_BACKEND } from '../config'

export function Login() {
  const { login, theme, toggleTheme } = useApp()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const handleSubmit = async () => {
    setPending(true)
    try {
      if (await login(email, password)) {
        setError(null)
        navigate('/')
        return
      }
      setError('Those credentials don\'t match an active profile.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign-in failed.')
    } finally {
      setPending(false)
    }
  }

  const quickFill = (userEmail: string) => {
    setEmail(userEmail)
    setPassword(MOCK_PASSWORD)
    setError(null)
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
        <span className="wordmark-mark wordmark-mark-lg" aria-hidden="true" />
        <span className="signin-wordmark-text">Contentout</span>
      </div>

      <form
        className="signin-card"
        onSubmit={(event) => {
          event.preventDefault()
          handleSubmit()
        }}
      >
        <div className="signin-card-head">
          <h1>Sign in to your workspace</h1>
          <p className="muted">Use your Contentout email and password.</p>
        </div>

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@contentout.studio"
            autoComplete="username"
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </label>

        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" className="primary-button signin-submit" disabled={pending}>
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
        {USE_BACKEND ? (
          <p className="muted signin-alt">
            New to the team? <Link to="/signup">Create an account</Link>
          </p>
        ) : null}

        <div className="signin-demo">
          <p className="signin-demo-label">Demo profiles (password: {MOCK_PASSWORD})</p>
          <div className="signin-demo-list">
            {USERS.filter((user) => user.status !== 'disabled').map((user) => (
              <button
                key={user.id}
                type="button"
                className="chip"
                onClick={() => quickFill(user.email)}
              >
                {user.fullName.split(' ')[0]} · {ROLE_LABELS[user.role]}
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  )
}
