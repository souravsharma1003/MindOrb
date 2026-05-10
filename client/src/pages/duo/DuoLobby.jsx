import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { Users, Link, ArrowRight, Hash } from 'lucide-react'

// ─── Static styles (module-level — no closures, no reason to live in the component) ──

// FIX: the entire `s` object was recreated on every render. Static sub-objects
// hoisted here; factory functions (tab, btn) hoisted as pure functions below.
const STYLES = {
  page: {
    minHeight: '100vh', background: 'var(--color-bg)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24,
  },
  shine: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 50%, transparent)',
  },
  tabBar: {
    display: 'flex', background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 10, padding: 3, gap: 2, marginBottom: 28,
  },
  input: {
    width: '100%', padding: '12px 14px', boxSizing: 'border-box',
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 10, color: 'var(--color-text-1)',
    fontSize: 18, fontFamily: 'var(--font-display)',
    fontWeight: 700, letterSpacing: '0.15em',
    textTransform: 'uppercase', textAlign: 'center',
    outline: 'none',
  },
  codeBox: {
    background: 'var(--color-surface-2)',
    border: '1px solid rgba(124,106,247,0.3)',
    borderRadius: 14, padding: '24px',
    textAlign: 'center', marginBottom: 16,
  },
  codeText: {
    fontFamily: 'var(--font-display)',
    fontSize: 48, fontWeight: 700,
    letterSpacing: '0.2em',
    color: 'var(--color-accent-2)',
    lineHeight: 1,
  },
}

// Pure factory — no closures; receives active as param
function tabStyle(active) {
  return {
    flex: 1, padding: '8px', borderRadius: 8,
    border: active ? '1px solid var(--color-border-2)' : '1px solid transparent',
    background: active ? 'var(--color-surface-3)' : 'transparent',
    color: active ? 'var(--color-text-1)' : 'var(--color-text-3)',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'var(--font-display)', transition: 'all .15s',
  }
}

// Pure factory — loading-dependent opacity is passed in, not closed over
function btnStyle(variant = 'primary', opacity = 1) {
  return {
    width: '100%', padding: 13, borderRadius: 10,
    border: 'none', cursor: opacity < 1 ? 'not-allowed' : 'pointer',
    background: variant === 'primary' ? 'var(--color-accent)' : 'var(--color-surface-2)',
    color: variant === 'primary' ? '#fff' : 'var(--color-text-2)',
    fontSize: 14, fontWeight: 600,
    fontFamily: 'var(--font-display)',
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    boxShadow: variant === 'primary' ? '0 0 24px rgba(124,106,247,0.3)' : 'none',
    transition: 'opacity .15s',
    opacity,
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth)
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return width
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DuoLobby() {
  // FIX: removed `user` — was destructured from useAuth() but never referenced
  const { }        = useAuth()
  const navigate   = useNavigate()

  const [tab, setTab]       = useState('create')  // 'create' | 'join'
  const [code, setCode]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [created, setCreated] = useState(null)   // room after creation
  const [copied, setCopied] = useState(false)    // clipboard feedback

  const width    = useWindowWidth()
  const isMobile = width < 768

  const handleCreate = async () => {
    setLoading(true); setError('')
    try {
      const { data } = await api.post('/duo')
      setCreated(data.room)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create room')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!code.trim()) { setError('Enter a room code'); return }
    setLoading(true); setError('')
    try {
      await api.post('/duo/join', { code: code.trim().toUpperCase() })
      navigate(`/duo/${code.trim().toUpperCase()}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Room not found')
    } finally {
      setLoading(false)
    }
  }

  const shareLink = created
    ? `${window.location.origin}/duo/join/${created.code}`
    : ''

  const handleCopy = () => {
    // FIX: was missing .catch() — clipboard API can throw on non-HTTPS or
    // browsers with strict permissions; user had no feedback on failure
    navigator.clipboard.writeText(shareLink)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => setError('Could not copy — please copy the link manually'))
  }

  // Responsive card padding: tighter horizontal on mobile
  const cardPadding = isMobile ? '32px 20px' : '40px 36px'

  return (
    <div style={STYLES.page}>
      <div style={{
        width: '100%', maxWidth: 440,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 24,
        // FIX: reduced horizontal padding on mobile so content isn't overly cramped
        padding: cardPadding,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={STYLES.shine} />

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, margin: '0 auto 14px',
            background: 'rgba(124,106,247,0.15)',
            border: '1px solid rgba(124,106,247,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Users size={22} color="var(--color-accent-2)" />
          </div>
          <h2 className="font-display" style={{
            fontSize: 22, fontWeight: 700, color: 'var(--color-text-1)',
            letterSpacing: '-0.02em', marginBottom: 6,
          }}>
            Duo session
          </h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-3)' }}>
            Do a session with a friend. Compare your minds at the end.
          </p>
        </div>

        {/* Tab bar */}
        {!created && (
          <div style={STYLES.tabBar}>
            {['create', 'join'].map(t => (
              <button key={t} onClick={() => { setTab(t); setError('') }}
                style={tabStyle(tab === t)}>
                {t === 'create' ? 'Create room' : 'Join room'}
              </button>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 14,
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.2)',
            color: '#f87171', fontSize: 12,
          }}>
            {error}
          </div>
        )}

        {/* CREATE — before room exists */}
        {tab === 'create' && !created && (
          <div>
            <p style={{
              fontSize: 13, color: 'var(--color-text-2)',
              lineHeight: 1.65, marginBottom: 20,
            }}>
              Create a room and share the code with a friend.
              Once they join, you both start your sessions independently
              and compare results at the end.
            </p>
            <button onClick={handleCreate} disabled={loading}
              style={btnStyle('primary', loading ? 0.6 : 1)}>
              {loading ? 'Creating…' : <><Users size={15} /> Create room</>}
            </button>
          </div>
        )}

        {/* CREATE — room created, show code */}
        {tab === 'create' && created && (
          <div>
            <div style={STYLES.codeBox}>
              <div style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'var(--color-text-3)',
                fontFamily: 'var(--font-display)', marginBottom: 10,
              }}>
                Room code
              </div>
              <div style={STYLES.codeText}>{created.code}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 8 }}>
                Share this code with your friend
              </div>
            </div>

            {/* Copy link */}
            {/* FIX: handleCopy now has .catch() for clipboard failures;
                button shows "Copied!" feedback for 2s on success */}
            <button onClick={handleCopy} style={{
              ...btnStyle('secondary'),
              marginBottom: 10,
              border: '1px solid var(--color-border)',
              background: copied ? 'rgba(52,211,153,0.1)' : 'var(--color-surface-2)',
              color: copied ? '#34d399' : 'var(--color-text-2)',
            }}>
              <Link size={14} />
              {copied ? 'Copied!' : 'Copy invite link'}
            </button>

            {/* Enter room */}
            <button onClick={() => navigate(`/duo/${created.code}`)} style={btnStyle()}>
              Enter room <ArrowRight size={15} />
            </button>

            <p style={{
              fontSize: 11, color: 'var(--color-text-3)',
              textAlign: 'center', marginTop: 14,
            }}>
              Room expires in 30 minutes
            </p>
          </div>
        )}

        {/* JOIN */}
        {tab === 'join' && (
          <div>
            <div style={{ marginBottom: 14 }}>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                color: 'var(--color-text-3)', fontFamily: 'var(--font-display)',
                marginBottom: 8,
              }}>
                Room code
              </label>
              <input
                style={STYLES.input}
                placeholder="XXXX"
                value={code}
                maxLength={4}
                // FIX: mobile keyboard improvements — uppercase entry,
                // no autocomplete noise, correct input mode
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                onChange={e => setCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
              />
            </div>
            {/* FIX: disabled check now uses code.trim().length to match handleJoin logic.
                Previously `code.length < 4` would enable the button for 4 spaces,
                then handleJoin's trim() would produce an empty string. */}
            <button
              onClick={handleJoin}
              disabled={loading || code.trim().length < 4}
              style={btnStyle('primary', (loading || code.trim().length < 4) ? 0.5 : 1)}>
              {loading ? 'Joining…' : <><Hash size={14} /> Join room</>}
            </button>
          </div>
        )}

        {/* Back to dashboard */}
        <button onClick={() => navigate('/dashboard')} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-text-3)', fontSize: 12,
          display: 'block', margin: '20px auto 0',
          fontFamily: 'var(--font-body)',
        }}>
          ← Back to dashboard
        </button>
      </div>
    </div>
  )
}