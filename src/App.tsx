import { useEffect, type ReactElement } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider } from './store'
import { BackendAppProvider } from './backendStore'
import { useApp } from './appContext'
import { USE_BACKEND } from './config'
import { isManager } from './permissions'
import { Layout } from './components/Layout'
import { Login } from './components/Login'
import { SignUp } from './components/SignUp'
import { ClaimInvite } from './components/ClaimInvite'
import { Queue } from './components/Queue'
import { ProjectDetail } from './components/ProjectDetail'
import { Hours } from './components/Hours'
import { Resources } from './components/Resources'
import { TeamDashboard } from './components/TeamDashboard'
import { People } from './components/People'
import { Profile } from './components/Profile'
import { NotificationsCenter } from './components/NotificationsCenter'
import { AIPanel } from './components/AIPanel'

function ThemeSync() {
  const { theme } = useApp()
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  return null
}

function RequireAuth({ children }: { children: ReactElement }) {
  const { user } = useApp()
  if (!user) {
    return <Navigate to="/" replace />
  }
  return children
}

function RequireManager({ children }: { children: ReactElement }) {
  const { user } = useApp()
  if (!isManager(user)) {
    return <Navigate to="/queue" replace />
  }
  return children
}

function RoleHome() {
  const { user } = useApp()
  if (!user) {
    return <Login />
  }
  return <Navigate to={isManager(user) ? '/team' : '/queue'} replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RoleHome />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/claim" element={<ClaimInvite />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/queue" element={<Queue />} />
        <Route path="/project/:projectId" element={<ProjectDetail />} />
        <Route path="/hours" element={<Hours />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/ai" element={<AIPanel />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/notifications" element={<NotificationsCenter />} />
        <Route path="/team" element={<RequireManager><TeamDashboard /></RequireManager>} />
        <Route path="/people" element={<RequireManager><People /></RequireManager>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  const Provider = USE_BACKEND ? BackendAppProvider : AppProvider
  return (
    <Provider>
      <ThemeSync />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </Provider>
  )
}
