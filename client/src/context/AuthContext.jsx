import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { toast } from '../components/ui/Toast'
import { loadModel } from '../services/sentiment'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modelReady, setModelReady] = useState(false)

  // ── Pre-warm the sentiment model ────────────────────────────
  const warmModel = useCallback(() => {
    loadModel()
      .then(() => setModelReady(true))
      .catch(() => {
        console.warn('[MindOrb] Model pre-warm failed — will retry on session start')
      })
  }, [])

  // ── Restore session on app load ─────────────────────────────
  useEffect(() => {
    const restore = async () => {
      const token = localStorage.getItem('token')
      if (!token) { setLoading(false); return }
      try {
        const { data } = await api.get('/auth/me')
        setUser(data.user)
        warmModel()
      } catch {
        localStorage.removeItem('token')
      } finally {
        setLoading(false)
      }
    }
    restore()
  }, [warmModel])

  const commitUser = (userData) => {
    setUser(userData)
    warmModel()
  }

  // ── Local: signup ───────────────────────────────────────────
  const signup = async (name, email, password) => {
    const { data } = await api.post('/auth/signup', { name, email, password })
    localStorage.setItem('token', data.token)
    toast.success(`Welcome to MindOrb, ${name.split(' ')[0]}!`)
    return data   // ← return data, don't setUser yet
  }

  // ── Local: login ────────────────────────────────────────────
  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', data.token)
    toast.success(`Welcome back, ${data.user.name.split(' ')[0]}!`)
    return data   // ← return data, don't setUser yet
  }

  // ── OAuth: shared handler (Google + Facebook) ───────────────
  // endpoint : '/auth/google' | '/auth/facebook'
  // payload  : { idToken }   | { accessToken }
  const oauthLogin = useCallback(async (endpoint, payload) => {
    const { data } = await api.post(endpoint, payload)
    localStorage.setItem('token', data.token)
    setUser(data.user)
    const firstName = data.user.name.split(' ')[0]
    toast.success(
      data.user.totalSessions === 0
        ? `Welcome to MindOrb, ${firstName}!`
        : `Welcome back, ${firstName}!`
    )
    warmModel()
    return data.user
  }, [warmModel])

  // ── Logout ──────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    setModelReady(false)
    toast.info('Signed out')
  }

  const updateUser = (updates) => setUser(prev => ({ ...prev, ...updates }))

  return (
    <AuthContext.Provider value={{
      user, loading, modelReady,
      signup, login, logout, updateUser,
      oauthLogin, commitUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}