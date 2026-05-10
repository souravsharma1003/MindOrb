import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import DashboardLayout from '../../components/ui/DashboardLayout'
import api from '../../services/api'
import { toast } from '../../components/ui/Toast'

// ─── Constants ────────────────────────────────────────────────────────────────

const ORB_SKINS = [
  { id: 'default', g: ['#c4b5fd', '#7c6af7', '#4f3fb5'] },
  { id: 'crystal', g: ['#bae6fd', '#38bdf8', '#0369a1'] },
  { id: 'cosmic',  g: ['#fde68a', '#f59e0b', '#d97706'] },
  { id: 'smoke',   g: ['#d4d4d8', '#71717a', '#3f3f46'] },
]

const PREF_TIMES = ['morning', 'evening', 'anytime']

// ─── Main component ───────────────────────────────────────────────────────────

export default function DashSettings() {
  const { user, logout, updateUser } = useAuth()
  const navigate = useNavigate()

  const [name, setName]       = useState(user?.name || '')
  const [orbSkin, setOrbSkin] = useState(user?.orbSkin || 'default')
  const [prefTime, setPref]   = useState(user?.preferredTime || 'anytime')
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  // FIX: Row and ToggleRow were defined inside DashSettings but never used
  // in the JSX — completely dead code. Removed both.

  const handleSave = async () => {
    // FIX: guard against blank name before hitting the API
    if (!name.trim()) {
      toast.error('Display name cannot be empty')
      return
    }
    setSaving(true)
    try {
      const { data } = await api.patch('/users/profile', {
        name: name.trim(),
        orbSkin,
        preferredTime: prefTime,
      })
      updateUser(data.user)
      setSaved(true)
      toast.success('Profile updated')
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      toast.error('Failed to save changes')
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => { logout(); navigate('/auth') }

  return (
    <DashboardLayout title="Settings" subtitle="Preferences & profile">
      {/* FIX: added width:'100%' so the container fills correctly on mobile
          instead of potentially overflowing the sidebar gutter */}
      <div style={{ maxWidth: 520, width: '100%' }}>

        {/* Profile card */}
        <div className="card" style={{ padding: 24, marginBottom: 14 }}>
          <div className="font-display font-semibold"
            style={{ fontSize: 14, color: 'var(--color-text-1)', marginBottom: 16 }}>
            Profile
          </div>

          {/* Avatar + summary */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: 14, background: 'var(--color-surface-2)',
            borderRadius: 12, border: '1px solid var(--color-border)',
            marginBottom: 16,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #a78bfa, #34d399)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, color: '#fff',
              fontFamily: 'var(--font-display)',
            }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="font-display font-semibold"
                style={{ fontSize: 15, color: 'var(--color-text-1)' }}>
                {user?.name}
              </div>
              <div style={{
                fontSize: 12, color: 'var(--color-text-3)', marginTop: 2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user?.email} · {user?.totalSessions} sessions
              </div>
            </div>
          </div>

          {/* Display name input */}
          <div>
            <label style={{
              fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--color-text-3)',
              fontFamily: 'var(--font-display)', display: 'block', marginBottom: 6,
            }}>
              Display name
            </label>
            <input
              className="input-field"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
        </div>

        {/* Preferences card */}
        <div className="card" style={{ padding: 24, marginBottom: 14 }}>
          <div className="font-display font-semibold"
            style={{ fontSize: 14, color: 'var(--color-text-1)', marginBottom: 16 }}>
            Preferences
          </div>

          {/* Preferred time */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--color-text-3)',
              fontFamily: 'var(--font-display)', display: 'block', marginBottom: 6,
            }}>
              Preferred time
            </label>
            {/* FIX: flexWrap so buttons survive very narrow screens */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PREF_TIMES.map(t => (
                <button key={t} onClick={() => setPref(t)} style={{
                  flex: 1, minWidth: 80,
                  padding: '8px', borderRadius: 8, cursor: 'pointer',
                  background: prefTime === t ? 'rgba(124,106,247,0.15)' : 'var(--color-surface-2)',
                  color: prefTime === t ? 'var(--color-accent-2)' : 'var(--color-text-3)',
                  // FIX: removed duplicate `border: 'none'` — two `border` keys in one
                  // style object means the first is silently ignored. Single declaration only.
                  border: prefTime === t
                    ? '1px solid rgba(124,106,247,0.3)'
                    : '1px solid var(--color-border)',
                  fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-display)',
                  textTransform: 'capitalize', transition: 'all 0.15s',
                }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Orb skin */}
          <div>
            <label style={{
              fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--color-text-3)',
              fontFamily: 'var(--font-display)', display: 'block', marginBottom: 6,
            }}>
              Orb skin
            </label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {ORB_SKINS.map(skin => (
                <div key={skin.id} onClick={() => setOrbSkin(skin.id)}
                  style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 6, cursor: 'pointer',
                  }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: `radial-gradient(circle at 35% 35%, ${skin.g[0]}, ${skin.g[1]} 45%, ${skin.g[2]})`,
                    boxShadow: orbSkin === skin.id
                      ? `0 0 0 2px var(--color-accent), 0 0 16px ${skin.g[1]}66`
                      : 'none',
                    transition: 'box-shadow 0.2s',
                  }} />
                  <span style={{
                    fontSize: 10, textTransform: 'capitalize',
                    color: orbSkin === skin.id ? 'var(--color-accent-2)' : 'var(--color-text-3)',
                    fontFamily: 'var(--font-display)',
                  }}>
                    {skin.id}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1, minWidth: 0,
              padding: '11px', borderRadius: 10, border: 'none',
              // FIX: cursor now reflects disabled state
              cursor: saving ? 'not-allowed' : 'pointer',
              background: saved ? 'var(--color-green)' : 'var(--color-accent)',
              color: '#fff', fontSize: 14, fontWeight: 600,
              fontFamily: 'var(--font-display)', transition: 'background 0.3s',
              opacity: saving ? 0.7 : 1,
            }}>
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save changes'}
          </button>
          <button
            onClick={handleLogout}
            style={{
              // FIX: minWidth:0 prevents text clipping on very narrow screens
              minWidth: 0,
              padding: '11px 20px', borderRadius: 10, cursor: 'pointer',
              background: 'rgba(248,113,113,0.1)',
              border: '1px solid rgba(248,113,113,0.2)',
              color: '#f87171', fontSize: 14, fontWeight: 600,
              fontFamily: 'var(--font-display)',
            }}>
            Log out
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}