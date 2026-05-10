import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

export default function NotFound() {
  const overlayRef = useRef(null)

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!overlayRef.current) return
      const gradient = `radial-gradient(circle 150px at ${e.clientX}px ${e.clientY}px, transparent 0%, black 150px)`
      overlayRef.current.style.maskImage = gradient
      overlayRef.current.style.webkitMaskImage = gradient
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div style={{
      position: 'relative', width: '100vw', height: '100vh',
      background: 'var(--color-bg)', overflow: 'hidden',
    }}>
      {/* Main content */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 10,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '0 24px',
      }}>
        {/* Mini orb */}
        <div style={{
          width: 64, height: 64, borderRadius: '50%', marginBottom: 32,
          background: 'radial-gradient(circle at 35% 35%, #c4b5fd, #7c6af7 50%, #4f3fb5)',
          boxShadow: '0 0 40px rgba(124,106,247,0.4)',
          animation: 'orb-pulse 3s ease-in-out infinite',
        }} />

        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(48px, 10vw, 80px)',
          fontWeight: 900, letterSpacing: '-0.04em',
          color: 'rgba(255,255,255,0.08)', marginBottom: 8,
          lineHeight: 1,
        }}>
          404
        </h1>

        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(18px, 4vw, 24px)',
          fontWeight: 700, color: 'var(--color-text-1)', marginBottom: 12,
        }}>
          Page not found
        </h2>

        <p style={{
          fontSize: 14, color: 'var(--color-text-3)',
          maxWidth: 320, lineHeight: 1.6, marginBottom: 32,
        }}>
          This page doesn't exist or was moved. Let's get you back.
        </p>

        <Link to="/" style={{
          padding: '11px 28px', borderRadius: 12,
          background: 'var(--color-accent)',
          color: '#fff', fontSize: 14, fontWeight: 600,
          fontFamily: 'var(--font-display)',
          textDecoration: 'none',
          boxShadow: '0 0 24px rgba(124,106,247,0.35)',
          transition: 'opacity 0.2s ease',
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Go home
        </Link>
      </div>

      {/* Spotlight overlay */}
      <div
        ref={overlayRef}
        style={{
          position: 'absolute', inset: 0, zIndex: 20,
          background: 'black', pointerEvents: 'none',
          maskImage: 'radial-gradient(circle 120px at 50% 50%, transparent 0%, black 150px)',
          WebkitMaskImage: 'radial-gradient(circle 120px at 50% 50%, transparent 0%, black 150px)',
        }}
      />
    </div>
  )
}