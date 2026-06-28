import { useMemo, useState } from 'react'
import { Trash2, X } from 'lucide-react'
import { useApp } from '../appContext'

export function ClientsModal({ onClose }: { onClose: () => void }) {
  const { clients, projects, createClient, deleteClient, showToast } = useApp()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const projectCount = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const project of projects) {
      counts[project.clientId] = (counts[project.clientId] ?? 0) + 1
    }
    return counts
  }, [projects])

  const add = async () => {
    if (!name.trim()) {
      setError('Enter a client name.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await createClient(name.trim())
      setName('')
      showToast('Client added')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not add the client.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string, count: number) => {
    try {
      await deleteClient(id, count > 0)
      showToast(count > 0 ? `Client and ${count} project${count === 1 ? '' : 's'} deleted` : 'Client deleted')
      setConfirmingId(null)
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Could not delete the client.')
    }
  }

  return (
    <div className="overlay-scrim" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal-head">
          <h2>Clients</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="modal-body">
          {clients.length === 0 ? (
            <p className="muted">No clients yet. Add your first one below.</p>
          ) : (
            <ul className="client-list">
              {clients.map((client) => {
                const count = projectCount[client.id] ?? 0
                const confirming = confirmingId === client.id
                return (
                  <li key={client.id} className="client-row">
                    <span className="client-row-name">
                      <span className="client-dot" style={{ backgroundColor: client.accentColor }} aria-hidden="true" />
                      {client.name}
                      <span className="client-row-count tabular">
                        {count} project{count === 1 ? '' : 's'}
                      </span>
                    </span>
                    {confirming ? (
                      <span className="client-confirm">
                        <span className="client-confirm-text">
                          {count > 0
                            ? `Delete this client and its ${count} project${count === 1 ? '' : 's'} (and their logged time)?`
                            : 'Delete this client?'}
                        </span>
                        <button type="button" className="ghost-button" onClick={() => setConfirmingId(null)}>
                          Cancel
                        </button>
                        <button type="button" className="danger-button" onClick={() => remove(client.id, count)}>
                          Delete
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="icon-button client-delete"
                        aria-label={`Delete ${client.name}`}
                        onClick={() => setConfirmingId(client.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          <div className="client-add">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  add()
                }
              }}
              placeholder="New client name"
              aria-label="New client name"
            />
            <button type="button" className="primary-button" onClick={add} disabled={busy}>
              {busy ? 'Adding…' : 'Add client'}
            </button>
          </div>
          {error ? <p className="error" role="alert">{error}</p> : null}
        </div>
      </div>
    </div>
  )
}
