import { Toaster, toast as hotToast } from 'react-hot-toast'

// ─── Shared style base — single source of truth ───────────────────────────────
const base = {
  background:   'var(--color-surface-2)',
  color:        'var(--color-text-1)',
  borderRadius:  12,
  fontSize:      13,
  fontFamily:   'var(--font-body)',
  fontWeight:    500,
  padding:      '10px 14px',
  boxShadow:    '0 8px 32px var(--color-toast-bg)',
  // Never overflow on mobile — clamps below 340px on small screens
  maxWidth:     'min(340px, calc(100vw - 32px))',
}

// ─── Dot icon helper ──────────────────────────────────────────────────────────
function Dot({ color, symbol }) {
  return (
    <div style={{
      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
      background: `${color}26`,          // 15% opacity
      border:     `1px solid ${color}4d`, // 30% opacity
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, color, lineHeight: 1,
    }}>
      {symbol}
    </div>
  )
}

// ─── ToastProvider ────────────────────────────────────────────────────────────
export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      gutter={10}
      toastOptions={{
        duration: 3500,
        style: {
          ...base,
          border: '1px solid var(--color-border)',   // fixed: was --color-border-2 (undefined)
        },
      }}
    />
  )
}

// ─── Typed toast helpers ──────────────────────────────────────────────────────
export const toast = {

  success: (msg) => hotToast(msg, {
    icon: <Dot color="#34d399" symbol="✓" />,
    style: { ...base, border: '1px solid rgba(52,211,153,0.25)' },
  }),

  error: (msg) => hotToast(msg, {
    icon: <Dot color="#f87171" symbol="✕" />,
    duration: 4500,
    style: { ...base, border: '1px solid rgba(248,113,113,0.25)' },
  }),

  info: (msg) => hotToast(msg, {
    icon: <Dot color="#a78bfa" symbol="✦" />,
    style: { ...base, border: '1px solid rgba(124,106,247,0.25)' },
  }),

  // Added — completes the set, uses --color-amber token
  warn: (msg) => hotToast(msg, {
    icon: <Dot color="#fbbf24" symbol="!" />,
    duration: 4000,
    style: { ...base, border: '1px solid rgba(251,191,36,0.25)' },
  }),

  streak: (days) => hotToast(`🔥 ${days} day streak!`, {
    duration: 4000,
    style: {
      ...base,
      color:      '#fbbf24',
      border:     '1px solid rgba(251,191,36,0.25)',
      fontSize:    14,
      fontFamily: 'var(--font-display)',
      fontWeight:  600,
    },
  }),

  session: (score, mood) => hotToast.custom(
    (t) => {
      const color = score >= 70 ? '#34d399' : score >= 45 ? '#fbbf24' : '#f87171'
      return (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          ...base,
          border:    `1px solid ${color}40`,
          opacity:    t.visible ? 1 : 0,
          transform:  t.visible ? 'translateY(0)' : 'translateY(8px)',
          transition: 'all 0.3s ease',
        }}>
          {/* Score chip */}
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: `${color}26`,
            border:     `1px solid ${color}4d`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
            color,
          }}>
            {score}%
          </div>

          <div>
            <div style={{
              fontSize: 13, fontWeight: 600,
              color: 'var(--color-text-1)', fontFamily: 'var(--font-display)',
            }}>
              Session complete
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2 }}>
              {mood} · Story generated
            </div>
          </div>
        </div>
      )
    },
    { duration: 4000 }
  ),
}