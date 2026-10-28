import { Suspense, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { Sidebar, NavList } from './Sidebar'
import { Topbar } from './Topbar'
import { GlobalSearch } from './GlobalSearch'
import { DemoBanner } from './DemoBanner'
import { QuickCreateProvider } from './QuickCreate'
import { PageMetaProvider, usePageMetaState } from './PageMeta'
import { Logo } from './Logo'
import { QuickCreateDialogs } from '@/features/QuickCreateDialogs'
import { LoadingBlock } from '@/components/ui/states'
import { useRefreshOnFocus, useTable } from '@/hooks/useData'
import { useAuth } from '@/lib/auth'

export function AppLayout() {
  return (
    <PageMetaProvider>
      <QuickCreateProvider>
        <Shell />
      </QuickCreateProvider>
    </PageMetaProvider>
  )
}

function Shell() {
  const [menu, setMenu] = useState(false)
  const [search, setSearch] = useState(false)
  const meta = usePageMetaState()
  const { pathname } = useLocation()
  useRefreshOnFocus()
  useIdleSignOut()

  useEffect(() => { setMenu(false) }, [pathname])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearch(true) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2">Skip to content</a>
      <Sidebar />
      <MobileDrawer open={menu} onClose={() => setMenu(false)} />
      <div className="lg:pl-[272px] print:pl-0">
        <DemoBanner />
        <Topbar onMenu={() => setMenu(true)} onSearch={() => setSearch(true)} title={meta.title} subtitle={meta.subtitle} crumbs={meta.crumbs} showDateRange={meta.showDateRange ?? true} />
        <main id="main" className="relative px-4 pt-4 pb-12 sm:px-6 lg:px-8 print:p-0">
          <Suspense fallback={<LoadingBlock rows={6} />}><Outlet /></Suspense>
        </main>
      </div>
      <GlobalSearch open={search} onClose={() => setSearch(false)} />
      <QuickCreateDialogs />
    </div>
  )
}

function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); if (!open && d.open) d.close() }, [open])
  return (
    <dialog ref={ref} onCancel={(e) => { e.preventDefault(); onClose() }} onClick={(e) => { if (e.target === ref.current) onClose() }}
      aria-label="Navigation" className="m-0 h-dvh max-h-none w-[290px] max-w-[85vw] border-r border-line bg-[#0b0b0b] p-0 text-fg backdrop:bg-black/70 lg:hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-6">
        <Logo />
        <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-white/8 hover:text-fg" aria-label="Close navigation"><X className="size-5" /></button>
      </div>
      <div className="px-3 pb-6"><NavList onNavigate={onClose} /></div>
    </dialog>
  )
}

/** Signs out after the studio's configured idle timeout (Settings → Security). Live mode only. */
function useIdleSignOut() {
  const { mode, signOut } = useAuth()
  const settings = useTable('studio_settings', mode === 'live')
  const minutes = settings.data[0]?.session_timeout_minutes
  useEffect(() => {
    if (mode !== 'live' || !minutes) return
    let timer: ReturnType<typeof setTimeout>
    const arm = () => { clearTimeout(timer); timer = setTimeout(() => void signOut(), minutes * 60_000) }
    const events = ['mousemove', 'keydown', 'pointerdown', 'scroll', 'visibilitychange']
    events.forEach((ev) => window.addEventListener(ev, arm, { passive: true }))
    arm()
    return () => { clearTimeout(timer); events.forEach((ev) => window.removeEventListener(ev, arm)) }
  }, [mode, minutes, signOut])
}
