import { useNavigate } from 'react-router-dom'
import { useApp } from '../store'
import { PageHeader } from './PageHeader'
import { fullDateTime, relativeTime } from '../format'
import type { NotificationType } from '../types'

const KIND_CLASS: Record<NotificationType, string> = {
  assignment: 'notif-kind-assignment',
  delivery_received: 'notif-kind-assignment',
  feedback: 'notif-kind-revisions',
  revision: 'notif-kind-revisions',
  approval: 'notif-kind-approval',
  mention: 'notif-kind-approval',
}

export function NotificationsCenter() {
  const { user, notifications, markNotificationRead, markAllNotificationsRead } = useApp()
  const navigate = useNavigate()
  const timezone = user?.timezone ?? 'UTC'

  const unread = notifications.filter((n) => !n.readAt)
  const read = notifications.filter((n) => n.readAt)

  const renderItem = (id: string) => {
    const notification = notifications.find((n) => n.id === id)
    if (!notification) {
      return null
    }
    return (
      <li key={notification.id}>
        <button
          type="button"
          className={`notif-row ${notification.readAt ? '' : 'notif-unread'}`}
          onClick={() => {
            markNotificationRead(notification.id)
            if (notification.projectId) {
              navigate(`/project/${notification.projectId}`)
            }
          }}
        >
          <span className={`notif-kind ${KIND_CLASS[notification.type]}`} aria-hidden="true" />
          <span className="notif-body">
            <span className="notif-title">{notification.body}</span>
            <span className="notif-sub tabular">via {notification.channelsSent.join(' · ')}</span>
          </span>
          <time className="notif-time tabular" title={fullDateTime(notification.createdAt, timezone)}>
            {relativeTime(notification.createdAt)}
          </time>
        </button>
      </li>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Activity"
        title="Notifications"
        actions={
          unread.length > 0 ? (
            <button type="button" className="secondary-button" onClick={markAllNotificationsRead}>
              Mark all read
            </button>
          ) : undefined
        }
      />

      {notifications.length === 0 ? (
        <div className="empty-state">
          <h2>No notifications yet</h2>
          <p className="muted">New assignments, deliveries, and approvals will show here.</p>
        </div>
      ) : (
        <>
          {unread.length > 0 ? (
            <section className="surface">
              <h2 className="section-head">Unread ({unread.length})</h2>
              <ul className="notif-center-list">{unread.map((n) => renderItem(n.id))}</ul>
            </section>
          ) : null}
          {read.length > 0 ? (
            <section className="surface">
              <h2 className="section-head">Earlier</h2>
              <ul className="notif-center-list">{read.map((n) => renderItem(n.id))}</ul>
            </section>
          ) : null}
        </>
      )}
    </>
  )
}
