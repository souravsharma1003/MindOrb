import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts'
import DashboardLayout from '../../components/ui/DashboardLayout'
import api from '../../services/api'
// FIX: removed dead import `DashboardSkeleton` from '../../components/ui/Skeleton'
import { NoInsightsEmpty } from '../../components/ui/EmptyState'
import { InsightsSkeleton } from '../../components/ui/DashboardSkeletons'

// ─── Constants ────────────────────────────────────────────────────────────────

// FIX: was defined inside Insights — recreated on every render for no reason
const EMOTION_PALETTE = {
  joy: '#F9CB42', trust: '#34d399', fear: '#38bdf8', surprise: '#5DCAA5',
  sadness: '#7c6af7', disgust: '#f97316', anger: '#f87171',
  anticipation: '#a78bfa', neutral: '#71717a',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// FIX: was defined inside Insights — caused full unmount+remount on every render
// (4 instances × every state change = unnecessary DOM churn)
function SectionHeader({ title }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="font-display font-semibold"
        style={{ fontSize: 15, color: 'var(--color-text-1)' }}>
        {title}
      </div>
      <div style={{
        width: 24, height: 3, borderRadius: 2,
        background: 'var(--color-accent)', marginTop: 5,
      }} />
    </div>
  )
}

// FIX: was defined inside Insights — Recharts receives a new component reference
// on every render, causing the tooltip to flicker and lose hover state each time.
// Reference stability is especially important for Recharts tooltip components.
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(15,15,26,0.97)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10, padding: '8px 12px',
    }}>
      <p style={{
        fontSize: 12, color: 'var(--color-accent-2)',
        fontFamily: 'var(--font-display)', fontWeight: 700,
      }}>
        {Math.round(payload[0].value)}
        {payload[0].name === 'score' ? '%' : ''}
      </p>
    </div>
  )
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

export default function Insights() {
  const [overview, setOverview] = useState(null)
  const [emotions, setEmotions] = useState(null)
  const [cli, setCli]           = useState(null)
  const [weekly, setWeekly]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [fetchError, setFetchError] = useState(false) // FIX: track Promise.all failures

  const width    = useWindowWidth()
  const isMobile = width < 768

  useEffect(() => {
    Promise.all([
      api.get('/insights/overview'),
      api.get('/insights/emotions'),
      api.get('/insights/cognitive-load'),
      api.get('/insights/weekly-reflection'),
    ])
      .then(([ov, em, cl, wk]) => {
        setOverview(ov.data)
        setEmotions(em.data)
        setCli(cl.data)
        setWeekly(wk.data)
      })
      // FIX: was silently swallowed — all state stayed null and the page
      // rendered as an empty-chart layout with no indication of failure
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false))
  }, [])
  if (loading) return (
    <DashboardLayout title="Insights" subtitle="Patterns & trends">
      <InsightsSkeleton />
    </DashboardLayout>
  )

  // FIX: fetch error state — previously this fell through to empty charts silently
  if (fetchError) return (
    <DashboardLayout title="Insights" subtitle="Patterns & trends">
      <div style={{ padding: '60px 0', textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: 'var(--color-red)', marginBottom: 12 }}>
          Failed to load insights
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '8px 20px', borderRadius: 10, cursor: 'pointer',
            border: '1px solid var(--color-border)',
            background: 'transparent', color: 'var(--color-text-2)',
            fontSize: 13, fontFamily: 'var(--font-display)',
          }}>
          Retry
        </button>
      </div>
    </DashboardLayout>
  )

  // FIX: NoInsightsEmpty was imported but never rendered.
  // Now used when the user has no sessions or overview reports empty.
  if (!overview || overview.empty) return (
    <DashboardLayout title="Insights" subtitle="Patterns & trends">
      <NoInsightsEmpty />
    </DashboardLayout>
  )

  // ── Derived data ────────────────────────────────────────────────────────────

  const emotionPieData = emotions?.percentages
    ? Object.entries(emotions.percentages)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: k, value: v, color: EMOTION_PALETTE[k] }))
    : []

  const cliTrend = (cli?.trend || []).map((t, i) => ({
    i: i + 1,
    index: t.index,
    label: t.label,
  }))

  const sentimentBar = (overview?.timeline || []).slice(-10).map((t, i) => ({
    i: i + 1,
    score: t.positivityScore,
  }))

  // ── Responsive layout values ────────────────────────────────────────────────
  const twoColGrid      = isMobile ? '1fr' : '1fr 1fr'
  const sentimentGrid   = isMobile ? '1fr' : 'repeat(3, 1fr)'
  // Emotion wheel: pie + legend side-by-side on tablet+, stacked on mobile
  const emotionInnerGrid = isMobile ? '1fr' : 'auto 1fr'

  return (
    <DashboardLayout title="Insights" subtitle="Patterns & trends">

      {/* Positivity trend + Emotion profile */}
      <div style={{ display: 'grid', gridTemplateColumns: twoColGrid, gap: 14, marginBottom: 14 }}>

        {/* Positivity trend bar chart */}
        <div className="card" style={{ padding: 24 }}>
          <SectionHeader title="Positivity trend" />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={sentimentBar}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="0" />
              <XAxis dataKey="i" tick={{ fontSize: 10, fill: '#52525e' }}
                tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#52525e' }}
                tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="score" radius={[4, 4, 0, 0]} fill="rgba(124,106,247,0.6)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Emotion wheel */}
        <div className="card" style={{ padding: 24 }}>
          <SectionHeader title="Emotion profile" />
          {emotionPieData.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: emotionInnerGrid,
              gap: 16, alignItems: 'center',
            }}>
              {/* FIX: PieChart has fixed pixel dims but is not in a ResponsiveContainer
                  so it can't shrink. On mobile we let it centre naturally at its fixed
                  size inside the full-width single-column layout, which is fine. */}
              <PieChart width={130} height={130}>
                <Pie data={emotionPieData} cx={60} cy={60} innerRadius={35}
                  outerRadius={58} dataKey="value" strokeWidth={0}>
                  {emotionPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {emotionPieData.slice(0, 5).map(e => (
                  <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: 2,
                      background: e.color, flexShrink: 0,
                    }} />
                    <span style={{
                      fontSize: 12, color: 'var(--color-text-2)',
                      flex: 1, textTransform: 'capitalize',
                    }}>
                      {e.name}
                    </span>
                    <span className="font-display font-bold" style={{ fontSize: 12, color: e.color }}>
                      {e.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--color-text-3)', fontSize: 13 }}>
              Complete more sessions to see your emotion profile
            </p>
          )}
          {emotions?.insight && (
            <p style={{
              fontSize: 12, color: 'var(--color-text-3)',
              marginTop: 12, lineHeight: 1.6,
              borderTop: '1px solid var(--color-border)', paddingTop: 10,
            }}>
              {emotions.insight}
            </p>
          )}
        </div>
      </div>

      {/* Cognitive load trend + Weekly reflection */}
      <div style={{ display: 'grid', gridTemplateColumns: twoColGrid, gap: 14, marginBottom: 14 }}>

        {/* CLI trend */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-start', marginBottom: 4,
          }}>
            <SectionHeader title="Cognitive load trend" />
            {cli?.avgCLI !== undefined && (
              <span className="font-display font-bold" style={{
                fontSize: 13, marginTop: 2,
                color: cli.avgCLI < 40 ? '#34d399' : cli.avgCLI < 65 ? '#fbbf24' : '#f87171',
              }}>
                Avg {cli.avgCLI} · {cli.avgLabel}
              </span>
            )}
          </div>
          {cliTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={cliTrend}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="i" tick={{ fontSize: 10, fill: '#52525e' }}
                  tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#52525e' }}
                  tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="index" radius={[4, 4, 0, 0]} fill="rgba(251,191,36,0.6)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: 'var(--color-text-3)', fontSize: 13 }}>
              Complete more sessions to see your cognitive load trend
            </p>
          )}
          {cli?.insight && (
            <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 10, lineHeight: 1.6 }}>
              {cli.insight}
            </p>
          )}
        </div>

        {/* Weekly reflection */}
        <div className="card" style={{ padding: 24 }}>
          <SectionHeader title="Weekly reflection" />
          <div style={{
            background: 'linear-gradient(135deg, rgba(124,106,247,0.1), rgba(52,211,153,0.07))',
            border: '1px solid rgba(124,106,247,0.2)',
            borderRadius: 14, padding: '16px 18px',
          }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                background: 'rgba(124,106,247,0.2)',
                border: '1px solid rgba(124,106,247,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 14 }}>✦</span>
              </div>
              <div>
                <div className="font-display font-semibold"
                  style={{ fontSize: 12, color: 'var(--color-accent-2)', marginBottom: 6 }}>
                  AI Reflection
                </div>
                <p style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.7, margin: 0 }}>
                  {weekly?.reflection || 'Complete at least 3 sessions this week to unlock your reflection.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sentiment breakdown */}
      <div className="card" style={{ padding: 24 }}>
        <SectionHeader title="Sentiment breakdown" />
        <div style={{ display: 'grid', gridTemplateColumns: sentimentGrid, gap: 20 }}>
          {[
            { label: 'Positive', value: overview?.sentimentBreakdown?.positive ?? 0, color: '#34d399' },
            { label: 'Neutral',  value: overview?.sentimentBreakdown?.neutral  ?? 0, color: '#52525e' },
            { label: 'Negative', value: overview?.sentimentBreakdown?.negative ?? 0, color: '#f87171' },
          ].map(s => (
            <div key={s.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-2)', fontWeight: 500 }}>
                  {s.label}
                </span>
                <span className="font-display font-bold" style={{ fontSize: 13, color: s.color }}>
                  {s.value}%
                </span>
              </div>
              <div className="progress-track" style={{ height: 6 }}>
                <div className="progress-fill" style={{ width: `${s.value}%`, background: s.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}