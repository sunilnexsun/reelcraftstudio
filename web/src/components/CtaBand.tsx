import { CalendarDays, MessageCircle } from 'lucide-react'
import { Link } from './Link'
import { ButtonLink } from './Button'
import { Reveal } from './Reveal'
import { pageHref } from '../lib/router'
import { defaultWhatsAppMessage, whatsappLink } from '../lib/links'

interface CtaBandProps {
  title?: string
  text?: string
  tone?: 'light' | 'dark'
}

/** Red call-to-action band that closes each inner page. */
export function CtaBand({
  title = 'Ready to create something amazing?',
  text = 'Tell us about your business and we’ll plan the right video for it.',
  tone = 'light',
}: CtaBandProps) {
  const wa = whatsappLink(defaultWhatsAppMessage)
  return (
    <section aria-label="Book a shoot" className={`py-[clamp(56px,7vw,88px)] ${tone === 'light' ? 'bg-mist' : 'bg-ink'}`}>
      <div className="container-x">
        <Reveal className="relative flex flex-col items-start gap-6 overflow-hidden rounded-[20px] bg-brand-gradient p-8 text-white sm:p-10 lg:flex-row lg:items-center lg:justify-between">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <h2 className="font-display text-[clamp(1.5rem,3vw,2.2rem)] font-extrabold uppercase leading-tight">{title}</h2>
            <p className="mt-2 max-w-xl text-white/85">{text}</p>
          </div>
          <div className="relative flex shrink-0 flex-wrap gap-3">
            <Link
              href={pageHref('contact')}
              className="inline-flex min-h-13 items-center gap-2.5 whitespace-nowrap rounded-[10px] bg-white px-7 font-display text-[0.9rem] font-bold text-brand-deep transition-colors hover:bg-ink hover:text-white"
            >
              <CalendarDays className="h-[18px] w-[18px]" aria-hidden /> Book a Shoot
            </Link>
            {wa && (
              <ButtonLink href={wa} target="_blank" rel="noopener noreferrer" variant="outline" size="lg" icon={<MessageCircle className="h-5 w-5" aria-hidden />}>
                WhatsApp
              </ButtonLink>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
