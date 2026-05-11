import axios from 'axios'
import {Capacitor} from "@capacitor/core"

function getBaseURL() {
  // Running as native Android/iOS app
  if (Capacitor.isNativePlatform()) {
    return 'https://mindorb.onrender.com/api'
    // Later when you deploy server: return 'https://api.mindorb.com/api'
  }
  // Running in browser (dev or prod web)
  return import.meta.env.VITE_API_URL || '/api'
}

const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
})

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Global 401 handler
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // ── FIXED: don't redirect on auth routes — let the form handle it ──
      const isAuthRoute = err.config?.url?.includes('/auth/')
      if (!isAuthRoute) {
        localStorage.removeItem('token')
        window.location.href = '/auth'
      }
    }
    return Promise.reject(err)
  }
)

export default api