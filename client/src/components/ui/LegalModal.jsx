import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

// ─── LegalModal ───────────────────────────────────────────────────────────────
// Full-screen modal for Terms of Service and Privacy Policy.
// To update content: edit TermsContent.jsx or PrivacyContent.jsx only.
//
// Props:
//   isOpen   : boolean
//   onClose  : () => void
//   title    : string  — e.g. 'Terms of Service'
//   children : ReactNode — the content component
// ─────────────────────────────────────────────────────────────────────────────
export function LegalModal({ isOpen, onClose, title, children }) {
  const scrollRef = useRef(null)

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      // Scroll content to top on open
      if (scrollRef.current) scrollRef.current.scrollTop = 0
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    if (isOpen) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-end',       // anchored to bottom on mobile
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        animation: 'fade-in 0.2s ease both',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Modal panel */}
      <div
        style={{
          width: '100%',
          maxWidth: 680,            // constrained on desktop
          height: '92dvh',          // 92% viewport — feels full-screen on mobile
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderBottom: 'none',
          borderRadius: 'var(--radius-2xl) var(--radius-2xl) 0 0',
          overflow: 'hidden',
          animation: 'legal-slide-up 0.3s cubic-bezier(0.22,1,0.36,1) both',
          boxShadow: '0 -24px 80px rgba(0,0,0,0.5)',
          position: 'relative',
        }}
      >
        {/* Top shimmer line */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(124,106,247,0.4) 30%, rgba(167,139,250,0.6) 50%, rgba(124,106,247,0.4) 70%, transparent)',
          pointerEvents: 'none',
          zIndex: 2,
        }} />

        {/* Drag handle (mobile affordance) */}
        <div style={{
          display: 'flex', justifyContent: 'center',
          paddingTop: 12, paddingBottom: 4, flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 4,
            borderRadius: 2,
            background: 'var(--color-border-2)',
          }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 24px 16px',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
        }}>
          <div>
            <p style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--color-accent-2)',
              fontFamily: 'var(--font-display)', marginBottom: 2,
            }}>
              MindOrb
            </p>
            <h2 style={{
              fontSize: 20, fontWeight: 700,
              fontFamily: 'var(--font-display)',
              color: 'var(--color-text-1)',
              margin: 0,
            }}>
              {title}
            </h2>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 36, height: 36,
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-2)',
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--color-surface-3)'
              e.currentTarget.style.color = 'var(--color-text-1)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--color-surface-2)'
              e.currentTarget.style.color = 'var(--color-text-2)'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '28px 24px 48px',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {children}
        </div>

        {/* Bottom fade */}
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0, height: 48,
          background: 'linear-gradient(to top, var(--color-surface), transparent)',
          pointerEvents: 'none',
        }} />
      </div>

      <style>{`
        @keyframes legal-slide-up {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ─── Shared prose styles for legal content ────────────────────────────────────
// Use these inside TermsContent and PrivacyContent for consistent formatting.
export const legalStyles = {
  section: {
    marginBottom: 32,
  },
  h3: {
    fontSize: 15,
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    color: 'var(--color-text-1)',
    marginBottom: 10,
    marginTop: 0,
  },
  p: {
    fontSize: 13.5,
    lineHeight: 1.75,
    color: 'var(--color-text-2)',
    margin: '0 0 10px',
    fontFamily: 'var(--font-body)',
  },
  ul: {
    paddingLeft: 20,
    margin: '8px 0',
  },
  li: {
    fontSize: 13.5,
    lineHeight: 1.75,
    color: 'var(--color-text-2)',
    marginBottom: 6,
    fontFamily: 'var(--font-body)',
  },
  lastUpdated: {
    fontSize: 11,
    color: 'var(--color-text-3)',
    fontFamily: 'var(--font-body)',
    marginBottom: 28,
    display: 'block',
  },
  divider: {
    height: 1,
    background: 'var(--color-border)',
    margin: '24px 0',
    border: 'none',
  },
  highlight: {
    background: 'rgba(124,106,247,0.08)',
    border: '1px solid rgba(124,106,247,0.15)',
    borderRadius: 10,
    padding: '12px 16px',
    marginBottom: 16,
  },
  highlightText: {
    fontSize: 13,
    color: 'var(--color-accent-2)',
    fontFamily: 'var(--font-body)',
    lineHeight: 1.6,
    margin: 0,
  },
}