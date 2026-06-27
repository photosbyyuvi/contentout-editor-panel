import { useState } from 'react'
import { X } from 'lucide-react'
import { useApp } from '../appContext'

export function NewClientModal({ onClose }: { onClose: () => void }) {
  const { createClient, showToast } = useApp()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!name.trim()) {
      setError('Enter a client name.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await createClient(name.trim())
      showToast('Client added')
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not add the client.')
      setBusy(false)
    }
  }

  return (
    <div className="overlay-scrim" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal-head">
          <h2>Add client</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="modal-body">
          <label className="field">
            <span>Client name</span>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  submit()
                }
              }}
              placeholder="e.g. Northside Auto"
            />
          </label>
          {error ? <p className="error" role="alert">{error}</p> : null}
        </div>
        <footer className="modal-foot">
          <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
          <button type="button" className="primary-button" onClick={submit} disabled={busy}>
            {busy ? 'Adding…' : 'Add client'}
          </button>
        </footer>
      </div>
    </div>
  )
}
