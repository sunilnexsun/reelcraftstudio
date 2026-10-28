import { Logo } from '../components/Logo'
import { SocialLinks } from '../components/SocialIcons'
import { brand, contact, navLinks } from '../data/site'
import { services } from '../data/services'
import { Link } from '../components/Link'
import { homeHref, navHref, pageHref, serviceHref } from '../lib/router'

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-white/8 bg-ink pt-14 text-white/70">
      <div className="container-x grid gap-10 pb-12 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.8fr_1fr_1fr]">
        <div>
          <Link href={homeHref()} aria-label="Reel Craft Studio — home">
            <Logo size={64} />
          </Link>
          <p className="mt-4 max-w-xs text-sm">{brand.tagline}</p>
          <SocialLinks className="mt-5" />
        </div>

        <nav aria-label="Footer">
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-white">Quick Links</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link href={navHref(l.href.slice(1))} className="hover:text-brand">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-white">Services</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {services.map((s) => (
              <li key={s.slug}>
                <Link href={serviceHref(s.slug)} className="hover:text-brand">
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-white">Contact</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {contact.phone && (
              <li>
                <a href={`tel:+${contact.phone.replace(/\D/g, '')}`} className="hover:text-brand">
                  {contact.phone}
                </a>
              </li>
            )}
            {contact.email && (
              <li>
                <a href={`mailto:${contact.email}`} className="break-all hover:text-brand">
                  {contact.email}
                </a>
              </li>
            )}
            {contact.location && <li>{contact.location}</li>}
            <li>
              <Link href={pageHref('contact')} className="font-semibold text-brand hover:text-white">
                Send an enquiry →
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/8">
        <div className="container-x flex flex-col items-center justify-between gap-3 py-6 text-xs sm:flex-row">
          <p>© {year} Reel Craft Studio. All rights reserved.</p>
          <p>
            Designed and developed by <span className="font-semibold text-white">Reel Craft Studio</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
