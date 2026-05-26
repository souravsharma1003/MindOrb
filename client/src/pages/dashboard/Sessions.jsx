import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/ui/DashboardLayout'
import { NoSessionsListEmpty, SelectSessionEmpty } from '../../components/ui/EmptyState'
import api from '../../services/api'
import { SessionListSkeleton } from '../../components/ui/DashboardSkeletons'

// ─── Constants ────────────────────────────────────────────────────────────────

const SENTIMENT_CHIP = {
  positive: { bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.25)',  text: '#34d399' },
  negative: { bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.25)', text: '#f87171' },
  neutral:  { bg: 'rgba(142,142,160,0.1)',  border: 'rgba(142,142,160,0.2)',  text: '#8e8ea0' },
}

const EMOTION_COLORS = {
  joy: '#F9CB42', trust: '#34d399', fear: '#38bdf8', surprise: '#5DCAA5',
  sadness: '#7c6af7', disgust: '#f97316', anger: '#f87171',
  anticipation: '#a78bfa', neutral: '#71717a',
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function OrbDot({ emotion, score }) {
  const color = EMOTION_COLORS[emotion] || '#71717a'
  return (
    <div style={{
      width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
      background: `radial-gradient(circle at 35% 35%, ${color}cc, ${color})`,
      boxShadow: `0 0 12px ${color}55`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
      color: '#fff',
    }}>
      {score}
    </div>
  )
}

// ─── SessionDetail ────────────────────────────────────────────────────────────
// onDelete(sessionId) — called after two-step confirm; parent handles API + cleanup

function SessionDetail({ detail, formatDate, onDelete }) {
  const s       = detail.session
  const arc     = detail.arcAnalysis
  const emotion = s.dominantEmotion || 'neutral'
  const eColor  = EMOTION_COLORS[emotion] || '#71717a'
  const chip    = SENTIMENT_CHIP[s.dominantSentiment] || SENTIMENT_CHIP.neutral

  // ── Delete state: 'idle' → 'confirm' → 'deleting' ─────────────────────────
  const [deleteStage, setDeleteStage] = useState('idle')

  const handleDelete = async () => {
    if (deleteStage === 'idle')    { setDeleteStage('confirm'); return }
    if (deleteStage === 'confirm') {
      setDeleteStage('deleting')
      await onDelete(s._id)
      // parent will clear detail — no need to reset state here
    }
  }

  // Reset confirm stage if user clicks elsewhere (blur-style timeout)
  useEffect(() => {
    if (deleteStage !== 'confirm') return
    const t = setTimeout(() => setDeleteStage('idle'), 4000)
    return () => clearTimeout(t)
  }, [deleteStage])

  // ── Sparkline helpers ──────────────────────────────────────────────────────
  const renderSparkline = () => {
    if (!s.words?.length) return null
    const pts = s.words.map(w => w.sentimentScore ?? 0)

    if (pts.length === 1) {
      return (
        <svg width="100%" viewBox="0 0 288 40" style={{ display: 'block', marginBottom: 8 }}>
          <circle cx={144} cy={20} r={4} fill="#7c6af7" />
        </svg>
      )
    }

    const W = 288, H = 40, pad = 4
    const minV = -1, maxV = 1
    const toX = i  => pad + (i / (pts.length - 1)) * (W - pad * 2)
    const toY = v  => pad + (1 - (v - minV) / (maxV - minV)) * (H - pad * 2)
    const zeroY = toY(0).toFixed(1)

    const linePath = pts.map((v, i) =>
      `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`
    ).join(' ')

    const fillPath = `${linePath} L${toX(pts.length - 1).toFixed(1)},${zeroY} L${toX(0).toFixed(1)},${zeroY} Z`

    const peakWord   = arc?.peakWord
    const valleyWord = arc?.valleyWord

    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', marginBottom: 8, overflow: 'visible' }}>
        <line x1={pad} y1={zeroY} x2={W - pad} y2={zeroY}
          stroke="var(--color-hover-2)" strokeWidth="1" />
        <path d={fillPath} fill="rgba(124,106,247,0.08)" />
        <path d={linePath} fill="none" stroke="#7c6af7"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((v, i) => {
          const word  = s.words[i]?.word
          const isPk  = word === peakWord
          const isVl  = word === valleyWord
          const color = isPk ? '#34d399' : isVl ? '#f87171' : 'rgba(124,106,247,0.5)'
          const r     = isPk || isVl ? 3.5 : 2
          return (
            <circle key={i}
              cx={toX(i).toFixed(1)} cy={toY(v).toFixed(1)}
              r={r} fill={color} />
          )
        })}
      </svg>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        marginBottom: 18, paddingBottom: 16,
        borderBottom: '1px solid var(--color-border)',
      }}>
        <OrbDot emotion={emotion} score={s.positivityScore} />
        <div>
          <div className="font-display font-bold"
            style={{ fontSize: 16, color: 'var(--color-text-1)' }}>
            {formatDate(s.createdAt)}
          </div>
          <span className="badge" style={{ ...chip, marginTop: 4, display: 'inline-flex' }}>
            {s.moodLabel} · {s.positivityScore}%
          </span>
        </div>
      </div>

      {/* Story */}
      {s.story && (
        <div style={{
          padding: '12px 14px', borderRadius: 10, marginBottom: 16,
          background: 'var(--color-surface-2)',
          borderLeft: `3px solid ${eColor}`,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.08em', color: 'var(--color-text-3)',
            fontFamily: 'var(--font-display)', marginBottom: 6,
          }}>
            Session story
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.65, margin: 0, fontStyle: 'italic' }}>
            "{s.story}"
          </p>
        </div>
      )}

      {/* Words */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.08em', color: 'var(--color-text-3)',
          fontFamily: 'var(--font-display)', marginBottom: 8,
        }}>
          Words used
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {(s.words || []).map((w, i) => {
            const c     = SENTIMENT_CHIP[w.sentiment] || SENTIMENT_CHIP.neutral
            const delta = w.sentimentScore >= 0
              ? `+${Math.round(w.sentimentScore * 100)}`
              : `${Math.round(w.sentimentScore * 100)}`
            return (
              <span key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontWeight: 500,
                padding: '3px 10px', borderRadius: 20,
                background: c.bg, border: `1px solid ${c.border}`,
                color: c.text, fontFamily: 'var(--font-display)',
              }}>
                {w.word}
                <span style={{ opacity: 0.55, fontSize: 9, fontWeight: 700 }}>{delta}</span>
              </span>
            )
          })}
        </div>
      </div>

      {/* Arc analysis */}
      {arc && (
        <div style={{
          padding: '10px 12px', borderRadius: 10, marginBottom: 16,
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.08em', color: 'var(--color-text-3)',
            fontFamily: 'var(--font-display)', marginBottom: 6,
          }}>
            Emotional arc · {arc.arc}
          </div>

          {renderSparkline()}

          <p style={{ fontSize: 12, color: 'var(--color-text-2)', margin: 0, lineHeight: 1.55 }}>
            {arc.insight}
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
              Peak: <strong style={{ color: '#34d399' }}>{arc.peakWord}</strong>
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
              Valley: <strong style={{ color: '#f87171' }}>{arc.valleyWord}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Cognitive load */}
      {s.cognitiveLoadIndex && (() => {
        const cli      = s.cognitiveLoadIndex
        const cliColor = cli.index < 40 ? '#34d399' : cli.index < 65 ? '#fbbf24' : '#f87171'
        return (
          <div style={{
            padding: '10px 12px', borderRadius: 10,
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 4,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{
                  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: 'var(--color-text-3)',
                  fontFamily: 'var(--font-display)',
                }}>
                  Cognitive load
                </div>
                <div style={{ position: 'relative', display: 'inline-flex' }}
                  onMouseEnter={e => e.currentTarget.querySelector('.cli-tip').style.display = 'block'}
                  onMouseLeave={e => e.currentTarget.querySelector('.cli-tip').style.display = 'none'}
                >
                  <span style={{
                    fontSize: 10, color: 'var(--color-text-3)',
                    border: '1px solid var(--color-white-alpha-25)',
                    borderRadius: '50%', width: 14, height: 14,
                    display: 'inline-flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'default', lineHeight: 1,
                  }}>ⓘ</span>
                  <div className="cli-tip" style={{
                    display: 'none', position: 'absolute',
                    top: 'calc(100% + 8px)', left: '50%',
                    transform: 'translateX(-50%)',
                    width: 220, padding: '10px 12px',
                    borderRadius: 10, zIndex: 50,
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    boxShadow: '0 8px 32px var(--color-toast-bg)',
                    fontSize: 11, color: 'var(--color-text-2)', lineHeight: 1.6,
                  }}>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontWeight: 700,
                      color: 'var(--color-text-1)', marginBottom: 6, fontSize: 11,
                    }}>
                      Cognitive Load Index
                    </div>
                    <div style={{ marginBottom: 4 }}>
                      <span style={{ color: '#fbbf24', fontWeight: 600 }}>Extraneous</span>
                      {' '}(45%) — reaction time variance
                    </div>
                    <div style={{ marginBottom: 4 }}>
                      <span style={{ color: '#a78bfa', fontWeight: 600 }}>Intrinsic</span>
                      {' '}(35%) — sentiment complexity
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: '#34d399', fontWeight: 600 }}>Germane</span>
                      {' '}(20%) — emotion switching
                    </div>
                    <div style={{
                      fontSize: 10, color: 'var(--color-text-3)',
                      borderTop: '1px solid var(--color-border)', paddingTop: 6,
                    }}>
                      Based on Sweller (1988) Cognitive Load Theory
                    </div>
                  </div>
                </div>
              </div>
              <span className="font-display font-bold" style={{ fontSize: 12, color: cliColor }}>
                {cli.label} · {cli.index}
              </span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--color-text-3)', margin: 0, lineHeight: 1.55 }}>
              {cli.insight}
            </p>
          </div>
        )
      })()}

      {/* ── Delete button ─────────────────────────────────────────────────────
          Two-step: first click turns red + shows confirm text.
          Auto-resets to idle after 4 seconds if not confirmed.
          Sits below all content so it's never accidentally tapped. */}
      <div style={{
        marginTop: 24, paddingTop: 16,
        borderTop: '1px solid var(--color-border)',
        display: 'flex', justifyContent: 'flex-end',
      }}>
        <button
          onClick={handleDelete}
          disabled={deleteStage === 'deleting'}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
            fontSize: 12, fontFamily: 'var(--font-display)', fontWeight: 600,
            border: `1px solid ${deleteStage === 'confirm' ? 'rgba(248,113,113,0.4)' : 'var(--color-border)'}`,
            background: deleteStage === 'confirm' ? 'rgba(248,113,113,0.08)' : 'transparent',
            color: deleteStage === 'confirm' ? '#f87171' : 'var(--color-text-3)',
            opacity: deleteStage === 'deleting' ? 0.5 : 1,
            transition: 'all 0.2s',
          }}
        >
          {/* Trash icon — inline SVG, no extra import needed */}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
          {deleteStage === 'idle'     && 'Delete session'}
          {deleteStage === 'confirm'  && 'Tap again to confirm'}
          {deleteStage === 'deleting' && 'Deleting…'}
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Sessions() {
  const [sessions, setSessions]     = useState([])
  const [selected, setSelected]     = useState(null)
  const [detail, setDetail]         = useState(null)
  const [loading, setLoading]       = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [detailLoading, setDL]      = useState(false)
  const [page, setPage]             = useState(1)
  const [totalPages, setPages]      = useState(1)
  const [showDetail, setShowDetail] = useState(false)

  const width    = useWindowWidth()
  const isMobile = width < 768

  useEffect(() => {
    setLoading(true)
    setFetchError(false)
    api.get(`/sessions?page=${page}&limit=12`)
      .then(r => {
        setSessions(r.data.sessions)
        setPages(r.data.pages)
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false))
  }, [page])

  const selectSession = async (s) => {
    setSelected(s._id)
    setDL(true)
    if (isMobile) setShowDetail(true)
    try {
      const r = await api.get(`/insights/session/${s._id}`)
      setDetail(r.data)
    } catch {
      setSelected(null)
      setDetail(null)
      if (isMobile) setShowDetail(false)
    } finally {
      setDL(false)
    }
  }

  // ── Delete handler ─────────────────────────────────────────────────────────
  // Called by SessionDetail after two-step confirm.
  // Hits the DELETE /api/sessions/:id route, then clears state and
  // removes the row from the list without a full page reload.
  const handleDelete = async (sessionId) => {
    try {
      await api.delete(`/sessions/${sessionId}`)
      // Remove from list
      setSessions(prev => prev.filter(s => s._id !== sessionId))
      // Clear detail panel
      setSelected(null)
      setDetail(null)
      if (isMobile) setShowDetail(false)
    } catch (err) {
      console.error('[MindOrb] Delete failed:', err)
      // Don't crash — detail panel stays open, user can retry
    }
  }

  const formatDate = d => new Date(d).toLocaleDateString('en', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
  const formatTime = d => new Date(d).toLocaleTimeString('en', {
    hour: '2-digit', minute: '2-digit',
  })

  if (loading) return (
    <DashboardLayout title="Sessions" subtitle="All past rounds">
      <SessionListSkeleton />
    </DashboardLayout>
  )

  const gridCols = isMobile ? '1fr' : '1fr 360px'
  const showList  = !isMobile || !showDetail
  const showPanel = !isMobile || showDetail

  return (
    <DashboardLayout title="Sessions" subtitle="All past rounds">
      <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 14 }}>

        {/* ── Session list ── */}
        {showList && (
          <div className="card" style={{ padding: 6 }}>
            <div style={{
              padding: '14px 16px 12px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div className="font-display font-semibold"
                  style={{ fontSize: 14, color: 'var(--color-text-1)' }}>
                  All sessions
                </div>
                <div style={{
                  width: 24, height: 3, borderRadius: 2,
                  background: 'var(--color-accent)', marginTop: 4,
                }} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
                Page {page} of {totalPages}
              </span>
            </div>

            {fetchError ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: 'var(--color-red)', marginBottom: 8 }}>
                  Failed to load sessions
                </p>
                <button onClick={() => setPage(p => p)} style={{
                  padding: '6px 16px', borderRadius: 8, cursor: 'pointer',
                  border: '1px solid var(--color-border)',
                  background: 'transparent', color: 'var(--color-text-2)',
                  fontSize: 12, fontFamily: 'var(--font-display)',
                }}>
                  Retry
                </button>
              </div>
            ) : sessions.length === 0 ? (
              <NoSessionsListEmpty />
            ) : (
              <div style={{ padding: 6 }}>
                {sessions.map(s => (
                  <div key={s._id}
                    onClick={() => selectSession(s)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                      borderBottom: '1px solid var(--color-border)',
                      background: selected === s._id ? 'rgba(124,106,247,0.08)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (selected !== s._id)
                        e.currentTarget.style.background = 'var(--color-hover)'
                    }}
                    onMouseLeave={e => {
                      if (selected !== s._id)
                        e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <OrbDot emotion={s.dominantEmotion} score={s.positivityScore} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="font-display font-semibold"
                        style={{ fontSize: 13, color: 'var(--color-text-1)' }}>
                        {formatDate(s.createdAt)}
                        <span style={{
                          marginLeft: 8, fontSize: 11,
                          color: 'var(--color-text-3)',
                          fontFamily: 'var(--font-body)', fontWeight: 400,
                        }}>
                          {formatTime(s.createdAt)}
                        </span>
                      </div>
                      <div style={{
                        fontSize: 11.5, color: 'var(--color-text-3)',
                        whiteSpace: 'nowrap', overflow: 'hidden',
                        textOverflow: 'ellipsis', marginTop: 2,
                      }}>
                        {s.moodLabel} · {s.roundType}
                        {s.themes?.length > 0 && ` · ${s.themes.slice(0, 2).join(', ')}`}
                      </div>
                    </div>
                    <span className="badge" style={{
                      ...SENTIMENT_CHIP[s.dominantSentiment],
                      fontSize: 11, fontFamily: 'var(--font-display)',
                    }}>
                      {s.positivityScore}%
                    </span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                      style={{ color: 'var(--color-text-3)', flexShrink: 0 }}>
                      <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex', justifyContent: 'center',
                gap: 8, padding: '12px 16px',
              }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    padding: '8px 18px', borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    background: 'transparent', color: 'var(--color-text-2)',
                    cursor: page === 1 ? 'not-allowed' : 'pointer',
                    fontSize: 12, fontFamily: 'var(--font-display)',
                    opacity: page === 1 ? 0.4 : 1,
                  }}>
                  Prev
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    padding: '8px 18px', borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    background: 'transparent', color: 'var(--color-text-2)',
                    cursor: page === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: 12, fontFamily: 'var(--font-display)',
                    opacity: page === totalPages ? 0.4 : 1,
                  }}>
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Detail panel ── */}
        {showPanel && (
          <div className="card" style={{ padding: 24, alignSelf: 'start' }}>

            {/* Mobile back button */}
            {isMobile && (
              <button
                onClick={() => { setShowDetail(false); setSelected(null); setDetail(null) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-accent-2)', fontSize: 13,
                  fontFamily: 'var(--font-display)', fontWeight: 500,
                  marginBottom: 16, padding: 0,
                }}>
              ← Back to sessions
              </button>
            )}

            {!detail && !detailLoading && <SelectSessionEmpty />}

            {detailLoading && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', margin: '0 auto',
                  background: 'radial-gradient(circle at 35% 35%, #c4b5fd, #7c6af7)',
                  animation: 'orb-pulse 1.5s ease-in-out infinite',
                }} />
              </div>
            )}

            {detail && !detailLoading && (
              <SessionDetail
                detail={detail}
                formatDate={formatDate}
                onDelete={handleDelete}
              />
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}