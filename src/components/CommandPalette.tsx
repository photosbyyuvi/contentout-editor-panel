import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Clock,
  LayoutDashboard,
  LayoutList,
  LogOut,
  type LucideIcon,
  Bell,
  Search,
  Sparkles,
  SunMoon,
  User as UserIcon,
  Users,
} from 'lucide-react'
import { useApp, useVisibleProjects } from '../store'
import { isManager } from '../permissions'

type Command = {
  id: string
  label: string
  group: string
  Icon: LucideIcon
  run: () => void
}

export function CommandPalette() {
  const { user, toggleTheme, logout, clients } = useApp()
  const projects = useVisibleProjects()
  const navigate = useNavigate()

  const [open, setOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const gPendingRef = useRef(false)

  const manager = isManager(user)

  const commands = useMemo<Command[]>(() => {
    if (!user) {
      return []
    }
    const close = (fn: () => void) => () => {
      setOpen(false)
      fn()
    }
    const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? ''
    const nav: Command[] = [
      ...(manager
        ? [{ id: 'nav-team', label: 'Go to Team', group: 'Navigate', Icon: LayoutDashboard, run: close(() => navigate('/team')) }]
        : []),
      { id: 'nav-queue', label: 'Go to Queue', group: 'Navigate', Icon: LayoutList, run: close(() => navigate('/queue')) },
      { id: 'nav-hours', label: 'Go to Hours', group: 'Navigate', Icon: Clock, run: close(() => navigate('/hours')) },
      { id: 'nav-res', label: 'Go to Resources', group: 'Navigate', Icon: BookOpen, run: close(() => navigate('/resources')) },
      { id: 'nav-ai', label: 'Go to AI', group: 'Navigate', Icon: Sparkles, run: close(() => navigate('/ai')) },
      { id: 'nav-notif', label: 'Go to Notifications', group: 'Navigate', Icon: Bell, run: close(() => navigate('/notifications')) },
      ...(manager
        ? [{ id: 'nav-people', label: 'Go to People', group: 'Navigate', Icon: Users, run: close(() => navigate('/people')) }]
        : []),
      { id: 'nav-profile', label: 'Go to Profile', group: 'Navigate', Icon: UserIcon, run: close(() => navigate('/profile')) },
    ]
    const actions: Command[] = [
      { id: 'act-theme', label: 'Toggle theme', group: 'Actions', Icon: SunMoon, run: close(toggleTheme) },
      { id: 'act-signout', label: 'Sign out', group: 'Actions', Icon: LogOut, run: close(() => { logout(); navigate('/') }) },
    ]
    const projectCmds: Command[] = projects.map((project) => ({
      id: `proj-${project.id}`,
      label: `${project.title} — ${clientName(project.clientId)}`,
      group: 'Projects',
      Icon: Search,
      run: close(() => navigate(`/project/${project.id}`)),
    }))
    return [...nav, ...actions, ...projectCmds]
  }, [user, manager, projects, clients, navigate, toggleTheme, logout])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      return commands
    }
    return commands.filter((command) => command.label.toLowerCase().includes(q))
  }, [commands, query])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setHelpOpen(false)
        setOpen((prev) => !prev)
        return
      }
      if (event.key === '?' && !typing && !open) {
        event.preventDefault()
        setHelpOpen((prev) => !prev)
        return
      }
      if (event.key === 'Escape') {
        setOpen(false)
        setHelpOpen(false)
        return
      }
      if (open || helpOpen || typing) {
        return
      }
      // `g` then q/t/h navigation (Q8 keyboard map)
      if (gPendingRef.current) {
        gPendingRef.current = false
        const key = event.key.toLowerCase()
        if (key === 'q') {
          navigate('/queue')
        } else if (key === 't' && manager) {
          navigate('/team')
        } else if (key === 'h') {
          navigate('/hours')
        }
        return
      }
      if (event.key.toLowerCase() === 'g') {
        gPendingRef.current = true
        window.setTimeout(() => {
          gPendingRef.current = false
        }, 1000)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, helpOpen, manager, navigate])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    setActive(0)
  }, [query])

  if (!user || (!open && !helpOpen)) {
    return null
  }

  if (helpOpen) {
    return (
      <div className="overlay-scrim" role="dialog" aria-modal="true" onClick={() => setHelpOpen(false)}>
        <div className="cmd-help" onClick={(event) => event.stopPropagation()}>
          <header className="cmd-help-head">Keyboard shortcuts</header>
          <ul className="cmd-help-list">
            <li><kbd>⌘</kbd><kbd>K</kbd><span>Open command palette</span></li>
            <li><kbd>g</kbd> then <kbd>q</kbd><span>Go to Queue</span></li>
            <li><kbd>g</kbd> then <kbd>t</kbd><span>Go to Team</span></li>
            <li><kbd>g</kbd> then <kbd>h</kbd><span>Go to Hours</span></li>
            <li><kbd>?</kbd><span>Toggle this cheatsheet</span></li>
            <li><kbd>Esc</kbd><span>Close any overlay</span></li>
          </ul>
        </div>
      </div>
    )
  }

  const runActive = () => {
    const command = filtered[active]
    if (command) {
      command.run()
    }
  }

  return (
    <div className="overlay-scrim" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
      <div className="cmd-palette" onClick={(event) => event.stopPropagation()}>
        <div className="cmd-input-row">
          <Search size={16} aria-hidden="true" />
          <input
            ref={inputRef}
            className="cmd-input"
            value={query}
            placeholder="Search projects, jump to a screen, run an action…"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setActive((prev) => Math.min(prev + 1, filtered.length - 1))
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                setActive((prev) => Math.max(prev - 1, 0))
              } else if (event.key === 'Enter') {
                event.preventDefault()
                runActive()
              }
            }}
            aria-label="Command palette"
          />
        </div>
        <ul className="cmd-list" ref={listRef}>
          {filtered.length === 0 ? (
            <li className="cmd-empty">No matches</li>
          ) : (
            filtered.map((command, index) => {
              const showGroup = index === 0 || filtered[index - 1].group !== command.group
              return (
                <li key={command.id}>
                  {showGroup ? <p className="cmd-group">{command.group}</p> : null}
                  <button
                    type="button"
                    className={`cmd-item ${index === active ? 'cmd-item-active' : ''}`}
                    onMouseEnter={() => setActive(index)}
                    onClick={command.run}
                  >
                    <command.Icon size={16} aria-hidden="true" />
                    <span>{command.label}</span>
                  </button>
                </li>
              )
            })
          )}
        </ul>
      </div>
    </div>
  )
}
