import { useState } from 'react'
import { X } from 'lucide-react'
import { useApp } from '../appContext'
import {
  DELIVERABLE_LABELS,
  PAY_MODEL_LABELS,
  type DeliverableType,
  type PayModel,
  type User,
} from '../types'

const DELIVERABLES = Object.keys(DELIVERABLE_LABELS) as DeliverableType[]
const MODELS: PayModel[] = ['hourly', 'flat', 'retainer']

export function EditPayModal({ user, onClose }: { user: User; onClose: () => void }) {
  const { updatePay, showToast } = useApp()
  const [model, setModel] = useState<PayModel>(user.payModel ?? 'hourly')
  const [hourly, setHourly] = useState(String(user.hourlyRate ?? 20))
  const [retainer, setRetainer] = useState(String(user.retainerAmount ?? 0))
  const [flat, setFlat] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {}
    for (const type of DELIVERABLES) {
      out[type] = String(user.flatRates?.[type] ?? 0)
    }
    return out
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      if (model === 'hourly') {
        await updatePay(user.id, { payModel: 'hourly', hourlyRate: Number(hourly) || 0, flatRates: null, retainerAmount: null })
      } else if (model === 'retainer') {
        await updatePay(user.id, { payModel: 'retainer', retainerAmount: Number(retainer) || 0, hourlyRate: null, flatRates: null })
      } else {
        const rates: Partial<Record<DeliverableType, number>> = {}
        for (const type of DELIVERABLES) {
          rates[type] = Number(flat[type]) || 0
        }
        await updatePay(user.id, { payModel: 'flat', flatRates: rates, hourlyRate: null, retainerAmount: null })
      }
      showToast('Pay updated')
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update pay.')
      setBusy(false)
    }
  }

  return (
    <div className="overlay-scrim" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal-head">
          <h2>Pay · {user.fullName}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="modal-body">
          <div className="pay-models">
            {MODELS.map((m) => (
              <label key={m} className={`toggle ${model === m ? 'toggle-on' : ''}`}>
                <input type="radio" name="paymodel" checked={model === m} onChange={() => setModel(m)} />
                {PAY_MODEL_LABELS[m]}
              </label>
            ))}
          </div>

          {model === 'hourly' ? (
            <label className="field">
              <span>Hourly rate (CAD)</span>
              <input type="number" min={0} step={1} value={hourly} onChange={(e) => setHourly(e.target.value)} />
            </label>
          ) : model === 'retainer' ? (
            <label className="field">
              <span>Monthly retainer (CAD)</span>
              <input type="number" min={0} step={50} value={retainer} onChange={(e) => setRetainer(e.target.value)} />
            </label>
          ) : (
            <div className="pay-flat-grid">
              {DELIVERABLES.map((type) => (
                <label key={type} className="field">
                  <span>{DELIVERABLE_LABELS[type]} (CAD)</span>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={flat[type]}
                    onChange={(e) => setFlat((prev) => ({ ...prev, [type]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
          )}
          {error ? <p className="error" role="alert">{error}</p> : null}
        </div>
        <footer className="modal-foot">
          <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
          <button type="button" className="primary-button" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save pay'}
          </button>
        </footer>
      </div>
    </div>
  )
}
