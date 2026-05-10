import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
// FIX: removed dead imports — Flame (emoji used instead) and Share2 (share not implemented)
import { ArrowRight, RotateCcw, Download, Check } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { EMOTION_COLORS, SENTIMENT_CHIP } from '../constants/sessionConstants'

/* ─────────────────────────────────────────────────────────────
   Design tokens (from handoff)
───────────────────────────────────────────────────────────── */
const T = {
  bg:      '#08080f',
  surface: '#0f0f1a',
  border:  'rgba(255,255,255,0.07)',
  accent:  '#7c6af7',
  green:   '#34d399',
  amber:   '#fbbf24',
  red:     '#f87171',
  text1:   'rgba(255,255,255,0.92)',
  text2:   'rgba(255,255,255,0.55)',
  text3:   'rgba(255,255,255,0.28)',
}

/* ─────────────────────────────────────────────────────────────
   FIX: shared withAlpha helper — replaces all inline glow regex.
   If `color` is not rgba() format, regex won't match and we
   fall back to the original color rather than corrupting the
   boxShadow / background value silently.
───────────────────────────────────────────────────────────── */
function withAlpha(color, alpha) {
  const result = color.replace(/[\d.]+\)$/, `${alpha})`)
  return result !== color ? result : color
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,400;1,500&family=Outfit:wght@400;500;600;700;800;900&display=swap');

  @keyframes ss-up     { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
  @keyframes ss-in     { from{opacity:0} to{opacity:1} }
  @keyframes ss-pop    { 0%{opacity:0;transform:scale(0.65)} 70%{transform:scale(1.07)} 100%{opacity:1;transform:scale(1)} }
  @keyframes ss-cursor { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes ss-breathe{ 0%,100%{transform:scale(1)} 50%{transform:scale(1.045)} }
  @keyframes ss-streak { 0%,100%{box-shadow:0 0 20px rgba(251,191,36,0.2)} 50%{box-shadow:0 0 36px rgba(251,191,36,0.45)} }
  @keyframes ss-hl     { from{opacity:0;text-shadow:none;border-bottom-color:transparent} to{opacity:1} }

  .ss-word-hl {
    animation: ss-hl 0.55s cubic-bezier(0.22,1,0.36,1) both;
    display: inline;
    font-style: italic;
    font-weight: 700;
    border-bottom: 1px dashed;
    padding: 0 1px;
    border-radius: 2px;
    cursor: default;
  }

  .ss-reveal { animation: ss-up 0.6s cubic-bezier(0.22,1,0.36,1) both; }
  .ss-appear { animation: ss-in 0.45s ease both; }
  .ss-pop    { animation: ss-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both; }

  .ss-ghost-btn {
    display:flex;align-items:center;justify-content:center;gap:8px;
    padding:12px 22px;border-radius:12px;cursor:pointer;
    background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);
    color:rgba(255,255,255,0.6);font-size:13px;font-weight:700;
    font-family:'Outfit',sans-serif;transition:background 0.2s,color 0.2s,transform 0.15s;
  }
  .ss-ghost-btn:hover{background:rgba(255,255,255,0.09);color:rgba(255,255,255,0.85);transform:translateY(-1px);}

  .ss-primary-btn {
    display:flex;align-items:center;justify-content:center;gap:8px;
    padding:13px 28px;border-radius:12px;cursor:pointer;
    background:linear-gradient(135deg,#7c6af7,#5b21b6);
    border:1px solid rgba(124,106,247,0.4);color:#fff;
    font-size:13px;font-weight:800;font-family:'Outfit',sans-serif;
    box-shadow:0 0 28px rgba(124,106,247,0.3);
    transition:box-shadow 0.2s,transform 0.15s;
  }
  .ss-primary-btn:hover{box-shadow:0 0 42px rgba(124,106,247,0.52);transform:translateY(-1px);}

  .ss-chip-wrap:hover .ss-chip-tip { opacity:1;transform:translateY(0); }

  .ss-scroll::-webkit-scrollbar { width:3px }
  .ss-scroll::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.08);border-radius:99px }
`

/* ─────────────────────────────────────────────────────────────
   Arc narrative — computed from word sentiment scores.
   NOTE: with n=1 word, avg(scores.slice(1,-1)) = avg([]) = NaN.
   All NaN comparisons return false, so we fall through to ∿ —
   acceptable behaviour for single-word sessions.
───────────────────────────────────────────────────────────── */
function computeArc(words) {
  if (!words?.length) return null
  const scores = words.map(w => w.sentimentScore ?? 0)
  const n = scores.length
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length
  const first3 = avg(scores.slice(0, Math.ceil(n / 3)))
  const last3  = avg(scores.slice(-Math.ceil(n / 3)))
  const mid    = avg(scores.slice(Math.ceil(n / 3), -Math.ceil(n / 3)) || scores)
  const range  = Math.max(...scores) - Math.min(...scores)

  if (range < 0.18) return { icon: '⟶', text: 'Your mind stayed steady throughout', color: T.text2 }
  if (last3 - first3 > 0.22)  return { icon: '↗', text: 'You opened up as the session moved forward', color: T.green }
  if (first3 - last3 > 0.22)  return { icon: '↘', text: 'You turned inward as the session deepened', color: '#60a5fa' }
  if (mid > first3 + 0.18 && mid > last3 + 0.18) return { icon: '⌃', text: 'You found your peak and came back down', color: T.amber }
  if (mid < first3 - 0.18 && mid < last3 - 0.18) return { icon: '⌄', text: 'You worked through something heavy in the middle', color: '#a78bfa' }
  return { icon: '∿', text: 'Your emotions moved through different places today', color: T.text2 }
}

/* ─────────────────────────────────────────────────────────────
   SVG score ring — React-state driven (more reliable than CSS
   variable keyframes which have inconsistent browser support).
   Starts fully hidden (offset = circ) then transitions to the
   target gap value after a short delay.
   Trailing glow dot marks the arc tip for a premium feel.
───────────────────────────────────────────────────────────── */
function Ring({ score, color, size = 100, delay = 350 }) {
  const R          = size / 2 - 6
  const circ       = +(2 * Math.PI * R).toFixed(2)
  const targetGap  = +(circ * (1 - score / 100)).toFixed(2)
  const [offset, setOffset] = useState(circ)   // start fully invisible
  const [dotVisible, setDotVisible] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setOffset(targetGap), delay)
    const t2 = setTimeout(() => setDotVisible(true), delay + 200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [targetGap, delay])

  // Arc tip position (for the trailing glow dot)
  const filledAngle = (score / 100) * 2 * Math.PI - Math.PI / 2   // rotated -90°
  const dotX = size / 2 + R * Math.cos(filledAngle)
  const dotY = size / 2 + R * Math.sin(filledAngle)

  return (
    <svg
      width={size} height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ overflow: 'visible' }}
    >
      {/* Track */}
      <circle
        cx={size / 2} cy={size / 2} r={R}
        fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={5}
      />
      {/* Animated arc — 12 o'clock start via transform */}
      <g style={{ transform: 'rotate(-90deg)', transformOrigin: `${size / 2}px ${size / 2}px` }}>
        <circle
          cx={size / 2} cy={size / 2} r={R}
          fill="none" stroke={color} strokeWidth={5} strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{
            transition: `stroke-dashoffset 1.6s cubic-bezier(0.22,1,0.36,1)`,
            filter: `drop-shadow(0 0 4px ${color}99)`,
          }}
        />
      </g>
      {/* Trailing glow dot at arc tip */}
      {score > 0 && (
        <circle
          cx={dotX} cy={dotY} r={4}
          fill={color}
          style={{
            filter: `drop-shadow(0 0 6px ${color})`,
            opacity: dotVisible ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />
      )}
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   Count-up hook — easeOutExpo curve so the number rushes in
   fast and decelerates hard at the end, feels more satisfying
   than easeOutCubic. Returns [displayValue, landed] so callers
   can trigger a one-shot glow when the count hits target.
───────────────────────────────────────────────────────────── */
function useCountUp(target, delay = 350) {
  const [v,      setV]      = useState(0)
  const [landed, setLanded] = useState(false)
  useEffect(() => {
    setV(0)
    setLanded(false)
    // FIX: cancelled flag stops an in-flight rAF loop when target changes
    // or the component unmounts. Previously only the setTimeout was cleared,
    // leaving the rAF tick running and racing with any new animation.
    let cancelled = false
    const t = setTimeout(() => {
      const duration = 1500
      const start = performance.now()
      const tick = (now) => {
        if (cancelled) return
        const p = Math.min((now - start) / duration, 1)
        // easeOutExpo — fast start, hard stop
        const eased = p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)
        setV(Math.round(eased * target))
        if (p < 1) {
          requestAnimationFrame(tick)
        } else {
          setV(target)
          setLanded(true)
        }
      }
      requestAnimationFrame(tick)
    }, delay)
    return () => { clearTimeout(t); cancelled = true }
  }, [target, delay])
  return [v, landed]
}

/* ─────────────────────────────────────────────────────────────
   Animated sentiment bar — IntersectionObserver driven.
   Waits until the bar scrolls into the viewport before
   triggering the scaleX reveal, so bars below the fold don't
   fire before the user ever sees them.
───────────────────────────────────────────────────────────── */
function AnimBar({ pct, color, delay = 0 }) {
  const [go,  setGo]  = useState(false)
  const barRef        = useRef(null)

  useEffect(() => {
    const el = barRef.current
    if (!el) return
    let timer
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        timer = setTimeout(() => setGo(true), delay)
        observer.disconnect()
      }
    }, { threshold: 0.15 })
    observer.observe(el)
    return () => { observer.disconnect(); clearTimeout(timer) }
  }, [delay])

  return (
    <div
      ref={barRef}
      style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}
    >
      <div style={{
        height: '100%', width: `${pct}%`, borderRadius: 99, background: color,
        boxShadow: go ? `0 0 10px ${color}66` : 'none',
        transformOrigin: 'left',
        transform: go ? 'scaleX(1)' : 'scaleX(0)',
        transition: go
          ? 'transform 1s cubic-bezier(0.22,1,0.36,1), box-shadow 0.4s ease'
          : 'none',
      }} />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Journey — dots sized by emotionIntensity, bars by reactionTime
   Empty state when data is missing
───────────────────────────────────────────────────────────── */
function Journey({ words }) {
  const hasIntensity = words.some(w => w.emotionIntensity != null)
  const hasRT        = words.some(w => w.reactionTime != null)
  const maxRT        = Math.max(...words.map(w => w.reactionTime || 0), 1)
  const DOT_MIN = 16, DOT_MAX = 34, BAR_MAX = 20

  if (!words.length) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0', color: T.text3, fontSize: 13 }}>
        No word data available
      </div>
    )
  }

  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: T.text3, marginBottom: 14 }}>
        Emotion journey
      </p>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, overflowX: 'auto', paddingBottom: 4 }} className="ss-scroll">
        {words.map((w, i) => {
          const c       = EMOTION_COLORS[w.emotion] || EMOTION_COLORS.neutral
          const intensity = w.emotionIntensity ?? 0.5      // graceful fallback
          const size    = DOT_MIN + intensity * (DOT_MAX - DOT_MIN)
          const barH    = hasRT ? Math.max(2, Math.round((w.reactionTime / maxRT) * BAR_MAX)) : 0
          const isHigh  = hasRT && (w.reactionTime || 0) > maxRT * 0.68

          return (
            <div key={i} className="ss-chip-wrap" style={{
              position: 'relative', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 4, flexShrink: 0,
              animation: `ss-pop 0.38s cubic-bezier(0.34,1.56,0.64,1) ${0.55 + i * 0.055}s both`,
            }}>
              {/* Tooltip */}
              <div className="ss-chip-tip" style={{
                position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
                transform: 'translateX(-50%) translateY(4px)',
                background: 'rgba(10,10,18,0.97)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '4px 9px', whiteSpace: 'nowrap', zIndex: 20,
                fontSize: 11, fontWeight: 600, color: c.c1,
                opacity: 0, transition: 'opacity 0.15s, transform 0.15s',
                pointerEvents: 'none',
              }}>
                {w.word}
                <span style={{ color: T.text3, fontWeight: 400 }}> · {w.emotion}</span>
                {!hasIntensity && <span style={{ color: T.text3, fontWeight: 400 }}> · intensity N/A</span>}
              </div>

              {/* RT bar */}
              {hasRT && (
                <div style={{
                  width: 3, height: barH, borderRadius: 99, alignSelf: 'flex-end', minHeight: 2,
                  background: isHigh ? 'rgba(251,191,36,0.55)' : 'rgba(255,255,255,0.14)',
                  marginBottom: 3,
                }} />
              )}

              {/* Emotion dot */}
              <div style={{
                width: size, height: size, borderRadius: '50%', cursor: 'default',
                background: `radial-gradient(circle at 36% 32%, ${c.c1}, ${c.c2} 50%, ${c.c3})`,
                boxShadow: `0 0 ${Math.round(size * 0.35)}px ${c.glow}`,
                transition: 'transform 0.2s',
              }} />

              <span style={{ fontSize: 9, color: T.text3, fontWeight: 600 }}>{i + 1}</span>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
        {hasIntensity && (
          <span style={{ fontSize: 10, color: T.text3 }}>● size = emotion intensity</span>
        )}
        {hasRT && (
          <span style={{ fontSize: 10, color: 'rgba(251,191,36,0.5)' }}>▌ bar = reaction time</span>
        )}
        {!hasIntensity && !hasRT && (
          <span style={{ fontSize: 10, color: T.text3 }}>Detailed metrics unavailable for this session</span>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Export story card (requires: npm install html2canvas)
   Falls back to clipboard text if html2canvas not available.
───────────────────────────────────────────────────────────── */
async function exportCard(cardRef, fallbackText) {
  try {
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(cardRef, {
      backgroundColor: '#08080f',
      scale: 2,
      useCORS: true,
    })

    // ── Native Android/iOS — save via Filesystem + Share ──
    if (Capacitor.isNativePlatform()) {
      const base64 = canvas.toDataURL('image/png').split(',')[1]
      const fileName = `mindorb-session-${Date.now()}.png`

      // Write to cache directory
      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Cache,
      })

      // Open native share sheet — user can save to gallery from here
      await Share.share({
        title: 'My MindOrb Session',
        text: 'My cognitive wellness session report',
        url: result.uri,
        dialogTitle: 'Save or share your MindOrb card',
      })
      return true
    }

    // ── Browser — original link.click() approach ──
    const link = document.createElement('a')
    link.download = `mindorb-session-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    return true

  } catch (err) {
    console.error('Export failed:', err)
    await navigator.clipboard?.writeText(fallbackText).catch(() => {})
    return false
  }
}

/* ─────────────────────────────────────────────────────────────
   segmentStory — splits the AI story into plain/highlighted
   segments by matching user-entered words (whole-word, case-
   insensitive). Each matched word carries its emotion color so
   the highlight visually echoes the orb state for that word.
───────────────────────────────────────────────────────────── */
function segmentStory(story, words) {
  if (!story || !words?.length) return [{ plain: true, text: story || '' }]

  const wordMap = {}
  words.forEach(w => {
    const key = w.word.toLowerCase().trim()
    if (!wordMap[key]) {
      const emotionColors  = EMOTION_COLORS[w.emotion] || EMOTION_COLORS.neutral
      const sentimentChip  = SENTIMENT_CHIP[w.sentiment] || SENTIMENT_CHIP.neutral
      wordMap[key] = {
        color: sentimentChip.text,           // green / red / grey by sentiment
        glow:  emotionColors.glow,           // emotion-tinted glow underneath
        sentiment: w.sentiment,
        emotion: w.emotion,
      }
    }
  })

  const userWords = Object.keys(wordMap).sort((a, b) => b.length - a.length)
  if (!userWords.length) return [{ plain: true, text: story }]

  const escaped = userWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex   = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi')

  const segments = []
  let last = 0
  for (const match of story.matchAll(regex)) {
    if (match.index > last)
      segments.push({ plain: true, text: story.slice(last, match.index) })
    const key = match[0].toLowerCase()
    segments.push({ plain: false, text: match[0], meta: wordMap[key] })
    last = match.index + match[0].length
  }
  if (last < story.length) segments.push({ plain: true, text: story.slice(last) })

  return segments
}

/* ═════════════════════════════════════════════════════════════
   STORY SCREEN — main export
═════════════════════════════════════════════════════════════ */
export default function StoryScreen({ session, onNewSession, onDashboard }) {
  const { user } = useAuth()

  const score    = session?.positivityScore   ?? 0
  const mood     = session?.moodLabel         ?? 'Calm'
  const story    = session?.story             ?? ''
  const words    = session?.words             ?? []
  const cli      = session?.cognitiveLoadIndex
  const emotion  = session?.dominantEmotion   ?? 'neutral'
  const streak   = session?.streak ?? user?.streak ?? 1
  const avgRT    = session?.avgReactionTime   ?? null

  const baseline = user?.baselineScore ?? null    // from useAuth
  const colors   = EMOTION_COLORS[emotion] || EMOTION_COLORS.neutral

  const scoreColor  = score >= 70 ? T.green : score >= 45 ? T.amber : T.red
  const [displayScore, scoreLanded] = useCountUp(score)

  // Baseline delta
  const baselineDelta = baseline != null ? score - baseline : null
  const deltaColor    = baselineDelta == null ? T.text3 : baselineDelta >= 0 ? T.green : T.red
  const deltaSign     = baselineDelta != null && baselineDelta >= 0 ? '+' : ''

  // Arc
  const arc = computeArc(words)

  // Badge
  const badge =
    score >= 80 ? { s: '✦', label: 'Radiant',       color: T.amber  } :
    score >= 65 ? { s: '◈', label: 'Balanced',       color: T.green  } :
    score >= 45 ? { s: '◇', label: 'Reflective',     color: T.accent } :
                  { s: '◉', label: 'Brave & honest', color: T.red    }

  // Sentiment counts
  const total    = words.length || 1
  const posCount = words.filter(w => w.sentiment === 'positive').length
  const negCount = words.filter(w => w.sentiment === 'negative').length
  const neuCount = words.filter(w => w.sentiment === 'neutral').length

  // Most intense word — gets highlighted chip
  const maxScore     = Math.max(...words.map(w => w.sentimentScore ?? 0), 0)

  // FIX: responsive score section — grid collapses to column on narrow phones
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 640
  )
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler, { passive: true })
    return () => window.removeEventListener('resize', handler)
  }, [])

  // Typewriter story
  // FIX: store interval in ref so both the timeout AND the interval are
  // properly cleaned up if `story` changes or the component unmounts.
  // Previously `return () => clearInterval(iv)` was inside the setTimeout
  // callback — JavaScript ignores that return value, React never called it.
  const typerIvRef = useRef(null)
  const [typed,  setTyped]  = useState('')
  const [typing, setTyping] = useState(true)
  useEffect(() => {
    if (!story) return
    let i = 0
    const t = setTimeout(() => {
      typerIvRef.current = setInterval(() => {
        i++
        setTyped(story.slice(0, i))
        if (i >= story.length) { clearInterval(typerIvRef.current); setTyping(false) }
      }, 18)
    }, 900)
    return () => { clearTimeout(t); clearInterval(typerIvRef.current) }
  }, [story])

  // Pre-segment story with user words highlighted (computed once)
  const storySegments = useMemo(() => segmentStory(story, words), [story, words])

  // Scroll progress
  const scrollRef   = useRef(null)
  const [progress, setProgress] = useState(0)
  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const max = el.scrollHeight - el.clientHeight
    setProgress(max > 0 ? el.scrollTop / max : 1)
  }, [])

  // Export card ref + state
  // FIX: store the "exported" reset timer in a ref so it's cleared on unmount
  const cardRef          = useRef(null)
  const exportedTimerRef = useRef(null)
  const [exported, setExported] = useState(false)
  useEffect(() => () => clearTimeout(exportedTimerRef.current), [])

  const handleExport = async () => {
    const fallback = `MindOrb session — ${score}% · ${mood}\n\n"${story}"\n\nWords: ${words.map(w => w.word).join(', ')}`
    await exportCard(cardRef.current, fallback)
    setExported(true)
    clearTimeout(exportedTimerRef.current)
    exportedTimerRef.current = setTimeout(() => setExported(false), 2200)
  }

  return (
    <>
      <style>{CSS}</style>

      {/* Ambient glow — FIX: withAlpha() replaces brittle inline regex */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `radial-gradient(ellipse 65% 45% at 50% -5%, ${withAlpha(colors.glow, '0.17')} 0%, transparent 58%)`,
      }} />

      {/* Scroll progress bar — top edge */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2, zIndex: 50,
        background: 'rgba(255,255,255,0.04)',
      }}>
        <div style={{
          height: '100%', background: `linear-gradient(90deg, ${T.accent}, ${colors.c2})`,
          width: `${progress * 100}%`,
          transition: 'width 0.1s linear',
          boxShadow: `0 0 8px ${colors.glow}`,
        }} />
      </div>

      <div style={{
        position: 'relative', zIndex: 1, height: '100%',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Outfit', sans-serif",
        background: T.bg,
        overflow: 'hidden',
      }}>

        {/* ── HEADER ────────────────────────────────────────── */}
        <div className="ss-appear" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 28px', flexShrink: 0,
          borderBottom: `1px solid ${T.border}`,
        }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: T.text3, marginBottom: 4 }}>
              Session complete · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            <h1 style={{ fontSize: 16, fontWeight: 800, color: T.text1, lineHeight: 1 }}>
              Your Mindspace Report
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Export button */}
            <button
              onClick={handleExport}
              className="ss-ghost-btn"
              style={{ padding: '7px 14px', fontSize: 12, gap: 6 }}
            >
              {exported ? <Check size={13} style={{ color: T.green }} /> : <Download size={13} />}
              {exported ? 'Saved!' : 'Save card'}
            </button>

            {/* Badge — hide text label on mobile to prevent header overflow */}
            <div className="ss-pop" style={{
              animationDelay: '0.2s',
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '6px 14px', borderRadius: 999,
              background: `${badge.color}15`, border: `1px solid ${badge.color}32`,
            }}>
              <span style={{ fontSize: 12, color: badge.color }}>{badge.s}</span>
              {!isMobile && (
                <span style={{ fontSize: 11.5, fontWeight: 700, color: badge.color }}>{badge.label}</span>
              )}
            </div>
          </div>
        </div>

        {/* ── SCROLL BODY ────────────────────────────────────── */}
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="ss-scroll"
          style={{ flex: 1, overflowY: 'auto', padding: '0 28px 24px' }}
        >

          {/* ── STORY HERO ──────────────────────────────────── */}
          <div className="ss-reveal" style={{ padding: '36px 0 28px', textAlign: 'center' }}>
            <div style={{ width: 36, height: 1, margin: '0 auto 18px', background: `linear-gradient(90deg, transparent, ${colors.c2}, transparent)` }} />
            <p style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontSize: 21, fontStyle: 'italic', fontWeight: 500,
              lineHeight: 1.78, color: 'rgba(255,255,255,0.78)',
              maxWidth: 560, margin: '0 auto', letterSpacing: '0.01em',
            }}>
              {typing ? (
                /* ── Typewriter phase: plain text + blinking cursor ── */
                <>
                  &ldquo;{typed}
                  <span style={{
                    display: 'inline-block', width: 1.5, height: 17,
                    background: colors.c2, marginLeft: 2, verticalAlign: 'middle',
                    animation: 'ss-cursor 0.75s steps(1) infinite',
                  }} />
                  &rdquo;
                </>
              ) : (
                /* ── Settled phase: words glow in with emotion colors ── */
                <>
                  &ldquo;
                  {storySegments.map((seg, i) =>
                    seg.plain ? seg.text : (
                      <span
                        key={i}
                        className="ss-word-hl"
                        title={`${seg.meta.sentiment} · ${seg.text}`}
                        style={{
                          color: seg.meta.color,
                          borderBottomColor: `${seg.meta.color}55`,
                          textShadow: `0 0 14px ${seg.meta.glow}`,
                          animationDelay: `${i * 0.04}s`,
                        }}
                      >
                        {seg.text}
                      </span>
                    )
                  )}
                  &rdquo;
                </>
              )}
            </p>
            <div style={{ width: 36, height: 1, margin: '18px auto 0', background: `linear-gradient(90deg, transparent, ${colors.c2}, transparent)` }} />
          </div>

          <div style={{ height: 1, background: T.border }} />

          {/* ── SCORE (anchor) + BASELINE + STATS ───────────── */}
          {/* FIX: responsive — switches from 3-col grid to flex-column on
              narrow phones (< 640px) to prevent stats being squashed.
              The ring column swaps its borderRight for a borderBottom. */}
          <div className="ss-reveal" style={{
            animationDelay: '0.15s',
            display: isMobile ? 'flex' : 'grid',
            flexDirection: isMobile ? 'column' : undefined,
            gridTemplateColumns: isMobile ? undefined : 'auto 1px 1fr',
            padding: '24px 0',
          }}>
            {/* Score — number is the anchor, ring is ghost backdrop */}
            <div style={{
              paddingRight: isMobile ? 0 : 28,
              paddingBottom: isMobile ? 20 : 0,
              borderRight: isMobile ? 'none' : `1px solid ${T.border}`,
              borderBottom: isMobile ? `1px solid ${T.border}` : 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}>
              {/* Ring behind the number */}
              <div style={{ position: 'relative', width: 100, height: 100 }}>
                <Ring score={score} color={scoreColor} size={100} />
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                }}>
                  {/* Score — the real anchor */}
                  <span style={{
                    fontFamily: 'Outfit', fontSize: 34, fontWeight: 900,
                    color: scoreColor, lineHeight: 1,
                    animation: 'ss-in 0.4s ease 0.4s both',
                    textShadow: scoreLanded
                      ? `0 0 32px ${scoreColor}88, 0 0 12px ${scoreColor}55`
                      : `0 0 20px ${scoreColor}33`,
                    transition: 'text-shadow 0.5s ease',
                  }}>
                    {displayScore}
                  </span>
                  <span style={{ fontSize: 10, color: T.text3, fontWeight: 600, marginTop: 1 }}>/ 100</span>
                </div>
              </div>

              {/* Mood */}
              <p style={{ fontSize: 15, fontWeight: 800, color: T.text1, marginTop: 4 }}>{mood}</p>
              <p style={{ fontSize: 10, color: T.text3, textTransform: 'capitalize' }}>{emotion}</p>

              {/* Baseline delta — below mood */}
              {baselineDelta != null && (
                <div style={{
                  marginTop: 8, padding: '4px 10px', borderRadius: 999,
                  background: `${deltaColor}12`, border: `1px solid ${deltaColor}28`,
                  fontSize: 11, fontWeight: 700, color: deltaColor,
                  textAlign: 'center',
                }}>
                  {deltaSign}{baselineDelta}pts vs your avg
                </div>
              )}
            </div>

            {/* Divider — hidden on mobile (ring uses borderBottom instead) */}
            {!isMobile && <div style={{ background: T.border, margin: '0 28px' }} />}

            {/* Stats */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 24px',
              paddingTop: isMobile ? 20 : 0,
            }}>
              {[
                { label: 'Cognitive load', value: cli?.index ?? '—', sub: cli?.label ?? 'no data',     color: cli ? (cli.index < 40 ? T.green : cli.index < 65 ? T.amber : T.red) : T.text2 },
                { label: 'Positivity',     value: `${Math.round((posCount / total) * 100)}%`, sub: `${posCount} of ${total} words`, color: T.green },
                { label: 'Words used',     value: words.length, sub: 'free association',                color: T.text1 },
                { label: 'Avg reaction',   value: avgRT ? `${(avgRT / 1000).toFixed(1)}s` : '—', sub: 'per word', color: T.text1 },
              ].map(({ label, value, sub, color }) => (
                <div key={label}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.11em', textTransform: 'uppercase', color: T.text3, marginBottom: 6 }}>{label}</p>
                  <p style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>{value}</p>
                  <p style={{ fontSize: 10.5, color: T.text3, marginTop: 3 }}>{sub}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ height: 1, background: T.border }} />

          {/* ── ARC NARRATIVE ─────────────────────────────── */}
          {arc && (
            <>
              <div className="ss-reveal" style={{ animationDelay: '0.22s', padding: '20px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 22, color: arc.color, lineHeight: 1, flexShrink: 0 }}>{arc.icon}</span>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.11em', textTransform: 'uppercase', color: T.text3, marginBottom: 4 }}>
                      Emotional arc
                    </p>
                    <p style={{ fontSize: 15, fontWeight: 600, color: arc.color, lineHeight: 1.3 }}>
                      {arc.text}
                    </p>
                  </div>
                </div>
              </div>
              <div style={{ height: 1, background: T.border }} />
            </>
          )}

          {/* ── EMOTION JOURNEY ───────────────────────────── */}
          <div className="ss-reveal" style={{ animationDelay: '0.28s', padding: '24px 0' }}>
            <Journey words={words} />
          </div>

          <div style={{ height: 1, background: T.border }} />

          {/* ── SENTIMENT BREAKDOWN ───────────────────────── */}
          <div className="ss-reveal" style={{ animationDelay: '0.34s', padding: '24px 0' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: T.text3, marginBottom: 16 }}>
              Sentiment split
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Positive', count: posCount, color: T.green },
                { label: 'Neutral',  count: neuCount, color: '#52525e' },
                { label: 'Negative', count: negCount, color: T.red },
              ].map(({ label, count, color }, idx) => {
                const pct = Math.round((count / total) * 100)
                return (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}` }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: T.text2 }}>{label}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 800, color }}>{pct}%</span>
                    </div>
                    <AnimBar pct={pct} color={color} delay={420 + idx * 100} />
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ height: 1, background: T.border }} />

          {/* ── WORD CHIPS — intensity ranked ─────────────── */}
          <div className="ss-reveal" style={{ animationDelay: '0.40s', padding: '24px 0' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: T.text3, marginBottom: 14 }}>
              Words this session
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {words
                .slice()
                .sort((a, b) => (b.emotionIntensity ?? 0) - (a.emotionIntensity ?? 0))
                .map((w, i) => {
                  const c        = EMOTION_COLORS[w.emotion] || EMOTION_COLORS.neutral
                  const isTop    = maxScore > 0 && (w.sentimentScore ?? 0) === maxScore
                  // FIX: renamed from `score` to `wordScore` — avoids shadowing the
                  // outer `score = session?.positivityScore` variable from line ~398
                  const wordScore    = w.sentimentScore ?? 0
                  const scoreSign = wordScore >= 0 ? '+' : ''

                  return (
                    <div
                      key={w.word + i}
                      className="ss-chip-wrap ss-pop"
                      style={{
                        animationDelay: `${0.44 + i * 0.042}s`,
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: isTop ? '6px 13px 6px 9px' : '4px 11px 4px 8px',
                        borderRadius: 999,
                        background: isTop ? `${c.c2}22` : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isTop ? c.c2 + '55' : 'rgba(255,255,255,0.09)'}`,
                        position: 'relative',
                      }}
                    >
                      {/* Emotion dot */}
                      <div style={{
                        width: isTop ? 8 : 6, height: isTop ? 8 : 6,
                        borderRadius: '50%', flexShrink: 0,
                        background: c.c2,
                        boxShadow: isTop ? `0 0 8px ${c.glow}` : `0 0 4px ${c.glow}`,
                      }} />

                      {/* Word */}
                      <span style={{
                        fontSize: isTop ? 13 : 12,
                        fontWeight: isTop ? 800 : 600,
                        color: isTop ? T.text1 : T.text2,
                      }}>
                        {w.word}
                      </span>

                      {/* Score delta */}
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        color: w.sentiment === 'positive' ? T.green : w.sentiment === 'negative' ? T.red : T.text3,
                      }}>
                        {scoreSign}{Math.round(wordScore * 100)}
                      </span>

                      {/* "Top" indicator */}
                      {isTop && (
                        <span style={{
                          position: 'absolute', top: -7, right: -6,
                          fontSize: 8, fontWeight: 900, letterSpacing: '0.06em',
                          color: c.c1, background: c.c2,
                          padding: '1px 4px', borderRadius: 4, lineHeight: 1.4,
                        }}>
                          PEAK
                        </span>
                      )}

                      {/* Tooltip */}
                      <div className="ss-chip-tip" style={{
                        position: 'absolute', bottom: 'calc(100% + 7px)', left: '50%',
                        transform: 'translateX(-50%) translateY(4px)',
                        background: 'rgba(10,10,18,0.97)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8, padding: '4px 9px', whiteSpace: 'nowrap', zIndex: 30,
                        fontSize: 11, fontWeight: 600, color: c.c1,
                        opacity: 0, transition: 'opacity 0.15s, transform 0.15s',
                        pointerEvents: 'none',
                      }}>
                        {w.emotion} · intensity {((w.emotionIntensity ?? 0) * 100).toFixed(0)}%
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>

          <div style={{ height: 1, background: T.border }} />

          {/* ── CLI INSIGHT ───────────────────────────────── */}
          {cli?.insight && (
            <>
              <div className="ss-reveal" style={{ animationDelay: '0.46s', padding: '22px 0' }}>
                <div style={{ display: 'flex', gap: 14 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: `${cli.index < 65 ? T.green : T.red}14`,
                    border: `1px solid ${cli.index < 65 ? T.green : T.red}28`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                  }}>🧠</div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.11em', textTransform: 'uppercase', color: T.text3, marginBottom: 6 }}>
                      Cognitive insight
                    </p>
                    <p style={{ fontSize: 13.5, lineHeight: 1.65, color: T.text2, maxWidth: 500 }}>
                      {cli.insight}
                    </p>
                  </div>
                </div>
              </div>
              <div style={{ height: 1, background: T.border }} />
            </>
          )}

          {/* ── STREAK — with pulse personality ───────────── */}
          <div className="ss-reveal" style={{ animationDelay: '0.52s', padding: '20px 0' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(251,191,36,0.09) 0%, rgba(251,191,36,0.03) 100%)',
              border: '1px solid rgba(251,191,36,0.22)',
              animation: 'ss-streak 3s ease-in-out infinite',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* Animated flame block */}
                <div style={{
                  width: 44, height: 44, borderRadius: 13, flexShrink: 0,
                  background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20,
                  animation: 'ss-breathe 2.2s ease-in-out infinite',
                }}>
                  🔥
                </div>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 900, color: T.amber, lineHeight: 1 }}>
                    {streak}-day streak
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
                    Return tomorrow to keep it alive
                  </p>
                </div>
              </div>

              {/* "+1 tomorrow" pill */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}>
                <div style={{
                  fontSize: 18, fontWeight: 900, color: T.amber,
                  fontFamily: 'Outfit', lineHeight: 1,
                }}>
                  +1
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(251,191,36,0.55)' }}>
                  tomorrow
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ── STICKY ACTIONS — clear hierarchy ──────────────── */}
        <div className="ss-reveal" style={{
          animationDelay: '0.6s', flexShrink: 0,
          padding: '14px 28px', display: 'flex', gap: 10, alignItems: 'center',
          borderTop: `1px solid ${T.border}`,
          background: 'rgba(8,8,15,0.7)', backdropFilter: 'blur(16px)',
        }}>
          {/* Ghost — secondary action */}
          <button className="ss-ghost-btn" onClick={onNewSession} style={{ flex: 1 }}>
            <RotateCcw size={14} /> New round
          </button>

          {/* Primary — clearly dominant */}
          <button className="ss-primary-btn" onClick={onDashboard} style={{ flex: 1.6 }}>
            View Dashboard <ArrowRight size={14} />
          </button>
        </div>

        {/* ── HIDDEN EXPORT CARD ─────────────────────────────── */}
        {/* Rendered off-screen; html2canvas snapshots this div */}
        <div ref={cardRef} style={{
          position: 'fixed', left: -9999, top: -9999,
          width: 1200, height: 630,
          background: '#08080f', padding: 64,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          fontFamily: "'Outfit', sans-serif",
        }}>
          {/* Card background glow — FIX: withAlpha() replaces brittle inline regex */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `radial-gradient(ellipse 60% 60% at 80% 80%, ${withAlpha(colors.glow, '0.25')} 0%, transparent 65%)`,
          }} />

          {/* Top row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>
                MindOrb · Session Report
              </p>
              <p style={{ fontSize: 52, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{score}</p>
              <p style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>{mood} · {emotion}</p>
            </div>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: `radial-gradient(circle at 35% 32%, ${colors.c1}, ${colors.c2} 45%, ${colors.c3})`,
              boxShadow: `0 0 40px ${colors.glow}`,
            }} />
          </div>

          {/* Story */}
          <p style={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontSize: 22, fontStyle: 'italic', lineHeight: 1.7,
            color: 'rgba(255,255,255,0.72)', maxWidth: 860, position: 'relative',
          }}>
            "{story}"
          </p>

          {/* Bottom row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxWidth: 700 }}>
              {words.slice(0, 10).map((w, i) => {
                const c = EMOTION_COLORS[w.emotion] || EMOTION_COLORS.neutral
                return (
                  <span key={i} style={{
                    fontSize: 13, fontWeight: 600, color: c.c1,
                    padding: '4px 12px', borderRadius: 999,
                    background: `${c.c2}20`, border: `1px solid ${c.c2}40`,
                  }}>{w.word}</span>
                )
              })}
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontWeight: 600 }}>
              {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

      </div>
    </>
  )
}