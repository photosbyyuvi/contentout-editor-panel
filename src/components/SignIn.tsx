import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { useApp } from '../store'

export function SignIn() {
  const { editors, signIn, theme, toggleTheme } = useApp()
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<string>(editors[0]?.id ?? '')

  const handleSignIn = () => {
    if (!selectedId) {
      return
    }
    signIn(selectedId)
    navigate('/queue')
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
          handleSignIn()
        }}
      >
        <div className="signin-card-head">
          <h1>Sign in to your workspace</h1>
          <p className="muted">Select your editor profile to continue.</p>
        </div>

        <fieldset className="signin-options">
          <legend className="sr-only">Editor profile</legend>
          {editors.map((editor) => (
            <label
              key={editor.id}
              className={`signin-option ${selectedId === editor.id ? 'signin-option-active' : ''}`}
            >
              <input
                type="radio"
                name="editor"
                value={editor.id}
                checked={selectedId === editor.id}
                onChange={() => setSelectedId(editor.id)}
              />
              <span className="avatar" aria-hidden="true">
                {editor.avatarInitials}
              </span>
              <span className="signin-option-text">
                <span className="signin-option-name">{editor.name}</span>
                <span className="signin-option-tz tabular">{editor.timezone}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <button type="submit" className="primary-button signin-submit" disabled={!selectedId}>
          Sign in
        </button>
      </form>
    </div>
  )
}
