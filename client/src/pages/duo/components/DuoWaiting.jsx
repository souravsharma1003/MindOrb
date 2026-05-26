/* ════════════════════════════════════════════════════════════════
   DuoWaiting.jsx
   Drop-in component for the DuoSession waiting state.

   USAGE — inside DuoSession.jsx, wherever you detect that the
   current user has submitted but the partner hasn't yet:

     import DuoWaiting from './components/DuoWaiting'

     // In your polling logic:
     const myDone      = room?.sessionA?.submitted || room?.sessionB?.submitted
     const partnerDone = room?.status === 'complete'

     {myDone && !partnerDone && (
       <DuoWaiting partnerName={room.partnerName} wordsSubmitted={myWords.length} />
     )}

   Props:
     partnerName   string   — display name of the partner (optional)
     wordsSubmitted number  — how many words you entered (for the summary pill)
════════════════════════════════════════════════════════════════ */

const CSS = `
  @keyframes dw-breathe {
    0%,100% { transform: scale(1);   opacity: 0.85; }
    50%      { transform: scale(1.1); opacity: 1;    }
  }
  @keyframes dw-orbit {
    from { transform: rotate(0deg)   translateX(52px) rotate(0deg); }
    to   { transform: rotate(360deg) translateX(52px) rotate(-360deg); }
  }
  @keyframes dw-orbit-r {
    from { transform: rotate(180deg) translateX(52px) rotate(-180deg); }
    to   { transform: rotate(540deg) translateX(52px) rotate(-540deg); }
  }
  @keyframes dw-up   { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes dw-dot  { 0%,80%,100%{transform:scale(0.6);opacity:0.3} 40%{transform:scale(1);opacity:1} }
  @keyframes dw-ring { 0%,100%{box-shadow:0 0 0 0 rgba(124,106,247,0)} 50%{box-shadow:0 0 0 16px rgba(124,106,247,0.08)} }
`

export default function DuoWaiting({ partnerName, wordsSubmitted = 10 }) {
  const name = partnerName || 'your partner'

  return (
    <>
      <style>{CSS}</style>
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100%', gap: 40,
        fontFamily: 'var(--font-display, Outfit, sans-serif)',
        background: 'var(--color-bg)',
      }}>

        {/* ── Orbiting orbs ── */}
        <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>

          {/* Outer ring pulse */}
          <div style={{
            position: 'absolute', inset: -8, borderRadius: '50%',
            border: '1px solid rgba(124,106,247,0.12)',
            animation: 'dw-ring 3s ease-in-out infinite',
          }} />

          {/* Your orb — center, breathing */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 32%, #ddd6fe, #7c6af7 48%, #4f3fb5)',
              boxShadow: '0 0 32px rgba(124,106,247,0.45), inset 0 1px 0 var(--color-white-alpha-25)',
              animation: 'dw-breathe 3.2s ease-in-out infinite',
            }} />
          </div>

          {/* Partner orb — orbiting */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 32%, var(--color-white-alpha-35), var(--color-white-alpha-08))',
              border: '1px solid var(--color-white-alpha-20)',
              animation: 'dw-orbit 4s linear infinite',
            }} />
          </div>

          {/* Second smaller dot — counter-orbiting */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: 'rgba(124,106,247,0.4)',
              animation: 'dw-orbit-r 6.5s linear infinite',
            }} />
          </div>
        </div>

        {/* ── Text ── */}
        <div style={{
          textAlign: 'center',
          animation: 'dw-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both',
        }}>
          <h2 style={{
            fontSize: 18, fontWeight: 700,
            color: 'var(--color-text-1)',
            marginBottom: 8, lineHeight: 1.2,
          }}>
            Waiting for {name}
          </h2>
          <p style={{
            fontSize: 13,
            color: 'var(--color-text-3)',
            lineHeight: 1.6,
          }}>
            You're done — sit tight while they finish their round
          </p>
        </div>

        {/* ── Typing indicator ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 20px', borderRadius: 99,
          background: 'var(--color-hover)',
          border: '1px solid var(--color-white-alpha-08)',
          animation: 'dw-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.2s both',
        }}>
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: 'var(--color-text-3)',
          }}>
            {name} is writing
          </span>
          {/* Bouncing dots */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 5, height: 5, borderRadius: '50%',
                background: 'var(--color-accent, #7c6af7)',
                animation: `dw-dot 1.4s ease-in-out ${i * 0.16}s infinite`,
              }} />
            ))}
          </div>
        </div>

        {/* ── Your summary pill ── */}
        <div style={{
          padding: '12px 24px', borderRadius: 14,
          background: 'rgba(124,106,247,0.08)',
          border: '1px solid rgba(124,106,247,0.2)',
          textAlign: 'center',
          animation: 'dw-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.3s both',
        }}>
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--color-text-3)', marginBottom: 4,
          }}>
            Your round
          </p>
          <p style={{
            fontSize: 22, fontWeight: 900, lineHeight: 1,
            color: 'var(--color-accent-2, #a78bfa)',
          }}>
            {wordsSubmitted} words
          </p>
          <p style={{
            fontSize: 11, color: 'var(--color-text-3)', marginTop: 4,
          }}>
            submitted
          </p>
        </div>

      </div>
    </>
  )
}