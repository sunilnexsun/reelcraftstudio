import { useEffect, useState } from 'react'

/**
 * Tiny dependency-free router.
 *  - Normal hosting: real URLs — /services, /portfolio, /about, /process,
 *    /contact and /services/<slug>. Needs an SPA fallback on the host
 *    (public/_redirects for Netlify, vercel.json for Vercel).
 *  - Relative builds (base './', used for the hosted preview): hash tokens,
 *    e.g. #page-portfolio or #service-instagram-reels, because path routes
 *    aren't available there.
 */
const HASH_MODE = import.meta.env.BASE_URL === './'
const NAV_EVENT = 'rcs:navigate'

export const PAGES = ['services', 'portfolio', 'about', 'process', 'contact'] as const
export type PageName = (typeof PAGES)[number]
const isPage = (s: string): s is PageName => (PAGES as readonly string[]).includes(s)

export type Route =
  | { name: 'home'; anchor?: string }
  | { name: 'service'; slug: string }
  | { name: 'page'; page: PageName }

function parse(): Route {
  const hash = decodeURIComponent(window.location.hash.slice(1))
  if (HASH_MODE) {
    if (hash.startsWith('service-')) return { name: 'service', slug: hash.slice('service-'.length) }
    if (hash.startsWith('page-') && isPage(hash.slice(5))) return { name: 'page', page: hash.slice(5) as PageName }
    if (hash === 'about-us') return { name: 'page', page: 'about' } // older preview links
    return { name: 'home', anchor: hash || undefined }
  }
  const path = window.location.pathname.replace(/\/+$/, '')
  const svc = path.match(/\/services\/([\w-]+)$/)
  if (svc) return { name: 'service', slug: svc[1] }
  const pg = path.match(/\/([\w-]+)$/)
  if (pg && isPage(pg[1])) return { name: 'page', page: pg[1] }
  return { name: 'home', anchor: hash || undefined }
}

export const serviceHref = (slug: string) => (HASH_MODE ? `#service-${slug}` : `/services/${slug}`)
export const pageHref = (page: PageName) => (HASH_MODE ? `#page-${page}` : `/${page}`)
export const aboutHref = () => pageHref('about')

/** Link to the home page, optionally to a section on it (e.g. 'portfolio'). */
export const homeHref = (anchor?: string) =>
  HASH_MODE ? `#${anchor ?? 'home'}` : anchor ? `/#${anchor}` : '/'

/** Main-menu target: Home goes to the home page, every other item has its own page. */
export const navHref = (id: string) => (isPage(id) ? pageHref(id) : homeHref())

/** Which menu item a route belongs to. */
export const navIdFor = (route: Route): string =>
  route.name === 'home' ? 'home' : route.name === 'service' ? 'services' : route.page

export function navigate(href: string) {
  if (HASH_MODE) {
    const target = href.startsWith('#') ? href : `#${href.split('#')[1] ?? 'home'}`
    if (window.location.hash === target) window.dispatchEvent(new Event(NAV_EVENT))
    else window.location.hash = target // fires hashchange
    return
  }
  window.history.pushState({}, '', href)
  window.dispatchEvent(new Event(NAV_EVENT))
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parse)
  useEffect(() => {
    const update = () => setRoute(parse())
    window.addEventListener('popstate', update)
    window.addEventListener('hashchange', update)
    window.addEventListener(NAV_EVENT, update)
    return () => {
      window.removeEventListener('popstate', update)
      window.removeEventListener('hashchange', update)
      window.removeEventListener(NAV_EVENT, update)
    }
  }, [])
  return route
}

/** Scrolls to a section id once it exists (after a page switch). */
export function scrollToAnchor(id: string) {
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let tries = 0
  const go = () => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
    else if (tries++ < 20) requestAnimationFrame(go)
  }
  requestAnimationFrame(go)
}
