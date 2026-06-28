import { useMemo, useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { useApp } from '../appContext'
import { generateBrief } from '../ai'
import { DELIVERABLE_LABELS, type DeliverableType } from '../types'

const DELIVERABLES = Object.keys(DELIVERABLE_LABELS) as DeliverableType[]

function defaultDueDate(): string {
  const d = new Date(Date.now() + 7 * 86400000)
  return d.toISOString().slice(0, 10)
}

export function NewProjectModal({ onClose }: { onClose: () => void }) {
  const { clients, users, createClient, createProject, showToast } = useApp()
  const editors = useMemo(() => users.filter((u) => u.role === 'editor' && u.status !== 'disabled'), [users])

  const [title, setTitle] = useState('')
  const [clientId, setClientId] = useState(clients[0]?.id ?? '__new')
  const [newClientName, setNewClientName] = useState('')
  const [deliverableType, setDeliverableType] = useState<DeliverableType>('reel')
  const [assignedEditorId, setAssignedEditorId] = useState<string>('')
  const [dueDate, setDueDate] = useState(defaultDueDate())
  const [brief, setBrief] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onGenerate = () => {
    const clientName = clientId === '__new' ? newClientName || 'the client' : clients.find((c) => c.id === clientId)?.name ?? 'the client'
    setAiLoading(true)
    generateBrief({ clientName, deliverableType, goal: title })
      .then(setBrief)
      .finally(() => setAiLoading(false))
  }

  const submit = async () => {
    if (!title.trim()) {
      setError('Give the project a title.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      let resolvedClientId = clientId
      if (clientId === '__new') {
        if (!newClientName.trim()) {
          setError('Enter a client name.')
          setBusy(false)
          return
        }
        const client = await createClient(newClientName.trim())
        resolvedClientId = client.id
      }
      await createProject({
        title: title.trim(),
        clientId: resolvedClientId,
        deliverableType,
        assignedEditorId: assignedEditorId || null,
        dueDate: new Date(`${dueDate}T12:00:00`).toISOString(),
        brief,
      })
      showToast('Project created')
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create the project.')
      setBusy(false)
    }
  }

  return (
    <div className="overlay-scrim" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal-head">
          <h2>New project</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="modal-body">
          <label className="field">
            <span>Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Spring Inventory Walkaround Reel" />
          </label>
          <div className="modal-grid">
            <label className="field">
              <span>Client</span>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                <option value="__new">+ New client…</option>
              </select>
            </label>
            {clientId === '__new' ? (
              <label className="field">
                <span>New client name</span>
                <input value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="Client name" />
              </label>
            ) : null}
            <label className="field">
              <span>Deliverable</span>
              <select value={deliverableType} onChange={(e) => setDeliverableType(e.target.value as DeliverableType)}>
                {DELIVERABLES.map((t) => (
                  <option key={t} value={t}>{DELIVERABLE_LABELS[t]}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Assign to</span>
              <select value={assignedEditorId} onChange={(e) => setAssignedEditorId(e.target.value)}>
                <option value="">Unassigned</option>
                {editors.map((ed) => (
                  <option key={ed.id} value={ed.id}>{ed.fullName}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Due date</span>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
          </div>
          <label className="field">
            <span className="field-head">
              Brief
              <button type="button" className="ai-chip" onClick={onGenerate} disabled={aiLoading}>
                <Sparkles size={13} /> {aiLoading ? 'Writing…' : 'Generate with AI'}
              </button>
            </span>
            <textarea rows={4} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="What's the cut, the tone, the constraints?" />
          </label>
          {error ? <p className="error" role="alert">{error}</p> : null}
        </div>
        <footer className="modal-foot">
          <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
          <button type="button" className="primary-button" onClick={submit} disabled={busy}>
            {busy ? 'Creating…' : 'Create project'}
          </button>
        </footer>
      </div>
    </div>
  )
}
