import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, LayoutDashboard } from 'lucide-react'
import { useSession } from '../../hooks/useSession'
import { useTimer }   from '../../hooks/useTimer'
import { loadModel }  from '../../services/sentiment'
import { useAuth }    from '../../context/AuthContext'
import { EMOTION_COLORS, SENTIMENT_CHIP } from './constants/sessionConstants'
import SessionOrb      from './components/SessionOrb'
import BreathingScreen from './components/BreathingScreen'
import StoryScreen     from './components/StoryScreen'
import {
  wordSubmitHaptic,
  orbReactionHaptic,
  sessionCompleteHaptic,
  validationErrorHaptic,
} from '../../services/haptics'

/* ════════════════════════════════════════════════════════════════
   SESSION PAGE  (main entry point)
════════════════════════════════════════════════════════════════ */
export default function Session() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    words, status, sessionResult, error,
    totalWords,
    startSession, beginRound, submitWord, finishSession,
  } = useSession()

  const { start: startTimer, stop: stopTimer } = useTimer()
  const inputRef = useRef(null)

  // ── Timeout refs for cleanup on unmount ─────────────────────
  const isReactingTimerRef = useRef(null)
  const microTimerRef      = useRef(null)

  useEffect(() => {
    return () => {
      clearTimeout(isReactingTimerRef.current)
      clearTimeout(microTimerRef.current)
    }
  }, [])

  const [input,          setInput]         = useState('')
  const [currentEmotion, setCurrentEmotion] = useState('anticipation')
  const [isReacting,     setIsReacting]    = useState(false)
  // FIX: breathPhase setter was never called — kept as read-only constant
  const breathPhase = 'neutral'
  const [microfeedback,  setMicro]         = useState(null)
  const [modelReady,     setModelReady]    = useState(false)
  const [modelError,     setModelError]    = useState(false)   // FIX: track load failure
  const [modelProgress,  setModelProgress] = useState(0)       // 0–100 simulated load progress
  const [wordError,      setWordError]     = useState('')

  // ── Transition: 'idle' → 'expanding' → 'dissolving' → 'done'
  const [txPhase, setTxPhase] = useState('idle')
  const txColors = EMOTION_COLORS[currentEmotion] || EMOTION_COLORS.anticipation

  useEffect(() => {
    if (status !== 'complete' || !sessionResult) return
    setTxPhase('expanding')
    const t1 = setTimeout(() => setTxPhase('dissolving'), 700)
    const t2 = setTimeout(() => setTxPhase('done'),       1300)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [status, sessionResult])

  // Preload TF.js model on mount — FIX: handle load failure
  // Simulated progress: ramps 0→88% over ~3s, snaps to 100% on ready
  useEffect(() => {
    let frame
    let start = null
    const DURATION = 3000
    const TARGET   = 88

    const tick = (ts) => {
      if (!start) start = ts
      const elapsed = ts - start
      const pct = Math.min(TARGET, (elapsed / DURATION) * TARGET)
      setModelProgress(Math.round(pct))
      if (pct < TARGET) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    loadModel()
      .then(() => { setModelProgress(100); setModelReady(true) })
      .catch(() => { setModelProgress(100); setModelError(true) })

    return () => cancelAnimationFrame(frame)
  }, [])

  // Auto-focus input when session becomes active
  useEffect(() => {
    if (status === 'active' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [status])

  const handleFocus = useCallback(() => startTimer(), [startTimer])

  // ── Word validation ──────────────────────────────────────────
  const validateWord = (w) => {
    if (!w.trim())                                               return 'Type a word first'
    if (w.trim().length < 2)                                     return 'Word too short'
    if (/\d/.test(w))                                            return 'No numbers please'
    if (/[^a-zA-Z\s-]/.test(w))                                 return 'Letters only'
    if (words.some(prev => prev.word === w.trim().toLowerCase())) return 'Already used this word'
    return null
  }

  // ── Submit a word ────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e?.preventDefault()
    const val = input.trim()

    const validationError = validateWord(val)
    if (validationError) { 
      setWordError(validationError); 
      validationErrorHaptic()
      return 
    }

    setWordError('')
    const reactionTime = stopTimer()
    setInput('')
    wordSubmitHaptic()
    const result = await submitWord(val, reactionTime)
    if (!result) return

    const { wordEntry, allWords } = result

    // Update orb emotion
    setCurrentEmotion(wordEntry.emotion)

    // Burst animation — FIX: use ref so timer can be cleared on unmount
    clearTimeout(isReactingTimerRef.current)
    setIsReacting(true)
    orbReactionHaptic(wordEntry.emotionIntensity)
    isReactingTimerRef.current = setTimeout(() => setIsReacting(false), 600)

    // Micro feedback pill — FIX: use ref so timer can be cleared on unmount
    const scoreDisplay = wordEntry.sentimentScore >= 0
      ? `+${Math.round(wordEntry.sentimentScore * 100)}`
      : `${Math.round(wordEntry.sentimentScore * 100)}`
    const chip = SENTIMENT_CHIP[wordEntry.sentiment]
    setMicro({ text: `${wordEntry.emotion} · ${scoreDisplay}`, color: chip.text, bg: chip.bg, border: chip.border })
    clearTimeout(microTimerRef.current)
    microTimerRef.current = setTimeout(() => setMicro(null), 2000)

    if (allWords.length >= totalWords) {
      sessionCompleteHaptic()
      await finishSession(allWords)
    } else {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const handleKeyDown    = (e) => { if (e.key === 'Enter') handleSubmit() }
  // FIX: reset txPhase so the transition works correctly on subsequent sessions
  const handleNewSession = () => {
    startSession()
    setCurrentEmotion('anticipation')
    setInput('')
    setTxPhase('idle')
  }

  // ── RENDER ───────────────────────────────────────────────────
  return (
    // FIX: added position:'relative' so the absolute overlay is contained here
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--color-bg)', position: 'relative' }}>

      {/* Top bar */}
      <div
        className="flex items-center justify-between flex-shrink-0 px-4 sm:px-8 py-4"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-3">
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'radial-gradient(circle at 35% 35%, #c4b5fd, #7c6af7 50%, #4f3fb5)',
          }} />
          <span className="font-display text-sm font-semibold" style={{ color: 'var(--color-text-1)' }}>
            MindOrb
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          {/* Model status */}
          <div className="flex items-center gap-2">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                // FIX: show red dot when model failed to load
                background: modelError
                  ? 'var(--color-red)'
                  : modelReady
                    ? 'var(--color-green)'
                    : 'var(--color-amber)',
                animation: (!modelReady && !modelError) ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
              }}
            />
            {/* FIX: hide label text on mobile to prevent topbar overflow */}
            <span className="hidden sm:inline text-xs" style={{ color: 'var(--color-text-3)' }}>
              {modelError ? 'Model failed' : modelReady ? 'Model ready' : 'Loading model...'}
            </span>
          </div>

          {/* User avatar */}
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center font-display text-xs font-bold"
              style={{
                background: 'var(--color-surface-2)',
                color: 'var(--color-accent-2)',
                border: '1px solid var(--color-border)',
              }}
            >
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            {/* FIX: hide username text on mobile to prevent topbar overflow */}
            <span className="hidden sm:inline text-xs" style={{ color: 'var(--color-text-2)' }}>
              {user?.name?.split(' ')[0]}
            </span>
          </div>

          {/* Dashboard link */}
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-2)',
            }}
          >
            <LayoutDashboard size={13} />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
        </div>
      </div>

      {/* ── BREATHING PHASE ── */}
      {status === 'breathing' && (
        <div className="flex-1 flex items-center justify-center">
          <BreathingScreen onComplete={beginRound} />
        </div>
      )}

      {/* ── ACTIVE / SUBMITTING PHASE ── */}
      {(status === 'active' || status === 'submitting') && (
        <div className="flex-1 flex flex-col items-center justify-between py-8 px-6 overflow-hidden">

          {/* Progress bar */}
          <div className="w-full max-w-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold font-display" style={{ color: 'var(--color-text-3)' }}>
                Word {Math.min(words.length + 1, totalWords)} of {totalWords}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-3)' }}>
                {totalWords - words.length} remaining
              </span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${(words.length / totalWords) * 100}%`,
                  background: `linear-gradient(90deg, var(--color-accent), ${EMOTION_COLORS[currentEmotion]?.c2 ?? '#7c6af7'})`,
                }}
              />
            </div>
          </div>

          {/* ── Live running score bar ─────────────────────────── */}
          {words.length > 0 && (() => {
            const avg   = words.reduce((s, w) => s + w.sentimentScore, 0) / words.length
            const pct   = Math.round(avg * 100)          // -100 to +100
            const isPos = avg >= 0
            const color = avg > 0.08 ? '#34d399' : avg < -0.08 ? '#f87171' : '#52525e'
            const barW  = Math.min(50, Math.abs(pct) / 2) // max 50% each side

            return (
              <div className="w-full max-w-sm" style={{ marginBottom: 4 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 4,
                }}>
                  <span className="text-xs font-display font-semibold" style={{ color: 'var(--color-text-3)' }}>
                    Running sentiment
                  </span>
                  <span className="font-display font-bold" style={{ fontSize: 12, color, transition: 'color 0.4s ease' }}>
                    {pct > 0 ? '+' : ''}{pct}
                  </span>
                </div>
                {/* Track — center-anchored */}
                <div style={{
                  height: 4, borderRadius: 99, position: 'relative',
                  background: 'var(--color-white-alpha-06)',
                }}>
                  {/* Center tick */}
                  <div style={{
                    position: 'absolute', top: -3, left: '50%',
                    width: 1, height: 10, background: 'var(--color-white-alpha-15)',
                    transform: 'translateX(-50%)',
                  }} />
                  {/* Fill */}
                  <div style={{
                    position: 'absolute', top: 0, height: '100%',
                    borderRadius: 99, background: color,
                    boxShadow: `0 0 8px ${color}66`,
                    ...(isPos
                      ? { left: '50%', width: `${barW}%` }
                      : { right: '50%', width: `${barW}%` }),
                    transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1), background 0.4s ease',
                  }} />
                </div>
              </div>
            )
          })()}

          {/* Orb + micro feedback */}
          <div className="relative flex items-center justify-center flex-1">
            <SessionOrb
              emotion={currentEmotion}
              isReacting={isReacting}
              breathPhase={breathPhase}
            />

            {microfeedback && (
              <div
                className="absolute font-display text-xs font-semibold px-3 py-1.5 rounded-full animate-fade-up"
                style={{
                  top: '10%',
                  background: microfeedback.bg,
                  border: `1px solid ${microfeedback.border}`,
                  color: microfeedback.color,
                  pointerEvents: 'none',
                }}
              >
                {microfeedback.text}
              </div>
            )}
          </div>

          {/* Word chips — with score delta */}
          <div className="flex flex-wrap justify-center gap-2 max-w-lg min-h-8 mb-4">
            {/* FIX: key by word value instead of index */}
            {words.map((w) => {
              const chip  = SENTIMENT_CHIP[w.sentiment] || SENTIMENT_CHIP.neutral
              const delta = w.sentimentScore >= 0
                ? `+${Math.round(w.sentimentScore * 100)}`
                : `${Math.round(w.sentimentScore * 100)}`
              return (
                <span
                  key={w.word}
                  className="animate-fade-in font-display"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 11, fontWeight: 500,
                    padding: '3px 10px', borderRadius: 99,
                    background: chip.bg, border: `1px solid ${chip.border}`, color: chip.text,
                  }}
                >
                  {w.word}
                  <span style={{ opacity: 0.6, fontSize: 9, fontWeight: 700 }}>{delta}</span>
                </span>
              )
            })}
          </div>

          {/* Model loading progress bar — shown above input while loading */}
          {!modelReady && (
            <div className="w-full max-w-sm mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-display font-medium" style={{ color: 'var(--color-text-3)' }}>
                  {modelError ? 'Model failed to load' : 'Loading model'}
                </span>
                <span className="text-xs font-display font-semibold" style={{
                  color: modelError ? 'var(--color-red)' : 'var(--color-text-3)',
                }}>
                  {modelProgress}%
                </span>
              </div>
              <div style={{
                height: 3, borderRadius: 99,
                background: 'var(--color-surface-2)',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', borderRadius: 99,
                  width: `${modelProgress}%`,
                  background: modelError
                    ? 'var(--color-red)'
                    : `linear-gradient(90deg, var(--color-accent), #a78bfa)`,
                  transition: 'width 0.25s ease, background 0.3s ease',
                  boxShadow: modelError ? 'none' : '0 0 6px #a78bfa88',
                }} />
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="w-full max-w-sm">
            {(wordError || error) && (
              <p className="text-xs text-center mb-2 animate-fade-in" style={{ color: 'var(--color-red)' }}>
                {wordError || error}
              </p>
            )}
            <div className="relative">
              <input
                ref={inputRef}
                className="input-field text-center text-base font-display font-medium pr-14"
                style={{
                  fontSize: 18,
                  letterSpacing: '0.02em',
                  background: 'var(--color-surface)',
                  // FIX: --color-border-2 does not exist in the design system
                  border: '1px solid var(--color-border)',
                }}
                placeholder={
                  !modelReady && !modelError ? 'Model loading…'
                  : modelError               ? 'Model unavailable'
                  : words.length === 0       ? 'What comes to mind?'
                  :                            'Next word...'
                }
                value={input}
                onChange={e => { setInput(e.target.value); setWordError('') }}
                onFocus={handleFocus}
                onKeyDown={handleKeyDown}
                disabled={status === 'submitting' || !modelReady }
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              {/* FIX: added aria-label for accessibility */}
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || status === 'submitting' || !modelReady }
                aria-label="Submit word"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                style={{
                  background: input.trim() ? 'var(--color-accent)' : 'var(--color-surface-3)',
                  color: input.trim() ? '#fff' : 'var(--color-text-3)',
                }}
              >
                <ArrowRight size={15} />
              </button>
            </div>
            <p className="text-center text-xs mt-2" style={{ color: 'var(--color-text-3)' }}>
              Press Enter to submit{!modelReady && !modelError && ' · Model loading...'}
              {modelError && ' · Model unavailable'}
            </p>
          </div>
        </div>
      )}

      {/* ── SUBMITTING / TRANSITION OVERLAY ── */}
      {(status === 'submitting' || (status === 'complete' && txPhase !== 'done')) && (
        <div
          className="absolute inset-0 flex items-center justify-center z-50"
          style={{
            background:    txPhase === 'expanding' ? txColors.glow.replace(/[\d.]+\)$/, '0.08)') : 'var(--color-overlay)',
            backdropFilter: txPhase === 'idle' || status === 'submitting' ? 'blur(8px)' : 'none',
            transition: 'background 0.4s ease',
          }}
        >
          {/* ── Expanding orb — the hero of the transition ── */}
          <div style={{
            position: 'relative',
            width:  64, height: 64,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            // scale(35) → 64×35 = 2240px — covers any viewport diagonal
            transform:  txPhase === 'expanding'  ? 'scale(35)'
                      : txPhase === 'dissolving' ? 'scale(35)'
                      : 'scale(1)',
            opacity:    txPhase === 'dissolving' ? 0 : 1,
            transition: txPhase === 'expanding'
              ? 'transform 0.72s cubic-bezier(0.4,0,0.2,1)'
              : txPhase === 'dissolving'
                ? 'opacity 0.55s cubic-bezier(0.4,0,1,1)'
                : 'none',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: `radial-gradient(circle at 35% 32%, ${txColors.c1}, ${txColors.c2} 48%, ${txColors.c3})`,
              boxShadow: `0 0 60px 20px ${txColors.glow}, inset 0 1px 0 var(--color-white-alpha-25)`,
              animation: txPhase === 'idle' ? 'orb-pulse 1.5s ease-in-out infinite' : 'none',
            }} />
          </div>

          {/* Label — only shown while still "submitting" (not yet expanding) */}
          {txPhase === 'idle' && (
            <p
              className="absolute font-display text-sm font-medium animate-fade-in"
              style={{ color: 'var(--color-text-2)', marginTop: 100 }}
            >
              Weaving your story...
            </p>
          )}
        </div>
      )}

      {/* ── COMPLETE PHASE — mounts underneath during 'expanding',
              invisible until 'dissolving' starts so the reveal feels
              like the orb peels away to show what was always beneath ── */}
      {status === 'complete' && sessionResult && (
        <div
          className="flex-1 min-h-0 overflow-hidden"
          style={{
            opacity:    txPhase === 'done' || txPhase === 'dissolving' ? 1 : 0,
            transition: 'opacity 0.5s ease 0.1s',
            // Block pointer events until fully revealed
            pointerEvents: txPhase === 'done' ? 'auto' : 'none',
          }}
        >
          <StoryScreen
            session={sessionResult}
            onNewSession={handleNewSession}
            onDashboard={() => navigate('/dashboard')}
          />
        </div>
      )}
    </div>
  )
}