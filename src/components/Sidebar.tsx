import { NavLink, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Clock,
  LayoutList,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
} from 'lucide-react'
import { useApp } from '../store'

const NAV_ITEMS = [
  { to: '/queue', label: 'Queue', Icon: LayoutList },
  { to: '/hours', label: 'Hours', Icon: Clock },
  { to: '/resources', label: 'Resources', Icon: BookOpen },
] as const

export function Sidebar({
  collapsed,
  onToggleCollapse,
  onNavigate,
}: {
  collapsed: boolean
  onToggleCollapse: () => void
  onNavigate: () => void
}) {
  const { activeEditor, theme, toggleTheme, signOut } = useApp()
  const navigate = useNavigate()

  if (!activeEditor) {
    return null
  }

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-head">
        <NavLink to="/queue" className="wordmark" onClick={onNavigate} aria-label="Contentout — Queue">
          <span className="wordmark-mark" aria-hidden="true" />
          <span className="wordmark-text">Contentout</span>
        </NavLink>
        <button
          type="button"
          className="icon-button collapse-toggle"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Primary">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
            title={label}
          >
            <Icon size={20} className="nav-icon" aria-hidden="true" />
            <span className="nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-foot">
        <div className="editor-card">
          <span className="avatar" aria-hidden="true">
            {activeEditor.avatarInitials}
          </span>
          <div className="editor-card-text">
            <span className="editor-name">{activeEditor.name}</span>
            <span className="editor-tz tabular">{activeEditor.timezone}</span>
          </div>
        </div>
        <div className="sidebar-foot-actions">
          <button
            type="button"
            className="ghost-button theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span className="theme-toggle-label">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              signOut()
              navigate('/')
            }}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
