import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useApp } from '../store'
import { Sidebar } from './Sidebar'
import { CommandPalette } from './CommandPalette'

export function Layout() {
  const { theme, toast, dismissToast, isViewingAs, user, exitViewAs } = useApp()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    if (!toast) {
      return
    }
    const timer = window.setTimeout(dismissToast, 3000)
    return () => window.clearTimeout(timer)
  }, [toast, dismissToast])

  return (
    <div className={`app-shell ${mobileOpen ? 'mobile-open' : ''}`}>
      {isViewingAs ? (
        <div className="viewas-banner" role="status">
          <span>
            Viewing as <strong>{user?.fullName}</strong>
          </span>
          <button type="button" className="viewas-exit" onClick={exitViewAs}>
            Exit
          </button>
        </div>
      ) : null}
      <div className="mobile-bar">
        <button
          type="button"
          className="icon-button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
        <span className="wordmark-text">Contentout</span>
      </div>

      {mobileOpen ? (
        <button
          type="button"
          className="scrim"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div className="sidebar-slot">
        <button
          type="button"
          className="icon-button mobile-close"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        >
          <X size={20} />
        </button>
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((prev) => !prev)}
          onNavigate={() => setMobileOpen(false)}
        />
      </div>

      <main className="content">
        <div className="content-inner">
          <Outlet />
        </div>
      </main>

      {toast ? (
        <div className="toast" role="status" aria-live="polite">
          {toast.message}
        </div>
      ) : null}

      <CommandPalette />
    </div>
  )
}
