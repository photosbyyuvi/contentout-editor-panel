import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useApp } from '../store'
import { relativeTime } from '../format'
import type { NotificationType } from '../types'

const KIND_CLASS: Record<NotificationType, string> = {
  assignment: 'notif-kind-assignment',
  delivery_received: 'notif-kind-assignment',
  feedback: 'notif-kind-revisions',
  revision: 'notif-kind-revisions',
  approval: 'notif-kind-approval',
  mention: 'notif-kind-approval',
  digest: 'notif-kind-digest',
  reminder: 'notif-kind-revisions',
}

export function NotificationBell() {
  const { notifications, unreadCount, markAllNotificationsRead } = useApp()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev
      if (next) {
        markAllNotificationsRead()
      }
      return next
    })
  }

  return (
    <div className="notif" ref={containerRef}>
      <button
        type="button"
        className="icon-button notif-trigger"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
      >
        <Bell size={20} aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="notif-badge tabular" aria-hidden="true">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="notif-menu" role="menu">
          <header className="notif-menu-head">Notifications</header>
          {notifications.length === 0 ? (
            <p className="notif-empty">You're all caught up.</p>
          ) : (
            <ul className="notif-list">
              {notifications.slice(0, 6).map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    role="menuitem"
                    className={`notif-item ${notification.readAt ? '' : 'notif-unread'}`}
                    onClick={() => {
                      setOpen(false)
                      navigate(notification.projectId ? `/project/${notification.projectId}` : '/notifications')
                    }}
                  >
                    <span className={`notif-kind ${KIND_CLASS[notification.type]}`} aria-hidden="true" />
                    <span className="notif-body">
                      <span className="notif-title">{notification.body}</span>
                      <span className="notif-sub tabular">
                        {notification.channelsSent.join(' · ')}
                      </span>
                    </span>
                    <time className="notif-time tabular">{relativeTime(notification.createdAt)}</time>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="notif-viewall"
            onClick={() => {
              setOpen(false)
              navigate('/notifications')
            }}
          >
            View all notifications
          </button>
        </div>
      ) : null}
    </div>
  )
}
