import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useSession } from '../../hooks/useSession'
import { useTimer } from '../../hooks/useTimer'
import api from '../../services/api'
import { ArrowRight, Users, Clock } from 'lucide-react'
import DuoWaiting from './components/DuoWaiting'

// ─── Constants ────────────────────────────────────────────────────────────────

const SENTIMENT_CHIP = {
  positive: { bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.25)', text: '#34d399' },
  negative: { bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.25)', text: '#f87171' },
  neutral:  { bg: 'rgba(142,142,160,0.1)',  border: 'rgba(142,142,160,0.2)',  text: '#8e8ea0' },
}

const EMOTION_COLORS = {
  joy:          { c1: '#fde68a', c2: '#f59e0b', c3: '#d97706', glow: 'rgba(251,191,36,0.45)' },
  trust:        { c1: '#6ee7b7', c2: '#10b981', c3: '#059669', glow: 'rgba(52,211,153,0.45)' },
  fear:         { c1: '#bae6fd', c2: '#0ea5e9', c3: '#0369a1', glow: 'rgba(14,165,233,0.4)' },
  surprise:     { c1: '#a5f3fc', c2: '#06b6d4', c3: '#0e7490', glow: 'rgba(6,182,212,0.4)' },
  sadness:      { c1: '#c4b5fd', c2: '#7c6af7', c3: '#4f3fb5', glow: 'rgba(124,106,247,0.45)' },
  disgust:      { c1: '#fed7aa', c2: '#f97316', c3: '#c2410c', glow: 'rgba(249,115,22,0.4)' },
  anger:        { c1: '#fca5a5', c2: '#ef4444', c3: '#b91c1c', glow: 'rgba(239,68,68,0.45)' },
  anticipation: { c1: '#ddd6fe', c2: '#7c6af7', c3: '#5b21b6', glow: 'rgba(124,106,247,0.45)' },
  neutral:      { c1: '#d4d4d8', c2: '#71717a', c3: '#3f3f46', glow: 'rgba(113,113,122,0.3)' },
}

const AXES = [
  { key: 'positivity', label: 'Positivity' },
  { key: 'speed',      label: 'Speed', fromReactionTime: true },
  { key: 'variety',    label: 'Variety' },
  { key: 'calm',       label: 'Clarity' },
  { key: 'focus',      label: 'Energy' },
]

const getAxisValue = (session, axis) => {
  if (axis.fromReactionTime) {
    return Math.round(Math.max(0, 100 - ((session?.avgReactionTime ?? 2000) / 2000) * 100))
  }
  return session.radar?.[axis.key] ?? 0
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

// ─── SessionOrb ───────────────────────────────────────────────────────────────
// FIX: was using Tailwind utility classes (relative, flex, absolute, inset-0,
// rounded-full) which conflict with the app's inline-styles-only approach and
// are not guaranteed to be in the Tailwind v4 output if the scanner misses this
// file. All layout converted to inline styles.
function SessionOrb({ emotion, isReacting, breathPhase }) {
  const colors = EMOTION_COLORS[emotion] || EMOTION_COLORS.neutral
  const scale  = isReacting ? 1.12 : breathPhase === 'inhale' ? 1.04 : 1

  return (
    <div style={{
      position: 'relative', width: 260, height: 260,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Outer ring */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        border: `1px solid ${colors.c2}20`,
        transform: `scale(${scale * 1.15})`,
        transition: 'transform 0.8s cubic-bezier(0.34,1.56,0.64,1), border-color 1s ease',
      }} />
      {/* Middle ring */}
      <div style={{
        position: 'absolute', inset: 20, borderRadius: '50%',
        border: `1px solid ${colors.c2}30`,
        transform: `scale(${scale * 1.06})`,
        transition: 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1), border-color 1s ease',
      }} />
      {/* Core */}
      <div style={{
        width: 160, height: 160, borderRadius: '50%',
        background: `radial-gradient(circle at 35% 32%, ${colors.c1} 0%, ${colors.c2} 45%, ${colors.c3} 100%)`,
        boxShadow: `0 0 80px 20px ${colors.glow}, 0 0 160px 40px ${colors.glow.replace(/[\d.]+\)$/, '0.15)')}, inset 0 1px 0 rgba(255,255,255,0.3)`,
        transform: `scale(${scale})`,
        transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1), background 1.2s ease, box-shadow 1.2s ease',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{
          position: 'absolute', top: '18%', left: '22%',
          width: '30%', height: '20%',
          background: 'rgba(255,255,255,0.25)',
          borderRadius: '50%', filter: 'blur(6px)',
        }} />
      </div>
    </div>
  )
}

// ─── WaitingScreen ────────────────────────────────────────────────────────────
// FIX: removed unused `isCreator` prop — was passed from the call site but
// never referenced anywhere in this component.
function WaitingScreen({ room, onPartnerJoined }) {
  const [dots, setDots] = useState('.')

  useEffect(() => {
    const dotIv = setInterval(() =>
      setDots(d => d.length >= 3 ? '.' : d + '.'), 600)

    const pollIv = setInterval(async () => {
      try {
        const { data } = await api.get(`/duo/${room.code}`)
        if (data.room.status === 'ready' || data.room.status === 'in_progress') {
          onPartnerJoined()
        }
      } catch { /* swallow polling errors */ }
    }, 2000)

    return () => { clearInterval(dotIv); clearInterval(pollIv) }
  }, [room.code, onPartnerJoined])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: 32,
    }}>
      <SessionOrb emotion="anticipation" isReacting={false} breathPhase="neutral" />

      <div style={{ textAlign: 'center' }}>
        <div className="font-display" style={{
          fontSize: 20, fontWeight: 600,
          color: 'var(--color-text-1)', marginBottom: 8,
        }}>
          Waiting for your partner{dots}
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-text-3)', marginBottom: 20 }}>
          Share this code with a friend
        </div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 700,
          letterSpacing: '0.2em', color: 'var(--color-accent-2)', lineHeight: 1,
          padding: '20px 28px',
          background: 'var(--color-surface-2)',
          border: '1px solid rgba(124,106,247,0.25)',
          borderRadius: 16,
        }}>
          {room.code}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--color-text-3)' }}>
        <Clock size={13} />
        Room expires in 30 minutes
      </div>
    </div>
  )
}

// ─── ResultScreen ─────────────────────────────────────────────────────────────
function ResultScreen({ result, isCreator }) {
  const navigate     = useNavigate()
  const width        = useWindowWidth()
  const isMobile     = width < 768

  const mySession    = isCreator ? result.sessionA : result.sessionB
  const theirSession = isCreator ? result.sessionB : result.sessionA
  const theirUser    = isCreator ? result.sessionB.user : result.sessionA.user
  const theirName    = theirUser?.name?.split(' ')[0] || 'Friend'

  const scoreColor = s => s >= 70 ? '#34d399' : s >= 45 ? '#fbbf24' : '#f87171'
  const diff       = mySession.positivityScore - theirSession.positivityScore
  const diffColor  = diff > 0 ? '#34d399' : diff < 0 ? '#f87171' : 'var(--color-text-2)'

  // Responsive layout
  const scoreCols  = isMobile ? '1fr' : '1fr auto 1fr'
  const storyCols  = isMobile ? '1fr' : '1fr 1fr'

  return (
    // FIX: added width:'100%' — maxWidth alone doesn't prevent overflow on mobile
    <div style={{ maxWidth: 680, width: '100%', margin: '0 auto', padding: '32px 24px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, marginBottom: 12,
        }}>
          <Users size={18} color="var(--color-accent-2)" />
          <span className="font-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-1)' }}>
            Duo results
          </span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-text-3)' }}>
          Both sessions complete. Here's how your minds compare.
        </p>
      </div>

      {/* Score comparison */}
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 20, padding: 24, marginBottom: 16,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 50%, transparent)',
        }} />

        {/* FIX: '1fr auto 1fr' stacks on mobile — delta shown inline under second score */}
        <div style={{ display: 'grid', gridTemplateColumns: scoreCols, gap: 20, alignItems: 'center' }}>
          {[
            { session: mySession,    label: 'You',      color: 'var(--color-accent-2)' },
            null,
            { session: theirSession, label: theirName,  color: '#34d399' },
          ].map((item, i) => {
            if (!item) {
              if (isMobile) return null  // delta rendered inline on mobile
              return (
                <div key="vs" style={{ textAlign: 'center' }}>
                  <div className="font-display font-bold" style={{ fontSize: 22, color: diffColor }}>
                    {diff > 0 ? `+${diff}` : diff}%
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 2 }}>
                    difference
                  </div>
                </div>
              )
            }
            const isTheirScore = item.label === theirName
            return (
              <div key={i} style={{
                textAlign: 'center', display: 'flex',
                flexDirection: 'column', alignItems: 'center', gap: 8,
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: item.color,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  fontFamily: 'var(--font-display)',
                }}>
                  {item.label}
                </div>
                <div className="font-display font-bold" style={{
                  fontSize: 48, lineHeight: 1,
                  color: scoreColor(item.session.positivityScore),
                }}>
                  {item.session.positivityScore}
                  <span style={{ fontSize: 20, fontWeight: 400, color: 'var(--color-text-3)' }}>%</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-2)' }}>
                  {item.session.moodLabel}
                </div>
                {/* On mobile show delta inline under the second score */}
                {isMobile && isTheirScore && (
                  <div style={{ fontSize: 13, color: diffColor, fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                    {diff > 0 ? `+${diff}` : diff}% difference
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Axis comparison bars */}
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 20, padding: 24, marginBottom: 16,
      }}>
        <div className="font-display" style={{
          fontSize: 13, fontWeight: 600, color: 'var(--color-text-1)', marginBottom: 16,
        }}>
          Head-to-head
        </div>

        {AXES.map(axis => {
          const myVal    = getAxisValue(isCreator ? result.sessionA : result.sessionB, axis)
          const theirVal = getAxisValue(isCreator ? result.sessionB : result.sessionA, axis)
          const axDiff   = myVal - theirVal
          const col      = axDiff > 0 ? '#34d399' : axDiff < 0 ? '#f87171' : '#52525e'
          return (
            <div key={axis.key} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-2)', fontWeight: 500 }}>
                  {axis.label}
                </span>
                <span className="font-display font-bold" style={{ fontSize: 12, color: col }}>
                  {axDiff > 0 ? `+${axDiff}` : axDiff}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 8px 1fr', gap: 4, alignItems: 'center' }}>
                <div style={{
                  height: 4, background: 'rgba(255,255,255,0.06)',
                  borderRadius: 2, overflow: 'hidden', direction: 'rtl',
                }}>
                  <div style={{ width: `${myVal}%`, height: '100%', background: 'var(--color-accent)', borderRadius: 2 }} />
                </div>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--color-surface-3)',
                  border: '1px solid var(--color-border)', flexShrink: 0,
                }} />
                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${theirVal}%`, height: '100%', background: '#34d399', borderRadius: 2 }} />
                </div>
              </div>
            </div>
          )
        })}

        <div style={{ display: 'flex', gap: 16, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--color-border)' }}>
          {[
            { color: 'var(--color-accent)', label: 'You' },
            { color: '#34d399', label: theirName },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 3, borderRadius: 2, background: l.color }} />
              <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stories — stacked on mobile, side-by-side on desktop */}
      <div style={{ display: 'grid', gridTemplateColumns: storyCols, gap: 12, marginBottom: 20 }}>
        {[
          { session: mySession,    label: 'Your story',          color: 'var(--color-accent-2)' },
          { session: theirSession, label: `${theirName}'s story`, color: '#34d399' },
        ].map(item => (
          <div key={item.label} style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 16, padding: 18, borderLeft: `3px solid ${item.color}`,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--color-text-3)',
              fontFamily: 'var(--font-display)', marginBottom: 8,
            }}>
              {item.label}
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.65, fontStyle: 'italic', marginBottom: 12 }}>
              "{item.session.story}"
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {item.session.words?.slice(0, 5).map((w, i) => {
                const chip = SENTIMENT_CHIP[w.sentiment] || SENTIMENT_CHIP.neutral
                return (
                  <span key={i} style={{
                    fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 99,
                    background: chip.bg, border: `1px solid ${chip.border}`, color: chip.text,
                    fontFamily: 'var(--font-display)',
                  }}>
                    {w.word}
                  </span>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => navigate('/session')} style={{
          flex: 1, minWidth: 0, padding: 12, borderRadius: 10, cursor: 'pointer',
          background: 'var(--color-surface-2)', border: '1px solid var(--color-border-2)',
          color: 'var(--color-text-2)', fontSize: 13, fontWeight: 600,
          fontFamily: 'var(--font-display)',
        }}>
          New solo session
        </button>
        <button onClick={() => navigate('/dashboard')} style={{
          flex: 1, minWidth: 0, padding: 12, borderRadius: 10, cursor: 'pointer',
          background: 'var(--color-accent)', color: '#fff', border: 'none',
          fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-display)',
          boxShadow: '0 0 20px rgba(124,106,247,0.3)',
        }}>
          Dashboard
        </button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   MAIN DUO SESSION PAGE
════════════════════════════════════════════════════════════ */
export default function DuoSession() {
  const { code }   = useParams()
  const { user }   = useAuth()
  const navigate   = useNavigate()

  const [room, setRoom]           = useState(null)
  const [isCreator, setCreator]   = useState(false)
  const [phase, setPhase]         = useState('loading')
  const [result, setResult]       = useState(null)
  const [input, setInput]         = useState('')
  const [wordError, setWordError] = useState('')
  const [microfeedback, setMicro] = useState(null)
  const [currentEmotion, setEmotion]   = useState('anticipation')
  const [isReacting, setIsReacting]    = useState(false)

  // FIX: poll interval stored in a ref so it can be cleaned up on unmount,
  // preventing setState calls on an unmounted component.
  const pollIntervalRef = useRef(null)

  const { words, submitWord, wordsRef, totalWords } = useSession()
  const { start: startTimer, stop: stopTimer }      = useTimer()

  // FIX: added `navigate` to deps array — it was used in the catch but omitted
  useEffect(() => {
    api.get(`/duo/${code}`)
      .then(({ data }) => {
        setRoom(data.room)
        setCreator(data.isCreator)
        if (data.room.status === 'waiting') setPhase('waiting')
        else setPhase('active')
      })
      .catch(() => navigate('/duo'))
  }, [code, navigate])

  // FIX: clean up poll interval on unmount so it can't fire after component is gone
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [])

  const onPartnerJoined = useCallback(() => {
    setPhase('active')
  }, [])

  const validate = (w) => {
    if (!w.trim()) return 'Type a word'
    if (w.length < 2) return 'Too short'
    if (/\d/.test(w)) return 'No numbers'
    if (/[^a-zA-Z\s-]/.test(w)) return 'Letters only'
    if (wordsRef.current.some(p => p.word === w.trim().toLowerCase()))
      return 'Already used'
    return null
  }

  // FIX: the original `pollForResult` returned a cleanup function but the call
  // site discarded it. Now uses a ref-stored interval that the unmount effect
  // above always cleans up.
  const startPollingForResult = useCallback(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    pollIntervalRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/duo/${code}/result`)
        if (data.sessionA) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
          setResult(data)
          setPhase('complete')
        }
      } catch { /* swallow polling errors */ }
    }, 2500)
  }, [code])

  const handleSubmit = async (e) => {
    e?.preventDefault()
    const val = input.trim()
    const err = validate(val)
    if (err) { setWordError(err); return }

    setWordError('')
    const rt = stopTimer()
    setInput('')

    // FIX: renamed from `result` to `submitResult` — original name shadowed the
    // outer `result` state variable, creating a silent scoping collision.
    const submitResult = await submitWord(val, rt)
    if (!submitResult) return

    const { wordEntry, allWords } = submitResult
    setEmotion(wordEntry.emotion)

    setIsReacting(true)
    setTimeout(() => setIsReacting(false), 600)

    const chip  = SENTIMENT_CHIP[wordEntry.sentiment] || SENTIMENT_CHIP.neutral
    const score = wordEntry.sentimentScore >= 0
      ? `+${Math.round(wordEntry.sentimentScore * 100)}`
      : `${Math.round(wordEntry.sentimentScore * 100)}`
    setMicro({ text: `${wordEntry.emotion} · ${score}`, color: chip.text, bg: chip.bg, border: chip.border })
    setTimeout(() => setMicro(null), 1800)

    if (allWords.length >= totalWords) {
      setPhase('submitting')
      try {
        await api.post(`/duo/${code}/submit`, { words: allWords, roundType: 'free' })
        setPhase('polling')
        startPollingForResult()
      } catch (err) {
        setWordError(err.response?.data?.message || 'Submission failed')
        setPhase('active')
      }
    }
  }

  if (phase === 'loading') return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--color-bg)',
    }}>
      <SessionOrb emotion="anticipation" isReacting={false} breathPhase="neutral" />
    </div>
  )

  return (
    <div style={{
      height: '100vh', background: 'var(--color-bg)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>

      {/* Top bar */}
      <div style={{
        height: 56, borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={15} color="var(--color-accent-2)" />
          <span className="font-display" style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-1)' }}>
            Duo session
          </span>
          <span style={{
            fontSize: 12, fontFamily: 'var(--font-mono, monospace)',
            color: 'var(--color-accent-2)',
            background: 'rgba(124,106,247,0.12)',
            border: '1px solid rgba(124,106,247,0.2)',
            padding: '2px 10px', borderRadius: 99, letterSpacing: '0.1em',
          }}>
            {code}
          </span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
          {phase === 'polling' ? '⏳ Waiting for partner...' :
           phase === 'active'  ? `${wordsRef.current.length}/10 words` : ''}
        </span>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'hidden', overflowY: 'auto' }}>

        {phase === 'waiting' && room && (
          // FIX: removed isCreator prop — WaitingScreen never used it
          <WaitingScreen room={room} onPartnerJoined={onPartnerJoined} />
        )}

        {(phase === 'active' || phase === 'submitting') && (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'space-between',
            height: '100%', padding: '24px 16px',
          }}>

            {/* Progress bar */}
            <div style={{ width: '100%', maxWidth: 440 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', marginBottom: 6,
                fontSize: 11, color: 'var(--color-text-3)',
                fontFamily: 'var(--font-display)', fontWeight: 500,
              }}>
                <span>Word {Math.min(wordsRef.current.length + 1, 10)} of 10</span>
                <span>{10 - wordsRef.current.length} remaining</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{
                  width: `${(wordsRef.current.length / 10) * 100}%`,
                  background: `linear-gradient(90deg, var(--color-accent), ${EMOTION_COLORS[currentEmotion]?.c2 ?? '#7c6af7'})`,
                }} />
              </div>
            </div>

            {/* Orb + microfeedback */}
            <div style={{
              position: 'relative', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flex: 1,
            }}>
              <SessionOrb emotion={currentEmotion} isReacting={isReacting} breathPhase="neutral" />
              {microfeedback && (
                <div style={{
                  position: 'absolute', top: '10%',
                  fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600,
                  padding: '5px 14px', borderRadius: 99,
                  background: microfeedback.bg, border: `1px solid ${microfeedback.border}`,
                  color: microfeedback.color, animation: 'fade-up 0.3s ease',
                  pointerEvents: 'none',
                }}>
                  {microfeedback.text}
                </div>
              )}
            </div>

            {/* Word chips */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
              gap: 6, maxWidth: 440, minHeight: 28, marginBottom: 12,
            }}>
              {wordsRef.current.map((w, i) => {
                const chip  = SENTIMENT_CHIP[w.sentiment] || SENTIMENT_CHIP.neutral
                const delta = w.sentimentScore >= 0
                  ? `+${Math.round(w.sentimentScore * 100)}`
                  : `${Math.round(w.sentimentScore * 100)}`
                return (
                  <span key={i} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 99,
                    background: chip.bg, border: `1px solid ${chip.border}`,
                    color: chip.text, fontFamily: 'var(--font-display)',
                  }}>
                    {w.word}
                    <span style={{ opacity: 0.6, fontSize: 9, fontWeight: 700 }}>{delta}</span>
                  </span>
                )
              })}
            </div>

            {/* Input */}
            <div style={{ width: '100%', maxWidth: 400 }}>
              {wordError && (
                <p style={{ fontSize: 11, color: '#f87171', textAlign: 'center', marginBottom: 6 }}>
                  {wordError}
                </p>
              )}
              <div style={{ position: 'relative' }}>
                <input
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    // FIX: added boxSizing — width:100% + large padding overflows without it
                    padding: '13px 48px 13px 18px',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border-2)',
                    borderRadius: 12, color: 'var(--color-text-1)',
                    fontSize: 18, fontFamily: 'var(--font-display)',
                    fontWeight: 600, textAlign: 'center', outline: 'none',
                    letterSpacing: '0.02em',
                  }}
                  placeholder={wordsRef.current.length === 0 ? 'First word...' : 'Next word...'}
                  value={input}
                  onChange={e => { setInput(e.target.value); setWordError('') }}
                  onFocus={startTimer}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  disabled={phase === 'submitting'}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim() || phase === 'submitting'}
                  style={{
                    position: 'absolute', right: 10, top: '50%',
                    transform: 'translateY(-50%)',
                    width: 34, height: 34, borderRadius: 8, border: 'none',
                    cursor: !input.trim() || phase === 'submitting' ? 'not-allowed' : 'pointer',
                    background: input.trim() ? 'var(--color-accent)' : 'var(--color-surface-3)',
                    color: input.trim() ? '#fff' : 'var(--color-text-3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  <ArrowRight size={15} />
                </button>
              </div>
              <p style={{ textAlign: 'center', fontSize: 11, marginTop: 8, color: 'var(--color-text-3)' }}>
                Press Enter to submit
              </p>
            </div>
          </div>
        )}

        {phase === 'polling' && (
          <DuoWaiting partnerName={room?.partnerName} wordsSubmitted={wordsRef.current.length} />
        )}

        {phase === 'complete' && result && (
          <ResultScreen result={result} isCreator={isCreator} />
        )}
      </div>
    </div>
  )
}