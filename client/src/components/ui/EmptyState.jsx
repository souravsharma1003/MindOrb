import { useNavigate } from 'react-router-dom'

// ─── Inject orb-pulse keyframe once ──────────────────────────────────────────
// The animation was referenced in the original but never defined — orb was static.
if (typeof document !== 'undefined' && !document.getElementById('empty-state-style')) {
  const el = document.createElement('style')
  el.id = 'empty-state-style'
  el.textContent = `
    @keyframes orb-pulse {
      0%, 100% { transform: scale(1);    box-shadow: 0 0 40px rgba(124,106,247,0.20); }
      50%       { transform: scale(1.07); box-shadow: 0 0 56px rgba(124,106,247,0.38); }
    }
    /* Reduce vertical padding on short / small screens */
    .empty-state-wrap { padding: 72px 32px; }
    @media (max-width: 767px), (max-height: 600px) {
      .empty-state-wrap { padding: 40px 24px; }
    }
  `
  document.head.appendChild(el)
}

// ─── Base component ───────────────────────────────────────────────────────────
function EmptyState({ icon, title, subtitle, action, onAction }) {
  return (
    <div
      className="empty-state-wrap"
      style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', gap: 16,
      }}
    >
      {/* Orb icon */}
      <div style={{
        width: 72, height: 72, borderRadius: '50%', marginBottom: 8,
        background: 'radial-gradient(circle at 35% 35%, #c4b5fd, #7c6af7 50%, #4f3fb5)',
        boxShadow: '0 0 40px rgba(124,106,247,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 28, opacity: 0.7,
        animation: 'orb-pulse 4s ease-in-out infinite',   // now actually defined
      }}>
        {icon}
      </div>

      <div>
        <h3 style={{
          fontSize: 17, fontWeight: 600,
          fontFamily: 'var(--font-display)',
          color: 'var(--color-text-1)',
          letterSpacing: '-0.01em', marginBottom: 8,
          margin: '0 0 8px',
        }}>
          {title}
        </h3>
        <p style={{
          fontSize: 13, color: 'var(--color-text-3)',
          lineHeight: 1.65, maxWidth: 320, margin: '0 auto',
          fontFamily: 'var(--font-body)',
        }}>
          {subtitle}
        </p>
      </div>

      {action && (
        <button
          onClick={onAction}
          style={{
            marginTop: 8, padding: '10px 24px', borderRadius: 10,
            border: 'none', cursor: 'pointer',
            background: 'var(--color-accent)', color: '#fff',
            fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-display)',
            boxShadow: '0 0 20px rgba(124,106,247,0.3)',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          {action}
        </button>
      )}
    </div>
  )
}

// ─── Named variants ───────────────────────────────────────────────────────────

export function NoSessionsEmpty() {
  const navigate = useNavigate()
  return (
    <EmptyState
      icon="◎"
      title="No sessions yet"
      subtitle="Complete your first session to see your mood timeline, word cloud, and cognitive insights here."
      action="Start first session"
      onAction={() => navigate('/session')}
    />
  )
}

export function NoSessionsListEmpty() {
  const navigate = useNavigate()
  return (
    <EmptyState
      icon="📋"
      title="No sessions recorded"
      subtitle="Each session you complete will appear here with your words, story, and full analysis."
      action="Begin a session"
      onAction={() => navigate('/session')}
    />
  )
}

export function NoCompareEmpty() {
  const navigate = useNavigate()
  return (
    <EmptyState
      icon="⇄"
      title="Need at least 2 sessions"
      subtitle="Complete two or more sessions to compare your cognitive dimensions, reaction times, and stories side by side."
      action="Start a session"
      onAction={() => navigate('/session')}
    />
  )
}

export function NoInsightsEmpty() {
  const navigate = useNavigate()
  return (
    <EmptyState
      icon="✦"
      title="Insights unlock over time"
      subtitle="Complete a few sessions and MindOrb will start detecting patterns in your mood, reaction times, and word choices."
      action="Begin first session"
      onAction={() => navigate('/session')}
    />
  )
}

export function SelectSessionEmpty() {
  return (
    <EmptyState
      icon="◎"
      title="Select a session"
      subtitle="Click any session on the left to see its full breakdown — words, story, emotional arc, and cognitive load."
    />
  )
}