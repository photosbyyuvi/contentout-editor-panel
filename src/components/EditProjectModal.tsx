import { useMemo, useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { useApp } from '../appContext'
import { generateBrief } from '../ai'
import {
  DELIVERABLE_LABELS,
  STATUS_LABELS,
  type DeliverableType,
  type Project,
  type ProjectStatus,
} from '../types'

const DELIVERABLES = Object.keys(DELIVERABLE_LABELS) as DeliverableType[]
const STATUSES = Object.keys(STATUS_LABELS) as ProjectStatus[]

function dueInputValue(iso: string, timeZone: string): string {
  // en-CA renders as YYYY-MM-DD, which is exactly what <input type="date"> wants.
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(iso),
  )
}

export function EditProjectModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const { users, clients, updateProject, showToast } = useApp()
  const editors = useMemo(
    () => users.filter((u) => u.role === 'editor' && u.status !== 'disabled'),
    [users],
  )
  const client = clients.find((c) => c.id === project.clientId)
  const timezone = users.find((u) => u.id === project.assignedEditorId)?.timezone ?? 'America/Toronto'

  const [title, setTitle] = useState(project.title)
  const [deliverableType, setDeliverableType] = useState<DeliverableType>(project.deliverableType)
  const [assignedEditorId, setAssignedEditorId] = useState<string>(project.assignedEditorId ?? '')
  const [dueDate, setDueDate] = useState(dueInputValue(project.dueDate, timezone))
  const [status, setStatus] = useState<ProjectStatus>(project.status)
  const [brief, setBrief] = useState(project.brief)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onGenerate = () => {
    setAiLoading(true)
    generateBrief({ clientName: client?.name ?? 'the client', deliverableType, goal: title })
      .then(setBrief)
      .finally(() => setAiLoading(false))
  }

  const save = () => {
    if (!title.trim()) {
      setError('Give the project a title.')
      return
    }
    updateProject(project.id, {
      title: title.trim(),
      deliverableType,
      assignedEditorId: assignedEditorId || null,
      dueDate: new Date(`${dueDate}T12:00:00`).toISOString(),
      status,
      brief,
    })
    showToast('Project updated')
    onClose()
  }

  return (
    <div className="overlay-scrim" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal-head">
          <h2>Edit project</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="modal-body">
          <p className="modal-sub muted">
            <span className="client-dot" style={{ backgroundColor: client?.accentColor }} aria-hidden="true" />
            {client?.name}
          </p>
          <label className="field">
            <span>Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <div className="modal-grid">
            <label className="field">
              <span>Deliverable</span>
              <select value={deliverableType} onChange={(e) => setDeliverableType(e.target.value as DeliverableType)}>
                {DELIVERABLES.map((t) => (
                  <option key={t} value={t}>{DELIVERABLE_LABELS[t]}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Assigned to</span>
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
            <label className="field">
              <span>Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span className="field-head">
              Brief
              <button type="button" className="ai-chip" onClick={onGenerate} disabled={aiLoading}>
                <Sparkles size={13} /> {aiLoading ? 'Writing…' : 'Generate with AI'}
              </button>
            </span>
            <textarea rows={4} value={brief} onChange={(e) => setBrief(e.target.value)} />
          </label>
          {error ? <p className="error" role="alert">{error}</p> : null}
        </div>
        <footer className="modal-foot">
          <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
          <button type="button" className="primary-button" onClick={save}>Save changes</button>
        </footer>
      </div>
    </div>
  )
}
