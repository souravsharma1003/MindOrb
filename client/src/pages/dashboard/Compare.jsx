import { useEffect, useState } from 'react'
import {
  RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from 'recharts'
import DashboardLayout from '../../components/ui/DashboardLayout'
import api from '../../services/api'
import { NoCompareEmpty } from '../../components/ui/EmptyState'
import { CompareSkeleton } from '../../components/ui/DashboardSkeletons'

// ─── Constants ────────────────────────────────────────────────────────────────

const EMOTION_COLORS = {
  joy: '#F9CB42', trust: '#34d399', fear: '#38bdf8', surprise: '#5DCAA5',
  sadness: '#7c6af7', disgust: '#f97316', anger: '#f87171',
  anticipation: '#a78bfa', neutral: '#71717a',
}
const SENTIMENT_CHIP = {
  positive: { bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.25)',  text: '#34d399' },
  negative: { bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.25)', text: '#f87171' },
  neutral:  { bg: 'rgba(142,142,160,0.1)',  border: 'rgba(142,142,160,0.2)',  text: '#8e8ea0' },
}

// ─── Pure helpers (module-level — no closures, no need to live inside component) ──

// FIX: was defined inside Compare — recreated on every render for no reason
const formatDate = d => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })

// FIX: was defined inside Compare — pure function with no closures
const getRadarData = (radar, session) => [
  { axis: 'Positivity', value: radar?.positivity ?? 0 },
  { axis: 'Speed',      value: Math.round(Math.max(0, 100 - ((session?.avgReactionTime ?? 2000) / 2000) * 100)) },
  { axis: 'Variety',    value: radar?.variety   ?? 0 },
  { axis: 'Clarity',    value: radar?.calm      ?? 0 },
  { axis: 'Energy',     value: radar?.focus     ?? 0 },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

// FIX: was defined INSIDE Compare — caused every PickerRow to fully unmount + remount
// on every selA/selB state change because React saw a new component type each render.
// On 20 sessions that's 20 unmount/mount cycles per single picker click.
function PickerRow({ session, isSelA, isSelB, onPickA, onPickB }) {
  const eColor = EMOTION_COLORS[session.dominantEmotion] || '#71717a'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 10px', borderRadius: 10, cursor: 'pointer',
      borderBottom: '1px solid var(--color-border)',
      background: isSelA ? 'rgba(124,106,247,0.1)' : isSelB ? 'rgba(52,211,153,0.08)' : 'transparent',
      transition: 'background 0.15s',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: `radial-gradient(circle at 35% 35%, ${eColor}cc, ${eColor})`,
        boxShadow: `0 0 8px ${eColor}44`,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="font-display font-semibold"
          style={{ fontSize: 12, color: 'var(--color-text-1)' }}>
          {formatDate(session.createdAt)}
        </div>
        <div style={{ fontSize: 10, color: 'var(--color-text-3)' }}>
          {session.moodLabel} · {session.positivityScore}%
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={() => onPickA(session._id)} style={{
          width: 22, height: 22, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: isSelA ? 'var(--color-accent)' : 'rgba(255,255,255,0.08)',
          color: isSelA ? '#fff' : 'var(--color-text-3)',
          fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-display)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>A</button>
        <button onClick={() => onPickB(session._id)} style={{
          width: 22, height: 22, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: isSelB ? 'var(--color-green)' : 'rgba(255,255,255,0.08)',
          color: isSelB ? '#052e16' : 'var(--color-text-3)',
          fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-display)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>B</button>
      </div>
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

export default function Compare() {
  const [sessions, setSessions]     = useState([])
  const [selA, setSelA]             = useState(null)
  const [selB, setSelB]             = useState(null)
  const [result, setResult]         = useState(null)
  const [loading, setLoading]       = useState(false)
  const [listError, setListError]   = useState(false)    // FIX: track sessions fetch errors
  const [compareError, setCompareError] = useState(false) // FIX: track compare fetch errors

  const width    = useWindowWidth()
  const isMobile = width < 768
  const isTablet = width >= 768 && width <= 1024

  useEffect(() => {
    setListError(false)
    api.get('/sessions?limit=20')
      .then(r => setSessions(r.data.sessions))
      // FIX: was silently swallowed — failed fetch looked identical to "no sessions"
      .catch(() => setListError(true))
  }, [])

  useEffect(() => {
    if (!selA || !selB) return
    setLoading(true)
    setCompareError(false)
    api.get(`/sessions/compare?a=${selA}&b=${selB}`)
      .then(r => setResult(r.data))
      // FIX: was silently swallowed — fell back to "select sessions" with no indication of failure
      .catch(() => setCompareError(true))
      .finally(() => setLoading(false))
  }, [selA, selB])

  const combinedRadar = result
    ? getRadarData(result.sessionA.radar, result.sessionA).map((d, i) => ({
        axis: d.axis,
        A:    d.value,
        B:    getRadarData(result.sessionB.radar, result.sessionB)[i].value,
      }))
    : []

  // ── Responsive layout values ───────────────────────────────────────────────
  // Outer grid: pickers sidebar + results
  const outerCols = isMobile ? '1fr' : '240px 1fr'
  // Radar + delta bars: stacked on mobile, side-by-side on tablet+
  const radarCols = isMobile ? '1fr' : 'minmax(0, 220px) 1fr'
  // Score header: stacked on mobile, 3-col on tablet+
  const scoreCols = isMobile ? '1fr' : '1fr auto 1fr'
  // Words: stacked on mobile (A then B), side-by-side on tablet+
  const wordCols  = isMobile ? '1fr' : '1fr 1px 1fr'

  return (
    <DashboardLayout title="Compare" subtitle="Session vs session">
      <div style={{ display: 'grid', gridTemplateColumns: outerCols, gap: 14 }}>

        {/* ── Pickers ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* FIX: show a distinct error state if the sessions list failed to load */}
          {listError ? (
            <div className="card" style={{ padding: 24, textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--color-red)', marginBottom: 8 }}>
                Failed to load sessions
              </p>
              <button
                onClick={() => { setListError(false); api.get('/sessions?limit=20').then(r => setSessions(r.data.sessions)).catch(() => setListError(true)) }}
                style={{
                  padding: '6px 16px', borderRadius: 8, cursor: 'pointer',
                  border: '1px solid var(--color-border)',
                  background: 'transparent', color: 'var(--color-text-2)',
                  fontSize: 12, fontFamily: 'var(--font-display)',
                }}>
                Retry
              </button>
            </div>
          ) : (
            ['A', 'B'].map(letter => (
              <div key={letter} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{
                  padding: '12px 14px 10px',
                  background: letter === 'A' ? 'rgba(124,106,247,0.08)' : 'rgba(52,211,153,0.06)',
                  borderBottom: `1px solid ${letter === 'A' ? 'rgba(124,106,247,0.15)' : 'rgba(52,211,153,0.15)'}`,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: letter === 'A' ? 'var(--color-accent)' : 'var(--color-green)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
                    color: letter === 'A' ? '#fff' : '#052e16',
                  }}>
                    {letter}
                  </div>
                  <span className="font-display font-medium"
                    style={{ fontSize: 13, color: 'var(--color-text-1)' }}>
                    Session {letter}
                  </span>
                </div>
                <div style={{ maxHeight: 260, overflowY: 'auto', padding: 4 }}>
                  {sessions.map(s => (
                    <PickerRow key={s._id} session={s}
                      isSelA={selA === s._id} isSelB={selB === s._id}
                      onPickA={id => { if (id !== selB) setSelA(id) }}
                      onPickB={id => { if (id !== selA) setSelB(id) }}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Results ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {sessions.length < 2 && !listError ? (
            <div className="card" style={{ padding: 0 }}>
              <NoCompareEmpty />
            </div>
          ) : !selA || !selB ? (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>⇄</div>
              <div className="font-display font-semibold"
                style={{ fontSize: 15, color: 'var(--color-text-2)' }}>
                Select session A and B to compare
              </div>
            </div>
          ) : loading ? (
            <CompareSkeleton />
          ) : compareError ? (
            /* FIX: was silently falling back to "select sessions" on API failure */
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>⚠</div>
              <p style={{ fontSize: 13, color: 'var(--color-red)', marginBottom: 8 }}>
                Failed to load comparison
              </p>
              <button
                onClick={() => { setCompareError(false); setSelA(s => s); }}
                style={{
                  padding: '6px 16px', borderRadius: 8, cursor: 'pointer',
                  border: '1px solid var(--color-border)',
                  background: 'transparent', color: 'var(--color-text-2)',
                  fontSize: 12, fontFamily: 'var(--font-display)',
                }}>
                Retry
              </button>
            </div>
          ) : result ? (
            <>
              {/* Score header */}
              <div className="card" style={{ padding: 24 }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: scoreCols,
                  gap: 20, alignItems: 'center',
                }}>
                  {[
                    { session: result.sessionA, color: 'var(--color-accent-2)', letter: 'A' },
                    null,
                    { session: result.sessionB, color: 'var(--color-green)', letter: 'B' },
                  ].map((item) => {
                    if (!item) {
                      const diff = result.sessionB.positivityScore - result.sessionA.positivityScore
                      const col = diff > 0 ? '#34d399' : diff < 0 ? '#f87171' : 'var(--color-text-2)'
                      // On mobile hide the centre delta column — it's squeezed between the two scores
                      if (isMobile) return null
                      return (
                        <div key="delta" style={{ textAlign: 'center' }}>
                          <div className="font-display font-bold"
                            style={{ fontSize: 26, color: col }}>
                            {diff > 0 ? '↑' : diff < 0 ? '↓' : '='} {Math.abs(diff)}%
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2 }}>
                            difference
                          </div>
                        </div>
                      )
                    }
                    const eColor = EMOTION_COLORS[item.session.dominantEmotion] || '#71717a'
                    return (
                      <div key={item.letter}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 52, height: 52, borderRadius: '50%',
                          background: `radial-gradient(circle at 35% 35%, ${eColor}cc, ${eColor})`,
                          boxShadow: `0 0 20px ${eColor}55`,
                        }} />
                        <div className="font-display font-semibold"
                          style={{ fontSize: 13, color: item.color }}>
                          {formatDate(item.session.createdAt)}
                        </div>
                        <div className="font-display font-bold"
                          style={{ fontSize: 36, color: 'var(--color-text-1)', lineHeight: 1 }}>
                          {item.session.positivityScore}%
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>positivity</div>
                        {/* On mobile: show the delta inline under Session B */}
                        {isMobile && item.letter === 'B' && (() => {
                          const diff = result.sessionB.positivityScore - result.sessionA.positivityScore
                          const col = diff > 0 ? '#34d399' : diff < 0 ? '#f87171' : 'var(--color-text-2)'
                          return (
                            <div style={{ textAlign: 'center', marginTop: 4 }}>
                              <span className="font-display font-bold"
                                style={{ fontSize: 14, color: col }}>
                                {diff > 0 ? '↑' : diff < 0 ? '↓' : '='} {Math.abs(diff)}% difference
                              </span>
                            </div>
                          )
                        })()}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Radar + delta bars */}
              <div style={{ display: 'grid', gridTemplateColumns: radarCols, gap: 14 }}>
                <div className="card" style={{ padding: 22 }}>
                  <div className="font-display font-semibold"
                    style={{ fontSize: 13, color: 'var(--color-text-1)', marginBottom: 12 }}>
                    Dimension overlay
                  </div>
                  {/* FIX: width="100%" so ResponsiveContainer can actually resize.
                      Fixed pixel width={200} made the radar overflow on narrow screens. */}
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={combinedRadar}>
                      <PolarGrid stroke="rgba(255,255,255,0.07)" />
                      <PolarAngleAxis dataKey="axis"
                        tick={{ fontSize: 9, fill: '#52525e', fontFamily: 'DM Sans' }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar dataKey="A" stroke="#7c6af7" fill="rgba(124,106,247,0.12)"
                        strokeWidth={1.5} dot={{ r: 3, fill: '#7c6af7' }} />
                      <Radar dataKey="B" stroke="#34d399" fill="rgba(52,211,153,0.1)"
                        strokeWidth={1.5} dot={{ r: 3, fill: '#34d399' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
                    {[
                      { color: '#7c6af7', label: formatDate(result.sessionA.createdAt), key: 'legend-A' },
                      { color: '#34d399', label: formatDate(result.sessionB.createdAt), key: 'legend-B' },
                    ].map(l => (
                      <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 10, height: 3, borderRadius: 2, background: l.color }} />
                        <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card" style={{ padding: 22 }}>
                  <div className="font-display font-semibold"
                    style={{ fontSize: 13, color: 'var(--color-text-1)', marginBottom: 12 }}>
                    Axis delta
                  </div>
                  {combinedRadar.map(d => {
                    const diff = d.B - d.A
                    const col = diff > 0 ? '#34d399' : diff < 0 ? '#f87171' : '#52525e'
                    return (
                      <div key={d.axis} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                        <span style={{
                          fontSize: 12, color: 'var(--color-text-3)',
                          width: 80, flexShrink: 0,
                        }}>
                          {d.axis}
                        </span>
                        <div style={{
                          flex: 1, height: 4, background: 'rgba(255,255,255,0.06)',
                          borderRadius: 2, position: 'relative',
                        }}>
                          <div style={{
                            position: 'absolute', top: 0, height: '100%', borderRadius: 2,
                            background: col,
                            ...(diff >= 0
                              ? { left: '50%', width: `${Math.min(50, Math.abs(diff) / 2)}%` }
                              : { right: '50%', width: `${Math.min(50, Math.abs(diff) / 2)}%` }),
                          }} />
                          <div style={{
                            position: 'absolute', top: -4, left: '50%',
                            width: 1, height: 12, background: 'rgba(255,255,255,0.15)',
                          }} />
                        </div>
                        <span className="font-display font-bold"
                          style={{ fontSize: 12, color: col, minWidth: 36, textAlign: 'right' }}>
                          {diff > 0 ? '+' : ''}{diff}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Words side by side */}
              <div className="card" style={{ padding: 22 }}>
                <div className="font-display font-semibold"
                  style={{ fontSize: 13, color: 'var(--color-text-1)', marginBottom: 14 }}>
                  Words
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: wordCols, gap: 16 }}>
                  {[
                    { session: result.sessionA, color: 'var(--color-accent-2)', letter: 'A' },
                    null,
                    { session: result.sessionB, color: 'var(--color-green)', letter: 'B' },
                  ].map((item) => {
                    // On mobile, skip the 1px divider — stacked layout has no use for it
                    if (!item) {
                      if (isMobile) return null
                      return <div key="divider" style={{ background: 'var(--color-border)' }} />
                    }
                    return (
                      <div key={item.letter}>
                        <div className="font-display font-semibold"
                          style={{ fontSize: 11, color: item.color, marginBottom: 10 }}>
                          {formatDate(item.session.createdAt)}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {(item.session.words || []).map((w, wi) => {
                            const c = SENTIMENT_CHIP[w.sentiment] || SENTIMENT_CHIP.neutral
                            return (
                              <span key={wi} style={{
                                fontSize: 11, fontWeight: 500,
                                padding: '3px 9px', borderRadius: 20,
                                background: c.bg, border: `1px solid ${c.border}`,
                                color: c.text, fontFamily: 'var(--font-display)',
                              }}>
                                {w.word}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </DashboardLayout>
  )
}