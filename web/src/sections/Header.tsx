import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, Menu, X } from 'lucide-react'
import { Logo } from '../components/Logo'
import { Link } from '../components/Link'
import { buttonClass } from '../components/Button'
import { navLinks } from '../data/site'
import { useScrolledPast } from '../hooks/useScrollState'
import { homeHref, navHref, pageHref } from '../lib/router'

/** `activeId` is the menu item for the current page ('home', 'services', 'portfolio', …). */
export function Header({ activeId }: { activeId: string }) {
  const scrolled = useScrolledPast(24)
  const [open, setOpen] = useState(false)

  // Close the mobile menu on Escape or when resizing to desktop.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const mq = window.matchMedia('(min-width: 1280px)')
    const onMq = () => mq.matches && setOpen(false)
    document.addEventListener('keydown', onKey)
    mq.addEventListener('change', onMq)
    return () => {
      document.removeEventListener('keydown', onKey)
      mq.removeEventListener('change', onMq)
    }
  }, [open])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,padding] duration-300 ${
        scrolled || open
          ? 'bg-ink/92 py-2.5 shadow-[0_1px_0_rgb(255_255_255/0.06)] backdrop-blur-md'
          : 'bg-gradient-to-b from-black/70 to-transparent py-3.5 xl:py-5'
      }`}
    >
      <a
        href="#main"
        onClick={(e) => {
          e.preventDefault()
          const main = document.getElementById('main')
          main?.setAttribute('tabindex', '-1')
          main?.focus()
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold"
      >
        Skip to content
      </a>
      <div className="container-x flex items-center justify-between gap-6">
        <Link href={homeHref()} aria-label="Reel Craft Studio — home" onClick={() => setOpen(false)}>
          <Logo size={scrolled ? 50 : 60} className="transition-all duration-300" />
        </Link>

        <nav aria-label="Primary" className="hidden xl:block">
          <ul className="flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => {
              const id = link.href.slice(1)
              const isActive = activeId === id
              return (
                <li key={link.href}>
                  <Link
                    href={navHref(id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`relative block px-3.5 py-2.5 font-display text-[0.98rem] font-semibold tracking-[0.01em] transition-colors xl:px-4 ${
                      isActive ? 'text-brand' : 'text-white/85 hover:text-white'
                    }`}
                  >
                    {link.label}
                    <span
                      aria-hidden
                      className={`absolute inset-x-3.5 -bottom-0.5 h-[3px] rounded bg-brand transition-transform duration-300 xl:inset-x-4 ${
                        isActive ? 'scale-x-100' : 'scale-x-0'
                      }`}
                    />
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden sm:block">
            <Link href={pageHref('contact')} className={buttonClass('primary', 'lg')}>
              <CalendarDays className="h-[18px] w-[18px]" aria-hidden />
              <span>Book a Shoot</span>
            </Link>
          </span>
          <button
            type="button"
            className="grid h-12 w-12 place-items-center rounded-[10px] text-white hover:bg-white/10 xl:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-menu"
            aria-label="Mobile"
            className="overflow-hidden xl:hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <ul className="container-x flex flex-col gap-1 pb-6 pt-3">
              {navLinks.map((link) => {
                const id = link.href.slice(1)
                return (
                  <li key={link.href}>
                    <Link
                      href={navHref(id)}
                      onClick={() => setOpen(false)}
                      aria-current={activeId === id ? 'page' : undefined}
                      className={`block rounded-lg px-3 py-3.5 font-display text-lg font-semibold ${
                        activeId === id ? 'bg-white/5 text-brand' : 'text-white hover:bg-white/5'
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                )
              })}
              <li className="mt-2">
                <Link href={pageHref('contact')} onClick={() => setOpen(false)} className={buttonClass('primary', 'lg', 'w-full')}>
                  <CalendarDays className="h-4 w-4" aria-hidden />
                  <span>Book a Shoot</span>
                </Link>
              </li>
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
