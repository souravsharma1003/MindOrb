import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// ── Emotion colors for orb demo ─────────────────────────────────
const EMOTION_SEQUENCE = [
  { emotion: 'anticipation', c1: '#ddd6fe', c2: '#7c6af7', c3: '#5b21b6', glow: 'rgba(124,106,247,0.5)', word: 'growth' },
  { emotion: 'joy',          c1: '#fde68a', c2: '#f59e0b', c3: '#d97706', glow: 'rgba(251,191,36,0.5)',  word: 'joy'    },
  { emotion: 'trust',        c1: '#6ee7b7', c2: '#10b981', c3: '#059669', glow: 'rgba(52,211,153,0.5)',  word: 'calm'   },
  { emotion: 'surprise',     c1: '#a5f3fc', c2: '#06b6d4', c3: '#0e7490', glow: 'rgba(6,182,212,0.5)',   word: 'wonder' },
  { emotion: 'anticipation', c1: '#ddd6fe', c2: '#7c6af7', c3: '#5b21b6', glow: 'rgba(124,106,247,0.5)', word: 'dream'  },
]

// ── Hero Orb ─────────────────────────────────────────────────────
function HeroOrb({ size = 220 }) {
  const [idx, setIdx]        = useState(0)
  const [reacting, setReact] = useState(false)

  useEffect(() => {
    const iv = setInterval(() => {
      setReact(true)
      setTimeout(() => {
        setIdx(i => (i + 1) % EMOTION_SEQUENCE.length)
        setReact(false)
      }, 300)
    }, 2800)
    return () => clearInterval(iv)
  }, [])

  const e     = EMOTION_SEQUENCE[idx]
  const scale = reacting ? 1.15 : 1

  return (
    <div style={{ position: 'relative', width: size, height: size,
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        position: 'absolute', inset: -24, borderRadius: '50%',
        border: `1px solid ${e.c2}18`,
        transform: `scale(${scale * 1.08})`,
        transition: 'transform 0.7s cubic-bezier(0.34,1.56,0.64,1), border-color 1.5s ease',
      }} />
      <div style={{
        position: 'absolute', inset: -10, borderRadius: '50%',
        border: `1px solid ${e.c2}28`,
        transform: `scale(${scale * 1.03})`,
        transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1), border-color 1.5s ease',
      }} />
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: `radial-gradient(circle at 35% 32%, ${e.c1} 0%, ${e.c2} 45%, ${e.c3} 100%)`,
        boxShadow: `0 0 80px 20px ${e.glow}, 0 0 160px 40px ${e.glow.replace(/[\d.]+\)$/, '0.15)')}, inset 0 1px 0 rgba(255,255,255,0.3)`,
        transform: `scale(${scale})`,
        transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1), background 1.5s ease, box-shadow 1.5s ease',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: '18%', left: '22%',
          width: '30%', height: '20%',
          background: 'rgba(255,255,255,0.3)',
          borderRadius: '50%', filter: 'blur(8px)',
        }} />
      </div>
      <div style={{
        position: 'absolute', top: -18,
        background: 'rgba(15,15,26,0.9)',
        border: `1px solid ${e.c2}44`,
        borderRadius: 99, padding: '4px 14px',
        fontSize: 12, fontWeight: 600,
        color: e.c2, fontFamily: 'var(--font-display)',
        backdropFilter: 'blur(8px)',
        transition: 'all 1s ease',
        opacity: reacting ? 0 : 1,
        transform: reacting ? 'translateY(6px)' : 'translateY(0)',
        whiteSpace: 'nowrap',
      }}>
        {e.word}
      </div>
    </div>
  )
}

// ── Navbar ───────────────────────────────────────────────────────
function Navbar({ user, onLogin, onSignup, onDashboard }) {
  const [scrolled,     setScrolled]     = useState(false)
  const [menuOpen,     setMenuOpen]     = useState(false)
  const [isMobile,     setIsMobile]     = useState(window.innerWidth < 768)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('scroll', onScroll)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: isMobile ? '0 20px' : '0 48px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled || menuOpen ? 'rgba(8,8,15,0.92)' : 'transparent',
        backdropFilter: scrolled || menuOpen ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'radial-gradient(circle at 35% 35%, #c4b5fd, #7c6af7 50%, #4f3fb5)',
            boxShadow: '0 0 14px rgba(124,106,247,0.4)',
          }} />
          <span className="font-display font-bold"
            style={{ fontSize: 16, color: 'var(--color-text-1)', letterSpacing: '-0.02em' }}>
            MindOrb
          </span>
        </div>

        {/* Nav links — desktop only */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: 32 }}>
            {['Features', 'How it works', 'Insights'].map(link => (
              <a key={link} href={`#${link.toLowerCase().replace(/\s+/g, '-')}`}
                style={{
                  fontSize: 14, color: 'var(--color-text-2)',
                  textDecoration: 'none', fontWeight: 500,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text-1)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-2)'}
              >
                {link}
              </a>
            ))}
          </div>
        )}

        {/* CTA — desktop */}
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {user ? (
              <>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '4px 12px 4px 4px', borderRadius: 99,
                  background: 'rgba(124,106,247,0.1)',
                  border: '1px solid rgba(124,106,247,0.2)',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'radial-gradient(circle at 35% 35%, #c4b5fd, #7c6af7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: '#fff',
                    fontFamily: 'var(--font-display)',
                  }}>
                    {user.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--color-text-2)',
                    fontFamily: 'var(--font-display)', fontWeight: 500 }}>
                    {user.name.split(' ')[0]}
                  </span>
                </div>
                <button onClick={onDashboard} style={{
                  padding: '8px 20px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  background: 'var(--color-accent)', color: '#fff',
                  fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-display)',
                  boxShadow: '0 0 20px rgba(124,106,247,0.35)',
                  transition: 'opacity 0.15s, box-shadow 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.boxShadow = '0 0 30px rgba(124,106,247,0.5)' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1';   e.currentTarget.style.boxShadow = '0 0 20px rgba(124,106,247,0.35)' }}
                >
                  Dashboard →
                </button>
              </>
            ) : (
              <>
                <button onClick={onLogin} style={{
                  padding: '7px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  background: 'transparent', color: 'var(--color-text-2)',
                  fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-body)',
                  transition: 'color 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text-1)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-2)'}
                >
                  Sign in
                </button>
                <button onClick={onSignup} style={{
                  padding: '8px 20px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  background: 'var(--color-accent)', color: '#fff',
                  fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-display)',
                  boxShadow: '0 0 20px rgba(124,106,247,0.35)',
                  transition: 'opacity 0.15s, box-shadow 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.boxShadow = '0 0 30px rgba(124,106,247,0.5)' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1';   e.currentTarget.style.boxShadow = '0 0 20px rgba(124,106,247,0.35)' }}
                >
                  Get started
                </button>
              </>
            )}
          </div>
        )}

        {/* Hamburger — mobile only */}
        {isMobile && (
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', gap: 5, padding: 4,
            }}
          >
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 22, height: 2, borderRadius: 2,
                background: 'var(--color-text-2)',
                transition: 'all 0.3s ease',
                transform: menuOpen
                  ? i === 0 ? 'rotate(45deg) translate(5px, 5px)'
                  : i === 1 ? 'opacity: 0'
                  : 'rotate(-45deg) translate(5px, -5px)'
                  : 'none',
                opacity: menuOpen && i === 1 ? 0 : 1,
              }} />
            ))}
          </button>
        )}
      </nav>

      {/* Mobile dropdown menu */}
      {isMobile && menuOpen && (
        <div style={{
          position: 'fixed', top: 64, left: 0, right: 0, zIndex: 99,
          background: 'rgba(8,8,15,0.97)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          padding: '20px 24px 28px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {['Features', 'How it works', 'Insights'].map(link => (
            <a key={link}
              href={`#${link.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => setMenuOpen(false)}
              style={{
                fontSize: 16, color: 'var(--color-text-2)',
                textDecoration: 'none', fontWeight: 500,
                padding: '10px 0',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}>
              {link}
            </a>
          ))}
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {user ? (
              <button onClick={() => { onDashboard(); setMenuOpen(false) }} style={{
                padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'var(--color-accent)', color: '#fff',
                fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-display)',
              }}>
                Dashboard →
              </button>
            ) : (
              <>
                <button onClick={() => { onSignup(); setMenuOpen(false) }} style={{
                  padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: 'var(--color-accent)', color: '#fff',
                  fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-display)',
                }}>
                  Get started
                </button>
                <button onClick={() => { onLogin(); setMenuOpen(false) }} style={{
                  padding: '12px', borderRadius: 10, cursor: 'pointer',
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-2)',
                  fontSize: 15, fontWeight: 500, fontFamily: 'var(--font-display)',
                }}>
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ── Section fade-in on scroll ────────────────────────────────────
function FadeSection({ children, delay = 0 }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.15 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(32px)',
      transition: `opacity 0.7s ease ${delay}s, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
    }}>
      {children}
    </div>
  )
}

// ── Feature card ─────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, accentColor, delay }) {
  const [hovered, setHovered] = useState(false)
  return (
    <FadeSection delay={delay}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          padding: '28px 24px', borderRadius: 20,
          background: hovered ? 'var(--color-surface-2)' : 'var(--color-surface)',
          border: `1px solid ${hovered ? accentColor + '33' : 'var(--color-border)'}`,
          transition: 'all 0.25s ease',
          cursor: 'default', position: 'relative', overflow: 'hidden',
        }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.13) 50%, rgba(255,255,255,0.08) 70%, transparent)',
        }} />
        {hovered && (
          <div style={{
            position: 'absolute', top: -40, right: -40,
            width: 120, height: 120, borderRadius: '50%',
            background: `radial-gradient(circle, ${accentColor}20 0%, transparent 70%)`,
            pointerEvents: 'none',
          }} />
        )}
        <div style={{
          width: 44, height: 44, borderRadius: 12, marginBottom: 18,
          background: `${accentColor}18`,
          border: `1px solid ${accentColor}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, transition: 'transform 0.2s',
          transform: hovered ? 'scale(1.08)' : 'scale(1)',
        }}>
          {icon}
        </div>
        <div className="font-display font-semibold"
          style={{ fontSize: 16, color: 'var(--color-text-1)', marginBottom: 8 }}>
          {title}
        </div>
        <p style={{ fontSize: 14, color: 'var(--color-text-2)',
          lineHeight: 1.65, margin: 0 }}>
          {desc}
        </p>
      </div>
    </FadeSection>
  )
}

// ── Step card ────────────────────────────────────────────────────
function StepCard({ number, title, desc, delay }) {
  return (
    <FadeSection delay={delay}>
      <div style={{
        display: 'flex', gap: 20, padding: '24px',
        borderRadius: 16,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07) 50%, transparent)',
        }} />
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(124,106,247,0.12)',
          border: '1px solid rgba(124,106,247,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700,
          color: 'var(--color-accent-2)',
        }}>
          {number}
        </div>
        <div>
          <div className="font-display font-semibold"
            style={{ fontSize: 15, color: 'var(--color-text-1)', marginBottom: 6 }}>
            {title}
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--color-text-2)',
            lineHeight: 1.65, margin: 0 }}>
            {desc}
          </p>
        </div>
      </div>
    </FadeSection>
  )
}

// ── Word ticker ──────────────────────────────────────────────────
function WordTicker() {
  const WORDS = [
    { w: 'growth',    s: 'positive' }, { w: 'calm',      s: 'positive' },
    { w: 'clarity',   s: 'positive' }, { w: 'peace',     s: 'positive' },
    { w: 'tired',     s: 'negative' }, { w: 'joy',       s: 'positive' },
    { w: 'pressure',  s: 'negative' }, { w: 'hope',      s: 'positive' },
    { w: 'focus',     s: 'positive' }, { w: 'wonder',    s: 'positive' },
    { w: 'grateful',  s: 'positive' }, { w: 'stress',    s: 'negative' },
    { w: 'serene',    s: 'positive' }, { w: 'dream',     s: 'positive' },
    { w: 'alive',     s: 'positive' }, { w: 'heavy',     s: 'negative' },
    { w: 'bright',    s: 'positive' }, { w: 'free',      s: 'positive' },
  ]
  const doubled = [...WORDS, ...WORDS]

  const chipStyle = (s) => ({
    display: 'inline-block', padding: '5px 14px', borderRadius: 99,
    fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
    fontFamily: 'var(--font-display)',
    background: s === 'positive' ? 'rgba(52,211,153,0.1)'
      : s === 'negative' ? 'rgba(248,113,113,0.1)' : 'rgba(142,142,160,0.08)',
    border: `1px solid ${s === 'positive' ? 'rgba(52,211,153,0.2)'
      : s === 'negative' ? 'rgba(248,113,113,0.2)' : 'rgba(142,142,160,0.15)'}`,
    color: s === 'positive' ? '#34d399' : s === 'negative' ? '#f87171' : '#8e8ea0',
  })

  return (
    <div style={{ overflow: 'hidden', position: 'relative', padding: '20px 0' }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 120, zIndex: 2,
        background: 'linear-gradient(90deg, var(--color-bg), transparent)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 120, zIndex: 2,
        background: 'linear-gradient(-90deg, var(--color-bg), transparent)',
        pointerEvents: 'none',
      }} />
      <div style={{
        display: 'flex', gap: 10,
        animation: 'ticker 28s linear infinite',
        width: 'max-content',
      }}>
        {doubled.map((item, i) => (
          <span key={i} style={chipStyle(item.s)}>{item.w}</span>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   MAIN LANDING PAGE
══════════════════════════════════════════════════════════════ */
export default function Landing() {
  const navigate    = useNavigate()
  const { user }    = useAuth()
  const goAuth      = (mode = 'signup') => navigate('/auth', { state: { mode } })
  const goDashboard = () => navigate('/dashboard')

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh', overflowX: 'hidden' }}>

      <style>{`
        @keyframes ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>

      <Navbar
        user={user}
        onLogin={() => goAuth('login')}
        onSignup={() => goAuth('signup')}
        onDashboard={goDashboard}
      />

      {/* ── HERO ─────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '120px 24px 80px', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Ambient background */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{
            position: 'absolute', top: '5%', left: '10%',
            width: '40%', height: '50%',
            background: 'radial-gradient(ellipse, rgba(124,106,247,0.15) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }} />
          <div style={{
            position: 'absolute', bottom: '10%', right: '10%',
            width: '35%', height: '40%',
            background: 'radial-gradient(ellipse, rgba(52,211,153,0.08) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }} />
          <div style={{
            position: 'absolute', top: '40%', right: '20%',
            width: '25%', height: '30%',
            background: 'radial-gradient(ellipse, rgba(251,191,36,0.06) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }} />
        </div>

        {/* Badge */}
        <div className="animate-fade-up" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 16px', borderRadius: 99, marginBottom: 40,
          background: 'rgba(124,106,247,0.1)',
          border: '1px solid rgba(124,106,247,0.25)',
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--color-green)',
            animation: 'pulse-dot 2s ease-in-out infinite',
          }} />
          <span className="font-display" style={{
            fontSize: 12, fontWeight: 600, color: 'var(--color-accent-2)',
            letterSpacing: '0.03em',
          }}>
            Cognitive wellness · Powered by AI
          </span>
        </div>

        {/* Orb */}
        <div className="animate-fade-up delay-100" style={{ marginBottom: 48 }}>
          <HeroOrb size={200} />
        </div>

        {/* Headline */}
        <h1 className="font-display animate-fade-up delay-200"
          style={{
            fontSize: 'clamp(36px, 6vw, 72px)',
            fontWeight: 700, lineHeight: 1.08,
            letterSpacing: '-0.03em',
            color: 'var(--color-text-1)',
            maxWidth: 800, margin: '0 auto 24px',
          }}>
          Your words reveal<br />
          <span style={{
            background: 'linear-gradient(135deg, #a78bfa, #7c6af7, #34d399)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            your mind.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="animate-fade-up delay-300"
          style={{
            fontSize: 'clamp(16px, 2vw, 20px)',
            color: 'var(--color-text-2)', lineHeight: 1.65,
            maxWidth: 540, margin: '0 auto 44px',
            fontFamily: 'var(--font-body)',
          }}>
          MindOrb uses the words that come naturally to you
          to reveal patterns in your thinking, track positivity
          over time, and generate a personal story of your mind.
        </p>

        {/* CTAs — auth-aware */}
        <div className="animate-fade-up delay-400"
          style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {user ? (
            // ── Logged in hero CTA ──
            <button onClick={goDashboard} style={{
              padding: '14px 32px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: 'var(--color-accent)', color: '#fff',
              fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)',
              boxShadow: '0 0 32px rgba(124,106,247,0.4)',
              transition: 'all 0.2s ease', letterSpacing: '-0.01em',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 40px rgba(124,106,247,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)';    e.currentTarget.style.boxShadow = '0 0 32px rgba(124,106,247,0.4)' }}
            >
              Go to your dashboard <span style={{ fontSize: 16 }}>→</span>
            </button>
          ) : (
            // ── Logged out hero CTAs ──
            <>
              <button onClick={() => goAuth('signup')} style={{
                padding: '14px 32px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'var(--color-accent)', color: '#fff',
                fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)',
                boxShadow: '0 0 32px rgba(124,106,247,0.4)',
                transition: 'all 0.2s ease', letterSpacing: '-0.01em',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 40px rgba(124,106,247,0.5)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)';    e.currentTarget.style.boxShadow = '0 0 32px rgba(124,106,247,0.4)' }}
              >
                Begin your journey <span style={{ fontSize: 16 }}>→</span>
              </button>
              <button onClick={() => goAuth('login')} style={{
                padding: '14px 28px', borderRadius: 12, cursor: 'pointer',
                background: 'transparent',
                border: '1px solid var(--color-border-2)',
                color: 'var(--color-text-2)',
                fontSize: 15, fontWeight: 500, fontFamily: 'var(--font-display)',
                transition: 'all 0.2s ease',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'var(--color-text-1)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border-2)';  e.currentTarget.style.color = 'var(--color-text-2)' }}
              >
                Sign in
              </button>
            </>
          )}
        </div>

        {/* Scroll hint */}
        <div className="animate-fade-up delay-500"
          style={{ marginTop: 64, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-3)',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            fontFamily: 'var(--font-display)', fontWeight: 600 }}>
            Scroll to explore
          </div>
          <div style={{
            width: 1, height: 40,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.2), transparent)',
          }} />
        </div>
      </section>

      {/* ── WORD TICKER ──────────────────────────────────── */}
      <div style={{
        borderTop: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
      }}>
        <WordTicker />
      </div>

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section id="how-it-works" style={{
        padding: 'clamp(60px, 8vw, 120px) clamp(24px, 8vw, 120px)',
        maxWidth: 1100, margin: '0 auto',
      }}>
        <FadeSection>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{
              display: 'inline-block', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--color-accent-2)', marginBottom: 16,
              fontFamily: 'var(--font-display)',
            }}>
              How it works
            </div>
            <h2 className="font-display font-bold"
              style={{ fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-0.025em',
                color: 'var(--color-text-1)', lineHeight: 1.15, margin: '0 auto',
                maxWidth: 600 }}>
              Three minutes.<br />Infinite self-awareness.
            </h2>
          </div>
        </FadeSection>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <StepCard delay={0.1} number="1" title="Take a breath"
            desc="Before each session, a 30-second breathing exercise settles your mind. What surfaces is authentic — not forced." />
          <StepCard delay={0.2} number="2" title="Type 10 words"
            desc="Whatever comes to mind. No prompts, no right answers. Your subconscious knows what to say. The orb reacts in real time." />
          <StepCard delay={0.3} number="3" title="Receive your story"
            desc="AI weaves your 10 words into a personal narrative and surfaces cognitive patterns you didn't know were there." />
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────── */}
      <section id="features" style={{
        padding: 'clamp(60px, 8vw, 120px) clamp(24px, 8vw, 120px)',
        maxWidth: 1100, margin: '0 auto',
      }}>
        <FadeSection>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{
              display: 'inline-block', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--color-accent-2)', marginBottom: 16,
              fontFamily: 'var(--font-display)',
            }}>
              Features
            </div>
            <h2 className="font-display font-bold"
              style={{ fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-0.025em',
                color: 'var(--color-text-1)', lineHeight: 1.15, margin: 0 }}>
              Built to understand you.
            </h2>
          </div>
        </FadeSection>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
          <FeatureCard delay={0.05} icon="◎" accentColor="#7c6af7"
            title="The Living Orb"
            desc="A central entity that reacts to every word you type — shifting color, pulsing, and morphing based on the emotion it detects." />
          <FeatureCard delay={0.1} icon="✦" accentColor="#34d399"
            title="AI Session Stories"
            desc="After 10 words, an AI model weaves a poetic personal narrative — a mirror held up to your mental state that day." />
          <FeatureCard delay={0.15} icon="⬡" accentColor="#fbbf24"
            title="Emotion Wheel"
            desc="Goes beyond positive/negative. Classifies each word into Plutchik's 8 primary emotions for richer self-understanding." />
          <FeatureCard delay={0.2} icon="≈" accentColor="#38bdf8"
            title="Cognitive Load Index"
            desc="A novel metric combining reaction time variance, sentiment complexity, and emotional switching into a single clarity score." />
          <FeatureCard delay={0.25} icon="↗" accentColor="#a78bfa"
            title="Mood Timeline"
            desc="Watch your positivity evolve day by day, week by week. Patterns emerge that you never noticed in real time." />
          <FeatureCard delay={0.3} icon="⇄" accentColor="#f87171"
            title="Session Compare"
            desc="Pick any two sessions and overlay them on a radar chart. See exactly what changed between a good day and a hard one." />
        </div>
      </section>

      {/* ── INSIGHTS DEMO ────────────────────────────────── */}
      <section id="insights" style={{
        padding: 'clamp(60px, 8vw, 100px) clamp(24px, 8vw, 120px)',
        maxWidth: 1100, margin: '0 auto',
      }}>
        <FadeSection>
          <div style={{
            borderRadius: 24,
            background: 'linear-gradient(135deg, rgba(124,106,247,0.1) 0%, rgba(52,211,153,0.06) 100%)',
            border: '1px solid rgba(124,106,247,0.2)',
            padding: 'clamp(32px, 6vw, 64px)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 48, alignItems: 'center',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: '-30%', right: '-10%',
              width: '50%', height: '80%',
              background: 'radial-gradient(ellipse, rgba(52,211,153,0.1) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <div>
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'var(--color-green)',
                marginBottom: 16, fontFamily: 'var(--font-display)',
              }}>
                Real insights
              </div>
              <h2 className="font-display font-bold"
                style={{ fontSize: 'clamp(24px, 3.5vw, 40px)', letterSpacing: '-0.025em',
                  color: 'var(--color-text-1)', lineHeight: 1.2, marginBottom: 20 }}>
                Patterns you never knew existed.
              </h2>
              <p style={{ fontSize: 15, color: 'var(--color-text-2)',
                lineHeight: 1.7, marginBottom: 32, fontFamily: 'var(--font-body)' }}>
                MindOrb doesn't just store your words — it finds the story behind them.
                Day-of-week patterns, time-of-day correlations, recurring themes,
                and your personal cognitive fingerprint.
              </p>
              {[
                '"Morning sessions are 23% more positive for you."',
                '"You\'ve used \'growth\' 8 times this week — up from 2 last week."',
                '"Your cognitive load peaks on Monday afternoons."',
              ].map((insight, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    background: i === 0 ? '#34d399' : i === 1 ? '#7c6af7' : '#fbbf24',
                    marginTop: 6,
                  }} />
                  <p style={{ fontSize: 13.5, color: 'var(--color-text-2)',
                    margin: 0, lineHeight: 1.55, fontStyle: 'italic' }}>
                    {insight}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { value: '10', label: 'Words per session' },
                { value: '8',  label: 'Plutchik emotions' },
                { value: '7',  label: 'Radar dimensions' },
                { value: '∞',  label: 'Insights over time' },
              ].map(s => (
                <div key={s.label} style={{
                  padding: '24px 20px', borderRadius: 16, textAlign: 'center',
                  background: 'rgba(8,8,15,0.5)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  backdropFilter: 'blur(8px)',
                }}>
                  <div className="font-display font-bold"
                    style={{ fontSize: 40, lineHeight: 1, letterSpacing: '-0.04em',
                      color: 'var(--color-text-1)', marginBottom: 8 }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 500 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeSection>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────── */}
      <section style={{
        padding: 'clamp(80px, 10vw, 140px) 24px',
        textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '60%', height: '80%',
          background: 'radial-gradient(ellipse, rgba(124,106,247,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <FadeSection>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
              <HeroOrb size={140} />
            </div>
            <h2 className="font-display font-bold"
              style={{ fontSize: 'clamp(32px, 5vw, 60px)', letterSpacing: '-0.03em',
                color: 'var(--color-text-1)', lineHeight: 1.1, marginBottom: 20 }}>
              Ready to meet your mind?
            </h2>
            <p style={{ fontSize: 17, color: 'var(--color-text-2)',
              marginBottom: 40, maxWidth: 420, margin: '0 auto 40px',
              fontFamily: 'var(--font-body)', lineHeight: 1.6 }}>
              It takes 3 minutes. No journal required. Just 10 honest words.
            </p>
            {/* Final CTA — auth-aware */}
            {user ? (
              <button onClick={goDashboard} style={{
                padding: '16px 40px', borderRadius: 14, border: 'none', cursor: 'pointer',
                background: 'var(--color-accent)', color: '#fff',
                fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)',
                boxShadow: '0 0 40px rgba(124,106,247,0.45)',
                letterSpacing: '-0.01em', transition: 'all 0.2s ease',
                display: 'inline-flex', alignItems: 'center', gap: 10,
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 50px rgba(124,106,247,0.55)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)';    e.currentTarget.style.boxShadow = '0 0 40px rgba(124,106,247,0.45)' }}
              >
                Go to your dashboard <span style={{ fontSize: 18 }}>→</span>
              </button>
            ) : (
              <button onClick={() => goAuth('signup')} style={{
                padding: '16px 40px', borderRadius: 14, border: 'none', cursor: 'pointer',
                background: 'var(--color-accent)', color: '#fff',
                fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)',
                boxShadow: '0 0 40px rgba(124,106,247,0.45)',
                letterSpacing: '-0.01em', transition: 'all 0.2s ease',
                display: 'inline-flex', alignItems: 'center', gap: 10,
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 50px rgba(124,106,247,0.55)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)';    e.currentTarget.style.boxShadow = '0 0 40px rgba(124,106,247,0.45)' }}
              >
                Begin your journey <span style={{ fontSize: 18 }}>→</span>
              </button>
            )}
          </div>
        </FadeSection>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer style={{
        padding: 'clamp(20px, 4vw, 28px) clamp(20px, 5vw, 48px)',
        borderTop: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 7,
            background: 'radial-gradient(circle at 35% 35%, #c4b5fd, #7c6af7 50%, #4f3fb5)',
          }} />
          <span className="font-display font-semibold"
            style={{ fontSize: 13, color: 'var(--color-text-2)' }}>
            MindOrb
          </span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
          Built for minds that want to grow.
        </span>
        <div style={{ display: 'flex', gap: 20 }}>
          {['Privacy', 'Terms', 'Contact'].map(l => (
            <span key={l} style={{
              fontSize: 12, color: 'var(--color-text-3)', cursor: 'pointer',
              transition: 'color 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text-2)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-3)'}
            >
              {l}
            </span>
          ))}
        </div>
      </footer>
    </div>
  )
}