import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useApp } from '../store'
import { relativeTime } from '../format'

export function NotificationBell() {
  const { notifications, unreadCount, markNotificationsRead } = useApp()
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
        markNotificationsRead()
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
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    role="menuitem"
                    className="notif-item"
                    onClick={() => {
                      setOpen(false)
                      navigate(`/project/${notification.projectId}`)
                    }}
                  >
                    <span className={`notif-kind notif-kind-${notification.kind}`} aria-hidden="true" />
                    <span className="notif-body">
                      <span className="notif-title">{notification.title}</span>
                      <span className="notif-sub">{notification.body}</span>
                    </span>
                    <time className="notif-time tabular">{relativeTime(notification.createdAt)}</time>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
