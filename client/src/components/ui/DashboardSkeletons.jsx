/* ════════════════════════════════════════════════════════════════
   DashboardSkeletons.jsx
   Drop-in skeleton components for every dashboard section.
   Each skeleton mirrors the exact layout of its real counterpart
   so there's zero layout shift when real data arrives.

   USAGE:
     import { OverviewSkeleton, SessionListSkeleton,
              InsightsSkeleton, CompareSkeleton } from './DashboardSkeletons'

     if (loading) return <OverviewSkeleton />
════════════════════════════════════════════════════════════════ */

// ─── CSS — injected once, guarded against double-injection & re-renders ───────
const CSS = `
  @keyframes sk-shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
  }
  .sk-bone {
    border-radius: 8px;
    background: linear-gradient(
      90deg,
      var(--color-shimmer-1) 0%,
      var(--color-shimmer-2) 50%,
      var(--color-shimmer-1) 100%
    );
    background-size: 400px 100%;
    animation: sk-shimmer 1.6s ease-in-out infinite;
    flex-shrink: 0;
  }
  .sk-bone-round { border-radius: 50%;   }
  .sk-bone-pill  { border-radius: 99px;  }

  /* Responsive layout overrides */
  .sk-stat-4  { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; }
  .sk-col-2   { display: grid; grid-template-columns: 1fr 1fr;       gap: 14px; }
  .sk-picker  { display: grid; grid-template-columns: 1fr 1fr;       gap: 14px; }

  @media (max-width: 767px) {
    .sk-stat-4 { grid-template-columns: repeat(2,1fr); }
    .sk-col-2  { grid-template-columns: 1fr; }
    .sk-picker { grid-template-columns: 1fr; }
  }
`

if (typeof document !== 'undefined' && !document.getElementById('sk-dash-style')) {
  const el = document.createElement('style')
  el.id = 'sk-dash-style'
  el.textContent = CSS
  document.head.appendChild(el)
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Bone({ w = '100%', h = 14, style = {}, round = false, pill = false }) {
  return (
    <div
      className={`sk-bone${round ? ' sk-bone-round' : pill ? ' sk-bone-pill' : ''}`}
      style={{ width: w, height: h, ...style }}
    />
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCardSkeleton() {
  return (
    <div style={{
      padding: '20px 22px', borderRadius: 16,
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <Bone w={80}  h={10} pill />
      <Bone w={56}  h={30} />
      <Bone w={100} h={9}  pill />
    </div>
  )
}

// ─── Bar chart ────────────────────────────────────────────────────────────────
// Uses proportional bar columns — more realistic than a single solid block.
function ChartSkeleton({ h = 220 }) {
  const pcts = [65, 40, 80, 55, 90, 45, 70, 35, 85, 60, 75, 50]
  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden',     // keeps % bars clipped inside
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      padding: 20, display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Bone w={120} h={12} pill />
        <Bone w={60}  h={10} pill />
      </div>
      <div style={{ height: h, display: 'flex', alignItems: 'flex-end', gap: 6, paddingTop: 12 }}>
        {pcts.map((pct, i) => (
          <Bone
            key={i}
            w="100%"
            h={`${pct}%`}
            style={{ borderRadius: '6px 6px 0 0', animationDelay: `${i * 0.06}s` }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Session row ──────────────────────────────────────────────────────────────
function SessionRowSkeleton() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '14px 20px', borderRadius: 12,
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
    }}>
      <Bone w={40} h={40} round />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <Bone w="55%" h={11} pill />
        <Bone w="35%" h={9}  pill />
      </div>
      <Bone w={48} h={26} pill />
    </div>
  )
}

// ─── Word chip row ────────────────────────────────────────────────────────────
function ChipRowSkeleton({ count = 8 }) {
  const widths = [52, 68, 44, 76, 58, 40, 66, 50]
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Bone key={i} pill
          w={widths[i % widths.length]} h={28}
          style={{ animationDelay: `${i * 0.04}s` }}
        />
      ))}
    </div>
  )
}

// ─── Emotion wheel placeholder ────────────────────────────────────────────────
function EmotionWheelSkeleton() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 16,
    }}>
      <Bone w={200} h={200} round />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PAGE-LEVEL EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/* Overview.jsx */
export function OverviewSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="sk-stat-4">
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
      <ChartSkeleton h={240} />
      <div className="sk-col-2">
        <ChartSkeleton h={180} />
        <ChartSkeleton h={180} />
      </div>
    </div>
  )
}

/* Sessions.jsx */
export function SessionListSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <Bone w={140} h={14} pill />
        <Bone w={80}  h={28} pill />
      </div>
      {/* animationDelay placed on the Bone inside each row, not on the wrapper */}
      {Array.from({ length: 6 }).map((_, i) => <SessionRowSkeleton key={i} />)}
    </div>
  )
}

/* Insights.jsx */
export function InsightsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="sk-col-2">
        <EmotionWheelSkeleton />
        <ChartSkeleton h={200} />
      </div>
      <div style={{
        padding: 22, borderRadius: 16,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <Bone w={160} h={12} pill />
        <Bone w="90%" h={10} pill />
        <Bone w="75%" h={10} pill />
        <Bone w="82%" h={10} pill />
      </div>
      <ChipRowSkeleton count={10} />
    </div>
  )
}

/* Compare.jsx */
export function CompareSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Session pickers */}
      <div className="sk-picker">
        {[0, 1].map(i => (
          <div key={i} style={{
            padding: 16, borderRadius: 14,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <Bone w={80}    h={10} pill />
            <Bone w="100%"  h={38} style={{ borderRadius: 10 }} />
          </div>
        ))}
      </div>

      {/* Radar — capped at min(260px, 100%) so it never overflows on mobile */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 32,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 16,
      }}>
        <Bone w="min(260px, 100%)" h={260} round />
      </div>

      {/* Stat diff rows */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 18px', borderRadius: 12,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}>
          <Bone w={90} h={10} pill style={{ flex: 1 }} />
          <Bone w={40} h={24} pill />
          <Bone w={40} h={24} pill />
        </div>
      ))}
    </div>
  )
}

/* Generic — use for any custom loading state */
export function CardSkeleton({ lines = 3, height = 120 }) {
  return (
    <div style={{
      padding: 20, borderRadius: 16,
      minHeight: height,                        // minHeight instead of fixed height
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      display: 'flex', flexDirection: 'column',
      gap: 10, justifyContent: 'center',
    }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Bone key={i} pill
          w={i === 0 ? '40%' : i % 2 === 0 ? '80%' : '65%'}
          h={11}
          style={{ animationDelay: `${i * 0.08}s` }}
        />
      ))}
    </div>
  )
}