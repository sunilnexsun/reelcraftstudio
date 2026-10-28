import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Briefcase, CalendarPlus, ChevronDown, KeyRound, LogOut, Menu as MenuIcon, MessageSquarePlus, Plus, ReceiptIndianRupee, Search, Settings, UserPlus, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { ROLE_LABEL } from '@/lib/labels'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Menu } from '@/components/ui/menu'
import { DateRangePicker } from './DateRangePicker'
import { Notifications } from './Notifications'
import { useQuickCreate } from './QuickCreate'
import { Logo } from './Logo'
import { NAV } from './nav'

export function usePageMeta() {
  const { pathname } = useLocation()
  const item = [...NAV].sort((a, b) => b.to.length - a.to.length).find((n) => n.to === '/' ? pathname === '/' : pathname.startsWith(n.to))
  return item ?? NAV[0]
}

export function Topbar({ onMenu, onSearch, title, subtitle, crumbs, showDateRange = true }: {
  onMenu: () => void; onSearch: () => void; title?: ReactNode; subtitle?: ReactNode; crumbs?: { label: string; to?: string }[]; showDateRange?: boolean
}) {
  const { role, profile, signOut, mode } = useAuth()
  const meta = usePageMeta()
  const quick = useQuickCreate()
  const nav = useNavigate()
  const isOverview = meta.to === '/'

  return (
    <header className="no-print relative">
      <div className="hero-glow pointer-events-none absolute inset-x-0 -top-10 h-56 opacity-90" aria-hidden />
      {/* mobile bar */}
      <div className="relative flex items-center gap-2 px-4 pt-4 lg:hidden">
        <Button variant="ghost" size="icon" onClick={onMenu} aria-label="Open navigation"><MenuIcon className="size-6!" /></Button>
        <Link to="/" aria-label="ReelCraft Studio home"><Logo compact /></Link>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onSearch} aria-label="Search"><Search className="size-5!" /></Button>
          <Notifications />
        </div>
      </div>

      <div className="relative flex flex-wrap items-start gap-4 px-4 pt-4 pb-2 sm:px-6 lg:px-8 lg:pt-8">
        <div className="min-w-0 flex-1 border-l-[3px] border-accent pl-4">
          {crumbs && crumbs.length > 0 ? (
            <nav aria-label="Breadcrumb" className="mb-1 text-xs text-muted">
              <ol className="flex flex-wrap items-center gap-1.5">
                <li><Link to="/" className="hover:text-fg">Home</Link></li>
                {crumbs.map((c, i) => (
                  <li key={i} className="flex items-center gap-1.5"><span aria-hidden>/</span>{c.to ? <Link to={c.to} className="hover:text-fg">{c.label}</Link> : <span aria-current="page" className="text-fg-soft">{c.label}</span>}</li>
                ))}
              </ol>
            </nav>
          ) : !isOverview && (
            <nav aria-label="Breadcrumb" className="mb-1 text-xs text-muted"><Link to="/" className="hover:text-fg">Home</Link> <span aria-hidden>/</span> <span aria-current="page" className="text-fg-soft">{meta.label}</span></nav>
          )}
          <h1 className="font-display text-[28px] leading-tight font-bold tracking-tight sm:text-4xl lg:text-[44px]">{title ?? (isOverview ? 'Dashboard' : meta.label)}</h1>
          <p className="mt-1 text-sm text-fg-soft sm:text-base">{subtitle ?? (isOverview ? `Welcome back${profile?.full_name ? ', ' + profile.full_name.split(' ')[0] : ''}! Here's what's happening at your studio.` : null)}</p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3 lg:pt-2">
          <button type="button" onClick={onSearch} className="hidden h-11 items-center gap-2 rounded-xl border border-line-strong bg-black/40 px-3 text-sm text-muted hover:border-white/30 hover:text-fg 2xl:flex" aria-label="Search (Ctrl+K)">
            <Search className="size-4" /> <span className="w-24 text-left">Search…</span> <kbd className="rounded border border-line-strong px-1.5 text-[10px]">Ctrl K</kbd>
          </button>
          <Button variant="secondary" size="icon" className="hidden h-11 w-11 rounded-xl lg:inline-flex 2xl:hidden" onClick={onSearch} aria-label="Search (Ctrl+K)"><Search className="size-5!" /></Button>
          {showDateRange && <DateRangePicker />}
          {can(role, 'projects', 'create') && (
            <Button variant="primary" size="lg" icon={<Plus className="size-5!" />} onClick={() => quick.setOpen('project')} className="rounded-xl">Create Project</Button>
          )}
          <Menu
            label="Quick actions"
            items={[
              { label: 'New enquiry', icon: <MessageSquarePlus />, onSelect: () => quick.setOpen('enquiry'), hidden: !can(role, 'enquiries', 'create') },
              { label: 'New booking', icon: <CalendarPlus />, onSelect: () => quick.setOpen('booking'), hidden: !can(role, 'bookings', 'create') },
              { label: 'New client', icon: <UserPlus />, onSelect: () => quick.setOpen('client'), hidden: !can(role, 'clients', 'create') },
              { label: 'New project', icon: <Briefcase />, onSelect: () => quick.setOpen('project'), hidden: !can(role, 'projects', 'create') },
              { label: 'New invoice', icon: <ReceiptIndianRupee />, onSelect: () => nav('/finance/invoices/new'), hidden: !can(role, 'finance', 'create') },
              { label: 'Record expense', icon: <Wallet />, onSelect: () => quick.setOpen('expense'), hidden: !can(role, 'finance', 'create') },
            ]}
            trigger={(p) => <Button {...p} variant="secondary" size="icon" className="h-11 w-11 rounded-xl" aria-label="Quick actions"><Plus className="size-5!" /></Button>}
          />
          <div className="hidden lg:block"><Notifications /></div>
          <Menu
            label="Account"
            header={
              <div className="border-b border-line px-3 py-2.5">
                <p className="truncate text-sm font-semibold">{profile?.full_name}</p>
                <p className="truncate text-xs text-muted">{profile?.email}</p>
                <p className="mt-1 text-[11px] font-medium text-accent">{role ? ROLE_LABEL[role] : ''}{mode === 'demo' ? ' · demo' : ''}</p>
              </div>
            }
            items={[
              { label: 'Settings', icon: <Settings />, onSelect: () => nav('/settings') },
              { label: 'Change password', icon: <KeyRound />, onSelect: () => nav('/settings?tab=security'), hidden: mode === 'demo' },
              'divider',
              { label: mode === 'demo' ? 'Switch demo role' : 'Sign out', icon: <LogOut />, onSelect: () => void signOut() },
            ]}
            trigger={(p) => (
              <button type="button" {...p} className="flex items-center gap-1.5 rounded-full p-0.5 pr-1.5 hover:bg-white/6" aria-label="Account menu">
                <Avatar name={profile?.full_name} src={profile?.avatar_url} size={42} />
                <ChevronDown className="hidden size-4 text-muted sm:block" />
              </button>
            )}
          />
        </div>
      </div>
    </header>
  )
}
