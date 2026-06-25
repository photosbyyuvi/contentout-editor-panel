import { useEffect, type ReactElement } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider, useApp } from './store'
import { Layout } from './components/Layout'
import { SignIn } from './components/SignIn'
import { Queue } from './components/Queue'
import { ProjectDetail } from './components/ProjectDetail'
import { Hours } from './components/Hours'
import { Resources } from './components/Resources'

function ThemeSync() {
  const { theme } = useApp()
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  return null
}

function RequireAuth({ children }: { children: ReactElement }) {
  const { activeEditor } = useApp()
  if (!activeEditor) {
    return <Navigate to="/" replace />
  }
  return children
}

function AppRoutes() {
  const { activeEditor } = useApp()
  return (
    <Routes>
      <Route path="/" element={activeEditor ? <Navigate to="/queue" replace /> : <SignIn />} />
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
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AppProvider>
      <ThemeSync />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  )
}
