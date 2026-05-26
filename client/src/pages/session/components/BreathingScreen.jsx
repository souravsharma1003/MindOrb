import { useReducer, useEffect, useRef } from 'react'

const TOTAL_CYCLES = 2

const CSS = `
  @keyframes br-pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.5);opacity:0.7} }
  @keyframes br-fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  .br-screen { animation: br-fadeIn 0.5s ease both; }
`

/* ── Reducer ───────────────────────────────────────────────────────────────
   All breathing state lives here. Updater functions must be pure (no side
   effects, no nested setState calls) — this replaces the previous pattern
   of calling setPhase inside setCount's updater and setCycles inside
   setPhase's updater, which violated React's rules for updater functions.
─────────────────────────────────────────────────────────────────────────── */
const initialState = { phase: 'inhale', count: 4, cycles: 0, done: false }

function reducer(state, _action) {
  // FIX: once done, ignore all further ticks — prevents onComplete firing
  // multiple times if the parent is slow to unmount.
  if (state.done) return state

  // Count still has ticks left — just decrement
  if (state.count > 1) {
    return { ...state, count: state.count - 1 }
  }

  // Count reached 1 — flip phase and reset count
  const nextPhase  = state.phase === 'inhale' ? 'exhale' : 'inhale'
  const nextCycles = nextPhase === 'inhale' ? state.cycles + 1 : state.cycles
  const done       = nextCycles >= TOTAL_CYCLES

  return { phase: nextPhase, count: 4, cycles: nextCycles, done }
}

export default function BreathingScreen({ onComplete }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { phase, count, cycles, done } = state

  // FIX: store onComplete in a ref so the interval effect has zero
  // dependencies — a new function reference from the parent (e.g. if
  // useSession doesn't memoize beginRound) will no longer restart the
  // interval mid-breath.
  const onCompleteRef = useRef(onComplete)
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  // Stable interval — no dependencies, never restarts
  useEffect(() => {
    const iv = setInterval(() => dispatch(), 1000)
    return () => clearInterval(iv)
  }, [])

  // FIX: side effect (calling onComplete) lives in its own effect, watching
  // the pure `done` flag — not buried inside a state updater.
  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => onCompleteRef.current?.(), 800)
    return () => clearTimeout(t)
  }, [done])

  // ── Progress math (unchanged) ──────────────────────────────────────────
  // 0 = upcoming · 1 = active · 2 = completed
  const totalSteps     = TOTAL_CYCLES * 2
  const completedSteps = cycles * 2 + (phase === 'exhale' ? 1 : 0)
  const activeStep     = completedSteps < totalSteps ? completedSteps : totalSteps - 1

  return (
    <>
      {/* NOTE: global CSS injected here is intentional for the keyframes.
          In React 18 useInsertionEffect would be marginally more correct,
          but <style> in render is safe and well-supported for this use case. */}
      <style>{CSS}</style>
      <div className="br-screen" style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100%', gap: 40,
        fontFamily: 'var(--font-display, Outfit, sans-serif)',
      }}>

        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-1)', marginBottom: 6 }}>
            Take a breath
          </h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-3)' }}>
            Settle your mind before the session
          </p>
        </div>

        {/* Breathing orb */}
        <div style={{ position: 'relative', width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Outer ring */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '1px solid rgba(124,106,247,0.15)',
            transform: phase === 'inhale' ? 'scale(1.12)' : 'scale(1)',
            transition: 'transform 4s cubic-bezier(0.4,0,0.2,1)',
          }} />
          {/* Middle ring */}
          <div style={{
            position: 'absolute', inset: 20, borderRadius: '50%',
            border: '1px solid rgba(124,106,247,0.2)',
            transform: phase === 'inhale' ? 'scale(1.08)' : 'scale(1)',
            transition: 'transform 4s cubic-bezier(0.4,0,0.2,1)',
          }} />
          {/* Core orb */}
          <div style={{
            width: 130, height: 130, borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 32%, #ddd6fe, #7c6af7 45%, #4f3fb5)',
            boxShadow: '0 0 60px 15px rgba(124,106,247,0.3), inset 0 1px 0 var(--color-white-alpha-25)',
            transform: phase === 'inhale' ? 'scale(1.1)' : 'scale(0.92)',
            transition: 'transform 4s cubic-bezier(0.4,0,0.2,1)',
          }} />
          {/* Count */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
          }}>
            <span style={{ fontSize: 38, fontWeight: 800, color: 'var(--color-text-1)', lineHeight: 1 }}>
              {count}
            </span>
          </div>
        </div>

        {/* Phase label + graduated dots */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-1)', letterSpacing: '0.01em' }}>
            {phase === 'inhale' ? 'Inhale' : 'Exhale'}
          </span>

          {/* Dots — size conveys state clearly */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {Array.from({ length: totalSteps }).map((_, i) => {
              const dotState = i < completedSteps ? 'done' : i === activeStep ? 'active' : 'upcoming'

              const size   = dotState === 'done' ? 10 : dotState === 'active' ? 8 : 5
              const bg     = dotState === 'done'
                ? 'var(--color-accent)'
                : dotState === 'active'
                  ? 'rgba(124,106,247,0.75)'
                  : 'var(--color-hover-2)'
              const shadow = dotState === 'done'
                ? '0 0 8px rgba(124,106,247,0.6)'
                : dotState === 'active'
                  ? '0 0 10px rgba(124,106,247,0.5)'
                  : 'none'
              const label  = i % 2 === 0 ? '↑' : '↓'

              return (
                <div key={`step-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <div style={{
                    width: size, height: size, borderRadius: '50%',
                    background: bg, boxShadow: shadow,
                    transition: 'width 0.4s cubic-bezier(0.34,1.56,0.64,1), height 0.4s cubic-bezier(0.34,1.56,0.64,1), background 0.3s',
                    animation: dotState === 'active' ? 'br-pulse 1.8s ease-in-out infinite' : 'none',
                  }} />
                  <span style={{
                    fontSize: 9, fontWeight: 700,
                    color: dotState === 'done' ? 'rgba(124,106,247,0.7)' : 'var(--color-white-alpha-15)',
                    transition: 'color 0.3s',
                  }}>
                    {label}
                  </span>
                </div>
              )
            })}
          </div>

          <p style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2 }}>
            {completedSteps < totalSteps
              ? `${totalSteps - completedSteps} breath${totalSteps - completedSteps !== 1 ? 's' : ''} remaining`
              : 'Starting session…'}
          </p>
        </div>

      </div>
    </>
  )
}