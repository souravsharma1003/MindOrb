import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import {
  LayoutDashboard, History, GitCompare,
  Lightbulb, Settings, LogOut, Zap, Users,
  Sun, Moon,
} from 'lucide-react'

// ─── Nav data ────────────────────────────────────────────────────────────────

const NAV_MAIN = [
  { id: 'overview',  label: 'Overview',     icon: LayoutDashboard, path: '/dashboard' },
  { id: 'sessions',  label: 'Sessions',     icon: History,         path: '/dashboard/sessions' },
  { id: 'compare',   label: 'Compare',      icon: GitCompare,      path: '/dashboard/compare' },
  { id: 'insights',  label: 'Insights',     icon: Lightbulb,       path: '/dashboard/insights' },
  { id: 'duo',       label: 'Duo session',  icon: Users,           path: '/duo' },
]

const NAV_ACCOUNT = [
  { id: 'settings',  label: 'Settings',     icon: Settings,        path: '/dashboard/settings' },
]

// ─── Shared nav button ────────────────────────────────────────────────────────

function NavItem({ item, active, onClick }) {
  const Icon = item.icon
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 12px', borderRadius: 10,
        fontSize: 13.5, fontWeight: 500,
        color: active ? 'var(--color-accent-2)' : 'var(--color-text-2)',
        background: active ? 'rgba(124,106,247,0.12)' : 'transparent',
        border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
        transition: 'all 0.15s ease', position: 'relative',
        fontFamily: 'var(--font-body)',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--color-hover)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      {/* Active indicator bar — left edge */}
      {active && (
        <div style={{
          position: 'absolute', left: 0, top: '20%', bottom: '20%',
          width: 3, background: 'var(--color-accent)',
          borderRadius: '0 3px 3px 0',
        }} />
      )}

      {/* Icon chip */}
      <div style={{
        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'rgba(124,106,247,0.2)' : 'var(--color-icon-bg)',
        color: active ? 'var(--color-accent-2)' : 'var(--color-text-2)',
        transition: 'background 0.15s, color 0.15s',
      }}>
        <Icon size={14} />
      </div>

      {item.label}
    </button>
  )
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div style={{ padding: '0 4px', marginBottom: 6 }}>
      <span style={{
        fontSize: 10, fontWeight: 600,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--color-text-3)', fontFamily: 'var(--font-display)',
      }}>
        {children}
      </span>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export default function SideBar({ isOpen = true, isMobile = false, onClose = () => {} }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  const handleLogout = () => {
    logout()
    navigate('/auth')
  }

  // On mobile, close the drawer after navigating
  const handleNavigate = (path) => {
    navigate(path)
    if (isMobile) onClose()
  }

  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      background: 'var(--color-surface)',
      borderRight: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0, left: 0,
      zIndex: 50,
      // Mobile: slide in/out as a drawer; desktop: always visible
      transform: isMobile
        ? (isOpen ? 'translateX(0)' : 'translateX(-100%)')
        : 'translateX(0)',
      transition: 'transform 0.25s ease',
    }}>

      {/* ── Logo ── */}
      <div style={{
        padding: '22px 18px 18px',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: 'radial-gradient(circle at 35% 35%, #c4b5fd, #7c6af7 50%, #4f3fb5)',
            boxShadow: '0 0 16px rgba(124,106,247,0.35)',
          }} />
          <div>
            <div style={{
              fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em',
              fontFamily: 'var(--font-display)', color: 'var(--color-text-1)',
            }}>
              MindOrb
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 1 }}>
              Insight Engine
            </div>
          </div>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            style={{
              width: 30, height: 30, borderRadius: 8, cursor: 'pointer',
              background: 'var(--color-icon-bg)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: theme === 'dark' ? 'var(--color-text-2)' : 'var(--color-amber)',
              transition: 'all 0.2s ease', flexShrink: 0,
              marginLeft:30
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-hover-2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--color-icon-bg)'}
          >
            {theme === 'dark' ? <Moon size={13} /> : <Sun size={13} />}
          </button>
        </div>
      </div>

      {/* ── Nav ── */}
      <div style={{
        padding: '12px 10px', flex: 1,
        display: 'flex', flexDirection: 'column', gap: 2,
      }}>
        <SectionLabel>Main</SectionLabel>

        {NAV_MAIN.map(item => (
          <NavItem
            key={item.id}
            item={item}
            active={location.pathname === item.path}
            onClick={() => handleNavigate(item.path)}
          />
        ))}

        <div style={{ margin: '12px 0 6px' }}>
          <SectionLabel>Account</SectionLabel>
        </div>

        {NAV_ACCOUNT.map(item => (
          <NavItem
            key={item.id}
            item={item}
            active={location.pathname === item.path}
            onClick={() => handleNavigate(item.path)}
          />
        ))}
      </div>

      {/* ── Start session CTA ── */}
      <div style={{ padding: '0 10px 10px' }}>
        <button
          onClick={() => { navigate('/session'); if (isMobile) onClose() }}
          style={{
            width: '100%', padding: '9px 12px',
            borderRadius: 10, cursor: 'pointer',
            background: 'rgba(124,106,247,0.15)',
            border: '1px solid rgba(124,106,247,0.25)',   // removed duplicate border: 'none'
            color: 'var(--color-accent-2)',
            fontSize: 13, fontWeight: 600,
            fontFamily: 'var(--font-display)',
            display: 'flex', alignItems: 'center', gap: 8,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,106,247,0.25)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(124,106,247,0.15)'}
        >
          <Zap size={14} /> Start session
        </button>
      </div>

      {/* ── User row ── */}
      <div style={{ padding: '10px', borderTop: '1px solid var(--color-border)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px', borderRadius: 10,
          transition: 'background 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {/* Avatar */}
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #a78bfa, #34d399)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#fff',
            fontFamily: 'var(--font-display)',
          }}>
            {initials}
          </div>

          {/* Name + streak */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 500, color: 'var(--color-text-1)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {user?.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 1 }}>
              {user?.streak ?? 0} day streak 🔥
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="Log out"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-3)', padding: 4, borderRadius: 6,
              display: 'flex', alignItems: 'center',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--color-red)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-3)'}
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>

    </aside>
  )
}