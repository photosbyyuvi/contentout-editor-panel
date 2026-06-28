import { STATUS_LABELS, type ProjectStatus } from '../types'

export function StatusPill({ status }: { status: ProjectStatus }) {
  return (
    <span className={`pill status-${status}`}>
      <span className="pill-dot" aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  )
}
