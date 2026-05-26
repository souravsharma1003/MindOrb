import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, ReferenceLine,
} from 'recharts'
import DashboardLayout from '../../components/ui/DashboardLayout'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { NoSessionsEmpty } from '../../components/ui/EmptyState'
import { OverviewSkeleton } from '../../components/ui/DashboardSkeletons'

// ─── Constants ────────────────────────────────────────────────────────────────

const TEAL_STEPS = ['#1c2a24', '#163d2b', '#1d5c3f', '#1d9e75', '#0f6e56']

// Hoisted out of the render loop — was being recreated on every map iteration
const RADAR_COLORS = ['#7c6af7', '#34d399', '#38bdf8', '#fbbf24', '#f87171']

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, delta, deltaLabel, color }) {
  const isPos = delta > 0
  return (
    <div className="card" style={{ padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--color-text-3)',
        fontFamily: 'var(--font-display)', marginBottom: 12,
      }}>
        {label}
      </div>
      <div className="font-display font-bold"
        style={{ fontSize: 38, lineHeight: 1, color: color || 'var(--color-text-1)', letterSpacing: '-0.03em' }}>
        {value}
      </div>
      {delta !== undefined && (
        <div style={{
          marginTop: 8, fontSize: 11, fontWeight: 600,
          color: isPos ? 'var(--color-green)' : delta < 0 ? 'var(--color-red)' : 'var(--color-text-3)',
        }}>
          {isPos ? '↑' : delta < 0 ? '↓' : ''} {deltaLabel}
        </div>
      )}
    </div>
  )
}

function SectionHeader({ title }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="font-display font-semibold"
        style={{ fontSize: 15, color: 'var(--color-text-1)', letterSpacing: '-0.01em' }}>
        {title}
      </div>
      <div style={{
        width: 24, height: 3, borderRadius: 2,
        background: 'var(--color-accent)', marginTop: 5,
      }} />
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--color-landing-nav)', border: '1px solid var(--color-hover-2)',
      borderRadius: 10, padding: '10px 14px',
    }}>
      <p style={{ fontSize: 11, color: 'var(--color-text-3)', marginBottom: 4 }}>Day {label}</p>
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-accent-2)', fontFamily: 'var(--font-display)' }}>
        {Math.round(payload[0].value)}% positivity
      </p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Overview() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange]     = useState(30)
  const { user }              = useAuth()
  const navigate              = useNavigate()  // eslint-disable-line no-unused-vars
  const width                 = useWindowWidth()

  const isMobile = width < 768
  const isTablet = width >= 768 && width <= 1024

  useEffect(() => {
    api.get('/insights/overview')
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // ── ALL hooks must come before any early returns (Rules of Hooks) ──────────
  // Null-guard inside each memo so they're safe to run before data loads.

  const latestSession = data?.latestSession ?? null

  // Radar raw values — recomputes only when latestSession changes
  const radarData = useMemo(() => {
    if (!latestSession) return []
    const totalWords = latestSession.words?.length || 1
    return [
      { axis: 'Positivity',    value: latestSession.positivityScore ?? 0 },
      { axis: 'Average Speed', value: latestSession.avgReactionTime ?? 0, isMs: true },
      { axis: 'Variety',       value: Math.round((new Set(latestSession.words?.map(w => w.word) || []).size / totalWords) * 100) },
      { axis: 'Clarity',       value: Math.max(0, 100 - (latestSession.cognitiveLoadIndex?.index ?? 50)) },
      { axis: 'Energy',        value: Math.round(((latestSession.words || []).filter(w => Math.abs(w.sentimentScore) > 0.6).length / totalWords) * 100) },
    ]
  }, [latestSession])

  // Normalised 0-100 for the radar chart (Speed inverted: lower ms = higher score)
  const radarChartData = useMemo(() =>
    radarData.map(d =>
      d.isMs
        ? { axis: d.axis, value: Math.round(Math.max(0, 100 - (d.value / 2000) * 100)) }
        : { axis: d.axis, value: d.value }
    ),
  [radarData])

  // ── Early returns AFTER all hooks ─────────────────────────────────────────
  if (loading) return (
    <DashboardLayout title="Overview" subtitle="Your cognitive snapshot">
      <OverviewSkeleton />
    </DashboardLayout>
  )
  if (!data || data.empty) return (
    <DashboardLayout title="Overview" subtitle="Your cognitive snapshot">
      <NoSessionsEmpty />
    </DashboardLayout>
  )

  const {
    weeklyComparison: wc, sentimentBreakdown: sb, timeline,
    wordCloud, heatmap, patterns, totalSessions,
  } = data

  const chartData = (timeline || [])
    .slice(-range)
    .map((t, i) => ({
      i: i + 1,
      score: t.positivityScore,
      label: new Date(t.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    }))

  // ─── Responsive layout values ──────────────────────────────────────────────
  // Stat strip: 2 cols on mobile, 4 on tablet+
  const statCols = isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)'
  // Timeline + heatmap: stacked on mobile/tablet, side-by-side on desktop
  const timelineCols = isMobile || isTablet ? '1fr' : '1fr 300px'
  // Radar + word cloud: stacked on mobile, side-by-side on tablet+
  const insightCols = isMobile ? '1fr' : '1fr 1fr'

  return (
    <DashboardLayout title="Overview" subtitle="Your cognitive snapshot">

      {/* Stat strip */}
      <div style={{ display: 'grid', gridTemplateColumns: statCols, gap: 14, marginBottom: 22 }}>
        <StatCard
          label="Total sessions"
          value={totalSessions}
          delta={wc?.thisWeek?.sessions}
          deltaLabel={`${wc?.thisWeek?.sessions} this week`}
        />
        <StatCard
          label="Avg positivity"
          value={`${wc?.thisWeek?.avgPositivity ?? 0}%`}
          color="var(--color-accent-2)"
          delta={wc?.delta}
          deltaLabel={`${Math.abs(wc?.delta ?? 0)}% vs last week`}
        />
        <StatCard
          label="Current streak"
          value={data.latestSession ? `${user?.streak} days` : '0 days'}
          color="var(--color-amber)"
          deltaLabel="days in a row"
        />
        <StatCard
          label="Top emotion"
          value={data.wordCloud?.[0]?.word ?? '—'}
          deltaLabel={`used ${data.wordCloud?.[0]?.count ?? 0}x`}
        />
      </div>

      {/* Mood timeline + heatmap */}
      <div style={{ display: 'grid', gridTemplateColumns: timelineCols, gap: 14, marginBottom: 22 }}>

        {/* Chart */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            marginBottom: 18, flexWrap: 'wrap', gap: 10,
          }}>
            <SectionHeader title="Mood timeline" />
            <div style={{
              display: 'flex', background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)', borderRadius: 10, padding: 3, gap: 2,
            }}>
              {[7, 14, 30].map(d => (
                <button key={d} onClick={() => setRange(d)} style={{
                  padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
                  fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-display)',
                  background: range === d ? 'var(--color-surface-3)' : 'transparent',
                  color: range === d ? 'var(--color-text-1)' : 'var(--color-text-3)',
                  // FIX: removed duplicate `border: 'none'` — last declaration wins anyway,
                  // but having two border keys in one object is a bug waiting to confuse.
                  border: range === d ? '1px solid var(--color-border-2)' : '1px solid transparent',
                }}>
                  {d}D
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="var(--color-hover)" strokeDasharray="0" />
              <XAxis dataKey="i" tick={{ fontSize: 10, fill: 'var(--color-chart-tick)', fontFamily: 'DM Sans' }}
                tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--color-chart-tick)' }}
                tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              {user?.baselineScore != null && (
                <ReferenceLine
                  y={user.baselineScore}
                  stroke="rgba(251,191,36,0.5)"
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                  label={{
                    value: `baseline ${user.baselineScore}%`,
                    position: 'insideTopRight',
                    fill: 'rgba(251,191,36,0.6)',
                    fontSize: 9,
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                  }}
                />
              )}
              <Line type="monotone" dataKey="score" stroke="#7c6af7" strokeWidth={2}
                dot={{ r: 3, fill: '#7c6af7', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#a78bfa' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Heatmap */}
        <div className="card" style={{ padding: 24 }}>
          <SectionHeader title="Daily heatmap" />
          <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginBottom: 10 }}>
            Last 28 days
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 210 }}>
            {(heatmap || []).map((cell, i) => {
              const s = cell.score
              const idx = !s ? 0 : s < 50 ? 1 : s < 65 ? 2 : s < 80 ? 3 : 4
              return (
                <div
                  key={i}
                  title={s ? `${Math.round(s)}%` : 'No session'}
                  style={{
                    width: 13, height: 13, borderRadius: 3,
                    background: s ? TEAL_STEPS[idx] : 'var(--color-icon-bg)',
                    border: '1px solid var(--color-hover)',
                    cursor: 'default', transition: 'transform 0.12s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.5)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                />
              )
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14 }}>
            <span style={{ fontSize: 10, color: 'var(--color-text-3)' }}>Low</span>
            {TEAL_STEPS.map((c, i) => (
              <div key={i} style={{ width: 11, height: 11, borderRadius: 3, background: c }} />
            ))}
            <span style={{ fontSize: 10, color: 'var(--color-text-3)' }}>High</span>
          </div>
        </div>
      </div>

      {/* Radar + Word cloud */}
      <div style={{ display: 'grid', gridTemplateColumns: insightCols, gap: 14, marginBottom: 22 }}>

        {/* Radar */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
            <SectionHeader title="Cognitive dimensions" />
            <span className="badge badge-accent" style={{ marginTop: 2 }}>Latest session</span>
          </div>
          {radarData.length > 0 ? (
            <div style={{
              display: 'grid',
              // On mobile, stack the radar above the bars
              gridTemplateColumns: isMobile ? '1fr' : 'auto 1fr',
              gap: 16,
              alignItems: 'center',
            }}>
              {/* FIX: use "100%" width so ResponsiveContainer can actually resize.
                  The fixed 170 value defeated its own purpose on narrow screens. */}
              <ResponsiveContainer width="100%" height={170}>
                <RadarChart data={radarChartData}>
                  <PolarGrid stroke="var(--color-hover-2)" />
                  <PolarAngleAxis dataKey="axis"
                    tick={{ fontSize: 9, fill: 'var(--color-chart-tick)', fontFamily: 'DM Sans' }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar dataKey="value" stroke="#7c6af7" fill="rgba(124,106,247,0.15)"
                    strokeWidth={1.5} dot={{ r: 3, fill: '#7c6af7' }} />
                </RadarChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {radarData.map((d, i) => {
                  // FIX: RADAR_COLORS hoisted — was being recreated on every iteration
                  const barWidth = d.isMs
                    ? Math.round(Math.max(0, 100 - (d.value / 2000) * 100))
                    : d.value
                  const displayValue = d.isMs ? `${d.value}ms` : `${d.value}%`
                  return (
                    <div key={d.axis}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: 'var(--color-text-2)', fontWeight: 500 }}>{d.axis}</span>
                        <span className="font-display font-bold" style={{ fontSize: 12, color: RADAR_COLORS[i] }}>
                          {displayValue}
                        </span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${barWidth}%`, background: RADAR_COLORS[i] }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--color-text-3)', fontSize: 13 }}>Complete a session to see dimensions</p>
          )}
        </div>

        {/* Word cloud */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <SectionHeader title="Word cloud" />
            <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>All time</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 18 }}>
            {(wordCloud || []).slice(0, 14).map((w, i) => {
              const chipColor = w.sentiment === 'positive' ? '#34d399'
                : w.sentiment === 'negative' ? '#f87171' : 'var(--color-text-2)'
              const chipBg = w.sentiment === 'positive' ? 'rgba(52,211,153,0.1)'
                : w.sentiment === 'negative' ? 'rgba(248,113,113,0.1)' : 'var(--color-hover)'
              const chipBorder = w.sentiment === 'positive' ? 'rgba(52,211,153,0.2)'
                : w.sentiment === 'negative' ? 'rgba(248,113,113,0.2)' : 'var(--color-border)'
              return (
                <span key={i} style={{
                  display: 'inline-block', padding: '4px 12px', borderRadius: 20,
                  fontWeight: 500, fontSize: 11 + (w.count * 1.5),
                  background: chipBg, color: chipColor, border: `1px solid ${chipBorder}`,
                  fontFamily: 'var(--font-display)',
                  cursor: 'default', transition: 'all 0.15s',
                }}>
                  {w.word}
                </span>
              )
            })}
          </div>
          <div style={{
            display: 'flex', gap: 10, paddingTop: 16,
            borderTop: '1px solid var(--color-border)',
          }}>
            {[
              { label: 'Positive', value: sb?.positive ?? 0, color: '#34d399' },
              { label: 'Neutral',  value: sb?.neutral  ?? 0, color: 'var(--color-text-2)' },
              { label: 'Negative', value: sb?.negative ?? 0, color: '#f87171' },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, textAlign: 'center' }}>
                <div className="font-display font-bold"
                  style={{ fontSize: 20, color: s.color }}>{s.value}%</div>
                <div style={{
                  fontSize: 10, color: 'var(--color-text-3)',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  fontFamily: 'var(--font-display)', marginTop: 3,
                }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Patterns */}
      {patterns?.length > 0 && (
        <div className="card" style={{ padding: 24 }}>
          <SectionHeader title="AI insights" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {patterns.map((p, i) => {
              const dotColor = p.positive ? '#34d399'
                : p.type === 'warning' ? '#fbbf24' : '#7c6af7'
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 0',
                  borderBottom: i < patterns.length - 1 ? '1px solid var(--color-border)' : 'none',
                }}>
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: dotColor, marginTop: 5, flexShrink: 0,
                  }} />
                  <div>
                    <p style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.6, margin: 0 }}>
                      <strong style={{ color: 'var(--color-text-1)', fontWeight: 500 }}>
                        {p.text}
                      </strong>
                    </p>
                    {p.suggestion && (
                      <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 3, lineHeight: 1.5 }}>
                        {p.suggestion}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}