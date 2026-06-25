import type { ReactNode } from 'react'
import { NotificationBell } from './NotificationBell'

export function PageHeader({
  eyebrow,
  title,
  actions,
}: {
  eyebrow: string
  title: string
  actions?: ReactNode
}) {
  return (
    <header className="page-header">
      <div className="page-header-text">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="page-title">{title}</h1>
      </div>
      <div className="page-header-actions">
        {actions}
        <NotificationBell />
      </div>
    </header>
  )
}
