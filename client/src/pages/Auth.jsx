import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useGoogleLogin } from '@react-oauth/google'
import { Capacitor } from '@capacitor/core'
import { SocialLogin } from '@capgo/capacitor-social-login'
import { useAuth } from '../context/AuthContext'
import { toast } from '../components/ui/Toast'
import { LegalModal } from '../components/ui/LegalModal'
import { TermsContent } from '../components/ui/TermsContent'
import { PrivacyContent } from '../components/ui/PrivacyContent'

// ─── Google SVG icon ──────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

// ─── Facebook SVG icon ────────────────────────────────────────────────────────
function FacebookIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="#1877F2" style={{ flexShrink: 0 }}>
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1
        4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007
        1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83
        c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24
        C19.612 23.094 24 18.1 24 12.073z"/>
    </svg>
  )
}

// ─── Orb (unchanged) ──────────────────────────────────────────────────────────
function AuthOrb({ emotion = 'anticipation' }) {
  const gradients = {
    anticipation: ['#c4b5fd', '#7c6af7', '#4f3fb5'],
    joy: ['#fde68a', '#f59e0b', '#d97706'],
    trust: ['#6ee7b7', '#10b981', '#059669'],
    neutral: ['#a1a1aa', '#71717a', '#52525e'],
  }
  const [c1, c2, c3] = gradients[emotion] || gradients.anticipation
  const glowColor = emotion === 'anticipation' ? 'rgba(124,106,247,0.35)'
    : emotion === 'joy' ? 'rgba(251,191,36,0.3)'
      : 'rgba(52,211,153,0.3)'

  return (
    <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
      <div className="absolute inset-0 rounded-full border"
        style={{ borderColor: `${c2}22`, animation: 'orb-ring-pulse-2 4s ease-in-out 0.5s infinite' }} />
      <div className="absolute rounded-full border"
        style={{ inset: 16, borderColor: `${c2}33`, animation: 'orb-ring-pulse 4s ease-in-out infinite' }} />
      <div style={{
        width: 110, height: 110, borderRadius: '50%',
        background: `radial-gradient(circle at 35% 32%, ${c1} 0%, ${c2} 45%, ${c3} 100%)`,
        boxShadow: `0 0 60px 12px ${glowColor}, 0 0 120px 24px ${glowColor.replace('0.35', '0.12')}, inset 0 1px 0 rgba(255,255,255,0.25)`,
        animation: 'orb-pulse 4s ease-in-out infinite',
        position: 'relative', zIndex: 1,
      }} />
    </div>
  )
}

// ─── Password strength (unchanged) ───────────────────────────────────────────
function PasswordStrength({ password }) {
  const getScore = (pw) => {
    let s = 0
    if (pw.length >= 6) s++
    if (pw.length >= 10) s++
    if (/[A-Z]|[0-9]/.test(pw)) s++
    if (/[^A-Za-z0-9]/.test(pw)) s++
    return s
  }
  const score = getScore(password)
  const colors = ['', '#f87171', '#fbbf24', '#7c6af7', '#34d399']
  const labels = ['', 'Too weak', 'Getting there', 'Almost strong', 'Strong']
  const color = password ? colors[score] : 'var(--color-border)'

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1.5">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="flex-1 h-0.5 rounded-full transition-all duration-300"
            style={{ background: i < score ? color : 'var(--color-border)' }} />
        ))}
      </div>
      {password && (
        <p className="text-[10px]" style={{ color: colors[score] }}>{labels[score]}</p>
      )}
    </div>
  )
}

// ─── Steps (unchanged) ────────────────────────────────────────────────────────
const STEPS = [
  { n: 1, label: 'Create your account', sub: 'Name, email & password' },
  { n: 2, label: 'Your first session', sub: 'Meet the orb' },
  { n: 3, label: 'See your insights', sub: 'Patterns, stories & growth' },
]

// ─── Divider (unchanged) ──────────────────────────────────────────────────────
function Divider({ label = 'or continue with email' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
      <span style={{
        fontSize: 11, color: 'var(--color-text-3)',
        fontFamily: 'var(--font-body)', letterSpacing: '0.05em', whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
    </div>
  )
}

// ─── Shared OAuth button style ────────────────────────────────────────────────
const oauthBtnStyle = (disabled) => ({
  width: '100%', display: 'flex', alignItems: 'center',
  justifyContent: 'center', gap: 10,
  padding: '10px 16px', borderRadius: 10,
  background: 'var(--color-hover)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-1)', fontSize: 13.5, fontWeight: 500,
  fontFamily: 'var(--font-body)', cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'background 0.15s', opacity: disabled ? 0.6 : 1,
})

// ── Move this OUTSIDE the Auth component ──────────────────────────────────────
function OAuthBlock({ isWorking, gLoading, fbLoading, isSignup, onGoogle, onFacebook }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
      <button
        type="button"
        onClick={onGoogle}
        disabled={isWorking}
        style={oauthBtnStyle(isWorking)}
        onMouseEnter={e => { if (!isWorking) e.currentTarget.style.background = 'var(--color-hover-2)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-hover)' }}
      >
        {gLoading
          ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          : <GoogleIcon />}
        {gLoading ? 'Connecting…' : isSignup ? 'Sign up with Google' : 'Sign in with Google'}
      </button>

      <button
        type="button"
        onClick={onFacebook}
        disabled={isWorking}
        style={oauthBtnStyle(isWorking)}
        onMouseEnter={e => { if (!isWorking) e.currentTarget.style.background = 'var(--color-hover-2)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-hover)' }}
      >
        {fbLoading
          ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          : <FacebookIcon />}
        {fbLoading ? 'Connecting…' : isSignup ? 'Sign up with Facebook' : 'Continue with Facebook'}
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AUTH PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function Auth() {
  const location = useLocation()
  const navigate = useNavigate()
  const { login, signup, oauthLogin, commitUser } = useAuth()

  const [mode, setMode] = useState(location.state?.mode || 'signup')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [fbLoading, setFbLoading] = useState(false)
  const [gLoading, setGLoading] = useState(false)  // ← new
  const [legalModal, setLegalModal] = useState(null) // 'terms' | 'privacy' | null

  const isSignup = mode === 'signup'
  const isWorking = loading || fbLoading || gLoading

  const switchMode = (m) => { setMode(m); setError(''); setSuccess(false) }

  // ── Initialize SocialLogin plugin on native platforms only ──────────────────
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    SocialLogin.initialize({
      google: {
        webClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      },
      facebook: {
        appId: import.meta.env.VITE_FACEBOOK_APP_ID,
        clientToken: import.meta.env.VITE_FACEBOOK_CLIENT_TOKEN,
      },
    }).catch(err => console.warn('[SocialLogin] init failed:', err))
  }, [])

  // ── Email + password ────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e?.preventDefault()
    setError('')
    if (!email || !password || (isSignup && !name)) {
      const msg = 'Please fill in all fields'
      setError(msg); toast.error(msg); return
    }
    setLoading(true)
    try {
      const data = isSignup
        ? await signup(name, email, password)
        : await login(email, password)

      setLoading(false)
      setSuccess(true)          // ← green button renders now

      setTimeout(() => {
        commitUser(data.user)   // ← NOW set user → triggers route guard → redirect
      }, 900)

    } catch (err) {
      const msg = err.response?.data?.message || 'Something went wrong'
      setError(msg); toast.error(msg)
      setLoading(false)
    }
  }

  // ── Google — web: popup via @react-oauth/google | native: SocialLogin drawer ─
  const initiateGoogleLogin = useGoogleLogin({
    // implicit flow: GIS opens a popup and returns an access_token directly.
    // The backend calls Google's /userinfo endpoint to verify it — no code exchange needed.
    flow: 'implicit',
    scope: 'openid email profile',
    onSuccess: async (tokenResponse) => {
      // NOTE: do NOT call setGLoading(true) here — handleGoogle already set it
      // before opening the popup to avoid the React 18 batching race condition.
      try {
        await oauthLogin('/auth/google', { accessToken: tokenResponse.access_token })
        navigate('/dashboard')
      } catch (err) {
        console.error('Google oauthLogin failed:', err)
        toast.error('Google sign-in failed — Try again')
      } finally {
        setGLoading(false)
      }
    },
    onError: (err) => {
      console.error('Google onError fired:', err)
      toast.error('Google sign-in failed — Try again')
      setGLoading(false)
    },
    onNonOAuthError: (err) => {
      // 'popup_closed'         — user cancelled, stay silent
      // 'popup_failed_to_open' — browser blocked the popup, tell the user
      if (err.type === 'popup_failed_to_open') {
        toast.error('Pop-up was blocked — please allow pop-ups for this site')
      }
      setGLoading(false)
    },
  })

  const handleGoogle = async () => {
    setGLoading(true)

    if (Capacitor.isNativePlatform()) {
      // Native: shows the system Google account drawer (no popup)
      try {
        const result = await SocialLogin.login({ provider: 'google', options: {} })
        const accessToken = result.result?.accessToken?.token
        if (!accessToken) throw new Error('No access token returned')
        await oauthLogin('/auth/google', { accessToken })
        navigate('/dashboard')
      } catch (err) {
        if (err?.message !== 'User cancelled') {
          toast.error('Google sign-in failed — try again')
        }
      } finally {
        setGLoading(false)
      }
    } else {
      // Web: existing popup flow — loading is reset inside useGoogleLogin callbacks
      initiateGoogleLogin()
    }
  }

  // ── Facebook — web: FB.login popup | native: SocialLogin drawer ─────────────
  const handleFacebook = async () => {
    setFbLoading(true)

    if (Capacitor.isNativePlatform()) {
      // Native: shows the system Facebook account sheet (no popup)
      try {
        const result = await SocialLogin.login({
          provider: 'facebook',
          options: { permissions: ['public_profile', 'email'] },
        })
        const accessToken = result.result?.accessToken?.token
        if (!accessToken) throw new Error('No access token returned')
        await oauthLogin('/auth/facebook', { accessToken })
        navigate('/dashboard')
      } catch (err) {
        if (err?.message !== 'User cancelled') {
          toast.error('Facebook sign-in failed — try again')
        }
      } finally {
        setFbLoading(false)
      }
    } else {
      // Web: existing FB SDK popup flow — requires HTTPS
      if (!window.FB) { toast.error('Facebook SDK not loaded — try refreshing'); setFbLoading(false); return }
      window.FB.login((response) => {
        if (response.authResponse) {
          oauthLogin('/auth/facebook', { accessToken: response.authResponse.accessToken })
            .then(() => navigate('/dashboard'))
            .catch(() => toast.error('Facebook sign-in failed — try again'))
            .finally(() => setFbLoading(false))
        } else {
          setFbLoading(false)
        }
      }, { scope: 'public_profile,email' })
    }
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bg)' }}>

      {/* ══ LEFT PANEL — desktop only ══════════════════════════════════════════ */}
      <div
        className="relative hidden lg:flex flex-col overflow-hidden"
        style={{
          width: '52%', height: '100vh',
          background: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        {/* Ambient blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div style={{
            position: 'absolute', top: '-10%', left: '-10%',
            width: '70%', height: '70%',
            background: 'radial-gradient(ellipse, rgba(124,106,247,0.25) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }} />
          <div style={{
            position: 'absolute', bottom: '-5%', right: '-5%',
            width: '50%', height: '50%',
            background: 'radial-gradient(ellipse, rgba(52,211,153,0.1) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }} />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex-shrink-0 p-8">
          <div className="flex items-center gap-3">
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: 'radial-gradient(circle at 35% 35%, #c4b5fd, #7c6af7 50%, #4f3fb5)',
              boxShadow: '0 0 16px rgba(124,106,247,0.4)',
            }} />
            <span className="font-display text-base font-semibold tracking-tight"
              style={{ color: 'var(--color-text-1)' }}>
              MindOrb
            </span>
          </div>
        </div>

        {/* Orb + tagline */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-10 min-h-0">
          <div className="animate-float">
            <AuthOrb emotion="anticipation" />
          </div>
          <h1 className="font-display text-3xl font-bold mt-6 mb-3 leading-tight tracking-tight"
            style={{ color: 'var(--color-text-1)' }}>
            Your words reveal<br />your mind.
          </h1>
          <p className="text-sm leading-relaxed max-w-[260px]"
            style={{ color: 'var(--color-text-2)', fontFamily: 'var(--font-body)' }}>
            10 words. Deep patterns.<br />Infinite self-awareness.
          </p>
        </div>

        {/* Steps */}
        <div className="relative z-10 flex-shrink-0 p-6 space-y-2">
          {STEPS.map((step, i) => (
            <div key={step.n}
              className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all"
              style={{
                background: i === 0 ? 'var(--color-border)' : 'var(--color-hover)',
                border: `1px solid ${i === 0 ? 'var(--color-border-2)' : 'var(--color-border)'}`,
              }}
            >
              <div className="flex items-center justify-center font-display text-xs font-bold flex-shrink-0"
                style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: i === 0 ? 'var(--color-text-1)' : 'var(--color-border)',
                  color: i === 0 ? 'var(--color-bg)' : 'var(--color-text-3)',
                }}>
                {step.n}
              </div>
              <div className="min-w-0">
                <div className="font-display text-sm font-medium truncate"
                  style={{ color: i === 0 ? 'var(--color-text-1)' : 'var(--color-text-3)' }}>
                  {step.label}
                </div>
                <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-3)' }}>
                  {step.sub}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ RIGHT PANEL ════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-10 overflow-y-auto">
        <div className="w-full max-w-md animate-fade-up">

          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'radial-gradient(circle at 35% 35%, #c4b5fd, #7c6af7 50%, #4f3fb5)',
              boxShadow: '0 0 24px rgba(124,106,247,0.4)',
            }} />
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="font-display text-2xl font-semibold tracking-tight mb-1.5"
              style={{ color: 'var(--color-text-1)' }}>
              {isSignup ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-text-2)' }}>
              {isSignup ? 'Begin your journey inward.' : 'Your orb is waiting for you.'}
            </p>
          </div>

          {/* Mode switcher */}
          <div className="flex rounded-xl p-1 mb-6"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            {['signup', 'login'].map(m => (
              <button key={m}
                type="button"
                onClick={() => switchMode(m)}
                className="flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200"
                style={{
                  fontFamily: 'var(--font-display)',
                  background: mode === m ? 'var(--color-surface-3)' : 'transparent',
                  color: mode === m ? 'var(--color-text-1)' : 'var(--color-text-3)',
                  border: mode === m ? '1px solid var(--color-border)' : '1px solid transparent',
                }}>
                {m === 'signup' ? 'Sign up' : 'Sign in'}
              </button>
            ))}
          </div>

          {/* ── OAuth buttons ── */}
          <OAuthBlock
            isWorking={isWorking}
            gLoading={gLoading}
            fbLoading={fbLoading}
            isSignup={isSignup}
            onGoogle={handleGoogle}
            onFacebook={handleFacebook}
          />

          <Divider />

          {/* ── Email + password form ── */}
          <form onSubmit={handleSubmit} className="space-y-4" style={{ marginTop: 20 }}>

            {isSignup && (
              <div className="animate-fade-up">
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--color-text-3)', fontFamily: 'var(--font-display)' }}>
                  Full name
                </label>
                <input
                  className="input-field"
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: 'var(--color-text-3)', fontFamily: 'var(--font-display)' }}>
                Email
              </label>
              <input
                className="input-field"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: 'var(--color-text-3)', fontFamily: 'var(--font-display)' }}>
                Password
              </label>
              <div className="relative">
                <input
                  className="input-field"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  style={{ paddingRight: 44 }}
                />
                <button type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: showPw ? 'var(--color-text-2)' : 'var(--color-text-3)' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {isSignup && password && <PasswordStrength password={password} />}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm animate-fade-in"
                style={{
                  background: 'rgba(248,113,113,0.08)',
                  border: '1px solid rgba(248,113,113,0.2)',
                  color: '#f87171',
                }}>
                <span className="text-base">⚠</span>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isWorking || success}
              className="w-full flex items-center justify-center gap-2 font-display font-semibold text-sm py-3.5 rounded-xl transition-all duration-200"
              style={{
                background: success
                  ? 'var(--color-green)'
                  : isWorking
                    ? 'rgba(124,106,247,0.6)'
                    : 'var(--color-accent)',
                color: '#fff',
                marginTop: 8,
                opacity: isWorking ? 0.8 : 1,
                boxShadow: success || isWorking ? 'none' : '0 0 24px rgba(124,106,247,0.3)',
                cursor: isWorking || success ? 'not-allowed' : 'pointer',
              }}
            >
              {success ? (
                <><CheckCircle2 size={16} /> {isSignup ? 'Account created!' : 'Welcome back!'}</>
              ) : loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isSignup ? 'Creating account…' : 'Signing in…'}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {isSignup ? 'Create account' : 'Sign in'}
                  <ArrowRight size={15} />
                </span>
              )}
            </button>
          </form>

          {/* Bottom toggle */}
          <p className="text-center text-sm mt-6" style={{ color: 'var(--color-text-2)' }}>
            {isSignup ? 'Already have an account? ' : "Don't have an account? "}
            <button
              type="button"
              onClick={() => switchMode(isSignup ? 'login' : 'signup')}
              className="font-semibold transition-colors hover:opacity-80"
              style={{ color: 'var(--color-accent-2)', fontFamily: 'var(--font-display)' }}
            >
              {isSignup ? 'Sign in' : 'Create one'}
            </button>
          </p>

          {/* Terms */}
          {isSignup && (
            <p className="text-center text-xs mt-4 animate-fade-in"
              style={{ color: 'var(--color-text-3)', lineHeight: 1.7 }}>
              By signing up you agree to our{' '}
              <span className="cursor-pointer underline underline-offset-2"
                style={{ color: 'var(--color-text-3)' }}
                onClick={() => setLegalModal('terms')}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--color-accent-2)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-3)'}>
                Terms of Service
              </span>
              {' '}and{' '}
              <span className="cursor-pointer underline underline-offset-2"
                style={{ color: 'var(--color-text-3)' }}
                onClick={() => setLegalModal('privacy')}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--color-accent-2)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-3)'}>
                Privacy Policy
              </span>
            </p>
          )}

          {/* Legal Modals */}
          <LegalModal
            isOpen={legalModal === 'terms'}
            onClose={() => setLegalModal(null)}
            title="Terms of Service"
          >
            <TermsContent />
          </LegalModal>

          <LegalModal
            isOpen={legalModal === 'privacy'}
            onClose={() => setLegalModal(null)}
            title="Privacy Policy"
          >
            <PrivacyContent />
          </LegalModal>

        </div>
      </div>
    </div>
  )
}