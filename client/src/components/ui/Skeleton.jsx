import { useEffect } from 'react'

// ─── Shimmer keyframe ─────────────────────────────────────────────────────────
const SHIMMER_CSS = `
  @keyframes skeleton-shimmer {
    0%   { background-position: 200% center; }
    100% { background-position: -200% center; }
  }
`

// Guard against SSR / test environments where document is undefined.
// Also avoids double-injection on HMR hot-reloads.
if (typeof document !== 'undefined' && !document.getElementById('skeleton-style')) {
  const el = document.createElement('style')
  el.id = 'skeleton-style'
  el.textContent = SHIMMER_CSS
  document.head.appendChild(el)
}

// ─── Base bone ────────────────────────────────────────────────────────────────
function Bone({ width = '100%', height = 16, radius = 6, style = {} }) {
  return (
    <div style={{
      width, height,
      borderRadius: radius,
      background: 'linear-gradient(90deg, var(--color-surface-2) 25%, var(--color-surface-3) 50%, var(--color-surface-2) 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeleton-shimmer 1.6s ease-in-out infinite',
      flexShrink: 0,
      ...style,
    }} />
  )
}

// ─── Card wrapper shared by most skeletons ────────────────────────────────────
function SkeletonCard({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 20, padding: 24,
      ...style,
    }}>
      {children}
    </div>
  )
}

// ─── Section header (title bone + accent underline) ───────────────────────────
function SkeletonHeader({ titleWidth = 100 }) {
  return (
    <>
      <Bone width={titleWidth} height={14} radius={4} style={{ marginBottom: 8 }} />
      <Bone width={24} height={3} radius={2} style={{ marginBottom: 18 }} />
    </>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────
export function StatCardSkeleton() {
  return (
    <SkeletonCard style={{ padding: '22px 24px' }}>
      <Bone width={80}  height={10} radius={4} style={{ marginBottom: 14 }} />
      <Bone width={60}  height={36} radius={6} style={{ marginBottom: 10 }} />
      <Bone width={100} height={10} radius={4} />
    </SkeletonCard>
  )
}

// ─── Chart card ───────────────────────────────────────────────────────────────
export function ChartSkeleton({ height = 200 }) {
  return (
    <SkeletonCard>
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <Bone width={120} height={14} radius={4} style={{ marginBottom: 8 }} />
          <Bone width={24}  height={3}  radius={2} />
        </div>
        <Bone width={80} height={28} radius={8} />
      </div>
      <Bone width="100%" height={height} radius={10} />
    </SkeletonCard>
  )
}

// ─── Session row ──────────────────────────────────────────────────────────────
export function SessionRowSkeleton() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '10px 12px',
      borderBottom: '1px solid var(--color-border)',
    }}>
      <Bone width={40} height={40} radius={20} />
      <div style={{ flex: 1 }}>
        <Bone width={120} height={12} radius={4} style={{ marginBottom: 6 }} />
        <Bone width={180} height={10} radius={4} />
      </div>
      <Bone width={44} height={22} radius={99} />
    </div>
  )
}

// ─── Word cloud ───────────────────────────────────────────────────────────────
export function WordCloudSkeleton() {
  const widths = [60, 90, 70, 110, 55, 85, 65, 95, 75, 80, 60, 100]
  return (
    <SkeletonCard>
      <SkeletonHeader titleWidth={100} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {widths.map((w, i) => (
          <Bone key={i} width={w} height={28} radius={99} />
        ))}
      </div>
    </SkeletonCard>
  )
}

// ─── Insight list ─────────────────────────────────────────────────────────────
export function InsightRowSkeleton() {
  // Pairs: [line1%, line2%] — line2 is always narrower than line1
  const rows = [[100, 80], [85, 68], [95, 78], [75, 58]]
  return (
    <SkeletonCard>
      <SkeletonHeader titleWidth={100} />
      {rows.map(([w1, w2], i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '10px 0',
          borderBottom: i < rows.length - 1 ? '1px solid var(--color-border)' : 'none',
        }}>
          <Bone width={7} height={7} radius={99} style={{ marginTop: 5 }} />
          <div style={{ flex: 1 }}>
            <Bone width={`${w1}%`} height={11} radius={4} style={{ marginBottom: 5 }} />
            <Bone width={`${w2}%`} height={10} radius={4} />
          </div>
        </div>
      ))}
    </SkeletonCard>
  )
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────
export function HeatmapSkeleton() {
  return (
    <SkeletonCard>
      <SkeletonHeader titleWidth={100} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 210 }}>
        {Array.from({ length: 28 }).map((_, i) => (
          <Bone key={i} width={13} height={13} radius={3} />
        ))}
      </div>
    </SkeletonCard>
  )
}

// ─── Radar ────────────────────────────────────────────────────────────────────
export function RadarSkeleton() {
  return (
    <SkeletonCard>
      <SkeletonHeader titleWidth={140} />
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, alignItems: 'center' }}>
        <Bone width={170} height={170} radius={999} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[70, 85, 60, 90, 75].map((w, i) => (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <Bone width={60} height={10} radius={4} />
                <Bone width={30} height={10} radius={4} />
              </div>
              <Bone width="100%" height={4} radius={2} />
            </div>
          ))}
        </div>
      </div>
    </SkeletonCard>
  )
}

// ─── Full dashboard skeleton ──────────────────────────────────────────────────
// Responsive CSS injected alongside shimmer keyframe
if (typeof document !== 'undefined' && !document.getElementById('skeleton-layout-style')) {
  const el = document.createElement('style')
  el.id = 'skeleton-layout-style'
  el.textContent = `
    .sk-stat-grid   { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-bottom: 22px; }
    .sk-chart-grid  { display: grid; grid-template-columns: 1fr 300px;    gap: 14px; margin-bottom: 22px; }
    .sk-radar-grid  { display: grid; grid-template-columns: 1fr 1fr;       gap: 14px; margin-bottom: 22px; }

    @media (max-width: 767px) {
      .sk-stat-grid  { grid-template-columns: repeat(2,1fr); }
      .sk-chart-grid { grid-template-columns: 1fr; }
      .sk-radar-grid { grid-template-columns: 1fr; }
    }
  `
  document.head.appendChild(el)
}

export function DashboardSkeleton() {
  return (
    <div>
      <div className="sk-stat-grid">
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
      <div className="sk-chart-grid">
        <ChartSkeleton height={200} />
        <HeatmapSkeleton />
      </div>
      <div className="sk-radar-grid">
        <RadarSkeleton />
        <WordCloudSkeleton />
      </div>
      <InsightRowSkeleton />
    </div>
  )
}

// ─── Sessions list skeleton ───────────────────────────────────────────────────
export function SessionsListSkeleton() {
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 20, overflow: 'hidden',
    }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)' }}>
        <Bone width={100} height={14} radius={4} style={{ marginBottom: 6 }} />
        <Bone width={24}  height={3}  radius={2} />
      </div>
      <div style={{ padding: 6 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <SessionRowSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}