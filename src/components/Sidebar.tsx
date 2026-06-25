import { NavLink, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Clock,
  LayoutDashboard,
  LayoutList,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Sun,
  Users,
} from 'lucide-react'
import { useApp } from '../store'
import { isManager } from '../permissions'
import { ROLE_LABELS } from '../types'

export function Sidebar({
  collapsed,
  onToggleCollapse,
  onNavigate,
}: {
  collapsed: boolean
  onToggleCollapse: () => void
  onNavigate: () => void
}) {
  const { user, theme, toggleTheme, logout } = useApp()
  const navigate = useNavigate()

  if (!user) {
    return null
  }

  const manager = isManager(user)

  const navItems = [
    ...(manager ? [{ to: '/team', label: 'Team', Icon: LayoutDashboard }] : []),
    { to: '/queue', label: 'Queue', Icon: LayoutList },
    { to: '/hours', label: 'Hours', Icon: Clock },
    { to: '/resources', label: 'Resources', Icon: BookOpen },
    { to: '/ai', label: 'AI', Icon: Sparkles },
    ...(manager ? [{ to: '/people', label: 'People', Icon: Users }] : []),
  ]

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-head">
        <NavLink to="/" className="wordmark" onClick={onNavigate} aria-label="Contentout home">
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
        {navItems.map(({ to, label, Icon }) => (
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
        <NavLink to="/profile" className="editor-card" onClick={onNavigate} title="Your profile">
          <span className="avatar" aria-hidden="true">
            {user.avatarInitials}
          </span>
          <div className="editor-card-text">
            <span className="editor-name">
              {user.fullName}
              <span className={`role-badge role-${user.role}`}>{ROLE_LABELS[user.role]}</span>
            </span>
            <span className="editor-tz tabular">{user.timezone}</span>
          </div>
        </NavLink>
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
              logout()
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
