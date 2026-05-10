import { useState, useEffect } from 'react'
import SideBar from './SideBar'

export default function DashboardLayout({ children, title, subtitle }) {
  // window.innerWidth is more reliable than matchMedia in DevTools responsive
  // mode — lazy initializer means the correct value is known before first render,
  // no flash to desktop layout on mobile.
  const [isMobile, setIsMobile]       = useState(() => window.innerWidth <= 767)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const handle = () => {
      const mobile = window.innerWidth <= 767
      setIsMobile(mobile)
      if (!mobile) setSidebarOpen(false) // auto-close drawer when resizing to desktop
    }
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])
  
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>

      <SideBar
        isOpen={isMobile ? sidebarOpen : true}
        isMobile={isMobile}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Backdrop — mobile only, shown when drawer is open */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 40,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Main content column */}
      <div style={{
        marginLeft: isMobile ? 0 : 220,
        flex: 1,
        minWidth: 0,                  // prevent flex overflow
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* Top bar */}
        <div style={{
          height: 60,
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: isMobile ? '0 16px' : '0 28px',
          background: 'rgba(8,8,15,0.8)',
          backdropFilter: 'blur(12px)',
          position: 'sticky', top: 0, zIndex: 30,
        }}>

          {/* Hamburger — mobile only */}
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              style={{
                flexShrink: 0,
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-2)', padding: 4, borderRadius: 6,
                display: 'flex', alignItems: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <line x1="2" y1="4"  x2="16" y2="4"  />
                <line x1="2" y1="9"  x2="16" y2="9"  />
                <line x1="2" y1="14" x2="16" y2="14" />
              </svg>
            </button>
          )}

          <div>
            <div style={{
              fontSize: isMobile ? 14 : 15,
              fontWeight: 600,
              fontFamily: 'var(--font-display)',
              color: 'var(--color-text-1)',
            }}>
              {title}
            </div>
            {subtitle && (
              <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 1 }}>
                {subtitle}
              </div>
            )}
          </div>
        </div>

        {/* Page content */}
        <div style={{
          flex: 1,
          padding: isMobile ? 16 : 28,
          overflowY: 'auto',
        }}>
          {children}
        </div>

      </div>
    </div>
  )
}