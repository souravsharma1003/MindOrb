import { useState, useEffect, useRef } from 'react'
import { useOrbColor } from '../../../hooks/useOrbColor'

/* ════════════════════════════════════════════════════════════════
   SESSION ORB
   Uses useOrbColor for smooth "ink-drop" colour transitions
   between emotions instead of snapping to static hex values.

   NOTE: useOrbColor MUST memoize `subscribe` and `setEmotion`
   with useCallback (stable references). If they change on every
   render the subscription effect will teardown/re-attach on every
   keystroke, causing missed color frames during active typing.
════════════════════════════════════════════════════════════════ */

/* ── Helpers ──────────────────────────────────────────────────────────────
   FIX: replace brittle inline regex with a validated helper.
   If `glow` is not an rgba() string (e.g. hex, hsl, rgb) the regex
   won't match — previously this silently poisoned the boxShadow value.
   Now it falls back to the original glow string at full opacity.
─────────────────────────────────────────────────────────────────────────── */
function withAlpha(color, alpha) {
  const result = color.replace(/[\d.]+\)$/, `${alpha})`)
  return result !== color ? result : color   // fallback: unchanged if no match
}

export default function SessionOrb({ emotion, isReacting, breathPhase }) {
  const { setEmotion, subscribe, getColors } = useOrbColor(emotion)
  const [colors, setColors] = useState(getColors)

  // FIX: track the subscribe reference in a ref.
  // If useOrbColor ever returns an un-memoized subscribe, this prevents
  // subscription churn (teardown + re-attach) on every render.
  const subscribeRef = useRef(subscribe)
  useEffect(() => { subscribeRef.current = subscribe }, [subscribe])

  // Subscribe to animated color updates (runs every rAF tick during transitions)
  useEffect(() => {
    // Always subscribe via the ref so we use the latest version
    // without making it a dependency that triggers re-subscription.
    return subscribeRef.current(setColors)
  }, []) // intentionally stable — see NOTE above

  // Drive the hook whenever the parent changes emotion
  useEffect(() => {
    setEmotion(emotion)
  }, [emotion, setEmotion])

  // NOTE: breathPhase === 'inhale' is currently always false because Session.jsx
  // has breathPhase hardcoded to 'neutral' (setBreathPhase is never called).
  // The ternary is kept so this component works correctly if/when it is wired up.
  const scale = isReacting ? 1.12 : breathPhase === 'inhale' ? 1.04 : 1

  // FIX: responsive orb dimensions — scales down on narrow phones (< 382px)
  // while staying at designed size on larger screens.
  //   container: min(260px, 68vw)  → 320px: 218px · 375px: 255px · 382px+: 260px
  //   core:      min(160px, 42vw)  → 320px: 134px · 375px: 157px · 381px+: 160px
  const containerSize = 'min(260px, 68vw)'
  const coreSize      = 'min(160px, 42vw)'

  return (
    // FIX: aria-hidden — purely decorative animated element, screen readers skip it
    <div
      aria-hidden="true"
      className="relative flex items-center justify-center"
      style={{ width: containerSize, height: containerSize }}
    >
      {/* Outer ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          border: `1px solid ${colors.c2}20`,
          transform: `scale(${scale * 1.15})`,
          transition: 'transform 0.8s cubic-bezier(0.34,1.56,0.64,1)',
          willChange: 'transform',
        }}
      />

      {/* Middle ring */}
      <div
        className="absolute rounded-full"
        style={{
          inset: 20,
          border: `1px solid ${colors.c2}30`,
          transform: `scale(${scale * 1.06})`,
          transition: 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1)',
          willChange: 'transform',
        }}
      />

      {/* Core */}
      <div
        style={{
          width: coreSize,
          height: coreSize,
          borderRadius: '50%',
          background: `radial-gradient(circle at 35% 32%, ${colors.c1} 0%, ${colors.c2} 45%, ${colors.c3} 100%)`,
          // FIX: use withAlpha() instead of inline regex — prevents silent
          // boxShadow corruption if glow is ever not an rgba() string
          boxShadow: `0 0 80px 20px ${colors.glow}, 0 0 160px 40px ${withAlpha(colors.glow, '0.15')}, inset 0 1px 0 rgba(255,255,255,0.3)`,
          transform: `scale(${scale})`,
          transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
          // FIX: will-change promotes this to its own compositor layer,
          // eliminating layout thrash during rAF-driven color updates
          willChange: 'transform',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Inner highlight */}
        <div
          style={{
            position: 'absolute',
            top: '18%',
            left: '22%',
            width: '30%',
            height: '20%',
            background: 'rgba(255,255,255,0.25)',
            borderRadius: '50%',
            filter: 'blur(6px)',
          }}
        />
      </div>
    </div>
  )
}