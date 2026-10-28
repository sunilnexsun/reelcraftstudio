import { NavLink } from 'react-router-dom'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { can } from '@/lib/permissions'
import { useAuth } from '@/lib/auth'
import { useTable } from '@/hooks/useData'
import { NAV } from './nav'
import { Logo } from './Logo'

export function useNavBadges() {
  const { role } = useAuth()
  const enquiries = useTable('enquiries', can(role, 'enquiries'))
  const bookings = useTable('bookings', can(role, 'bookings'))
  return useMemo(() => ({
    enquiries: enquiries.data.filter((e) => e.status === 'new').length,
    bookings: bookings.data.filter((b) => b.status === 'requested').length,
  }), [enquiries.data, bookings.data])
}

export function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { role } = useAuth()
  const badges = useNavBadges()
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV.filter((n) => can(role, n.module)).map((n) => {
        const count = n.badge ? badges[n.badge] : 0
        return (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) => cn(
              'group flex items-center gap-3.5 rounded-xl px-4 py-2.5 text-[15px] font-medium transition-colors',
              isActive ? 'bg-gradient-to-r from-accent to-[#d4113b] text-white shadow-[0_10px_30px_-12px_rgb(255_23_68/0.8)]' : 'text-fg-soft hover:bg-white/5 hover:text-white',
            )}
          >
            {({ isActive }) => (<>
              <n.icon className={cn('size-5 shrink-0', isActive ? 'text-white' : 'text-fg-soft group-hover:text-white')} strokeWidth={1.75} aria-hidden />
              <span className="min-w-0 flex-1 truncate">{n.label}</span>
              {count > 0 && (
                <span className={cn('min-w-5 rounded-full px-1.5 text-center text-[11px] font-bold tabular', isActive ? 'bg-white text-accent' : 'bg-accent text-white')}
                  aria-label={`${count} ${n.badge === 'enquiries' ? 'new enquiries' : 'booking requests'}`}>{count}</span>
              )}
            </>)}
          </NavLink>
        )
      })}
    </nav>
  )
}

export function Sidebar() {
  return (
    <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-[272px] flex-col overflow-hidden border-r border-line bg-[#0b0b0b] lg:flex">
      <div className="px-7 pt-7 pb-8"><Logo /></div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4"><NavList /></div>
      <SidebarArt />
    </aside>
  )
}

/** Cinematic accent at the foot of the sidebar: a clapperboard silhouette in a red bloom. */
function SidebarArt() {
  return (
    <div className="pointer-events-none relative h-40 shrink-0" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(70%_80%_at_30%_100%,rgb(255_23_68/0.35),transparent_70%)]" />
      <svg viewBox="0 0 240 150" className="absolute bottom-0 left-2 w-[230px] opacity-90">
        <g transform="rotate(-14 120 80)">
          <rect x="60" y="62" width="130" height="70" rx="6" fill="#141414" stroke="#2a2a2a" />
          <g transform="rotate(-12 60 58)">
            <rect x="60" y="40" width="130" height="20" rx="3" fill="#1b1b1b" stroke="#2f2f2f" />
            {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M${70 + i * 26} 40 l12 0 l-10 20 l-12 0z`} fill="#FF1744" opacity=".85" />)}
          </g>
          {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M${66 + i * 26} 64 l12 0 l-8 14 l-12 0z`} fill="#e9e9e9" opacity=".18" />)}
          <path d="M72 100h70M72 112h50" stroke="#2f2f2f" strokeWidth="4" strokeLinecap="round" />
        </g>
        <circle cx="52" cy="118" r="34" fill="#101010" stroke="#262626" strokeWidth="3" />
        <circle cx="52" cy="118" r="22" fill="#0a0a0a" stroke="#FF1744" strokeOpacity=".5" strokeWidth="2" />
        <circle cx="52" cy="118" r="10" fill="#1a1a1a" />
        <circle cx="46" cy="112" r="3" fill="#FF1744" opacity=".6" />
      </svg>
    </div>
  )
}
