import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import Session from './pages/session/Session'
import Overview from './pages/dashboard/Overview'
import Sessions from './pages/dashboard/Sessions'
import Compare from './pages/dashboard/Compare'
import Insights from './pages/dashboard/Insights'
import DashSettings from './pages/dashboard/DashSettings'
import DuoLobby   from './pages/duo/DuoLobby'
import DuoSession  from './pages/duo/DuoSession'
import {ToastProvider} from "./components/ui/Toast"
import NotFound from "./pages/NotFound";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--color-bg)' }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, #c4b5fd, #7c6af7 50%, #4f3fb5)',
        animation: 'orb-pulse 2s ease-in-out infinite',
        boxShadow: '0 0 32px rgba(124,106,247,0.4)',
      }} />
    </div>
  )
  return user ? children : <Navigate to="/auth" />
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--color-bg)' }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, #c4b5fd, #7c6af7 50%, #4f3fb5)',
        animation: 'orb-pulse 2s ease-in-out infinite',
        boxShadow: '0 0 32px rgba(124,106,247,0.4)',
      }} />
    </div>
  )

  return (
    <Routes>
      <Route path="/"       element={user ? <Navigate to="/dashboard" /> : <Landing />} />
      <Route path="/auth"   element={user ? <Navigate to="/dashboard" /> : <Auth />} />
      <Route path="/session" element={<ProtectedRoute><Session /></ProtectedRoute>} />
      <Route path="/dashboard"          element={<ProtectedRoute><Overview /></ProtectedRoute>} />
      <Route path="/dashboard/sessions" element={<ProtectedRoute><Sessions /></ProtectedRoute>} />
      <Route path="/dashboard/compare"  element={<ProtectedRoute><Compare /></ProtectedRoute>} />
      <Route path="/dashboard/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
      <Route path="/dashboard/settings" element={<ProtectedRoute><DashSettings /></ProtectedRoute>} />
      <Route path="/duo"       element={<ProtectedRoute><DuoLobby /></ProtectedRoute>} />
      <Route path="/duo/:code" element={<ProtectedRoute><DuoSession /></ProtectedRoute>} />
      <Route path="*" element={<NotFound/>} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider/>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}