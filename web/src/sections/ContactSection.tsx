import { CalendarDays, MessageCircle } from 'lucide-react'
import { ContactForm } from '../components/ContactForm'
import { ContactInfoCard, hasContactInfo } from '../components/ContactInfoCard'
import { ButtonLink } from '../components/Button'
import { FilmReel } from '../components/FilmReel'
import { Reveal } from '../components/Reveal'
import { defaultWhatsAppMessage, whatsappLink } from '../lib/links'
import { showPlaceholders } from '../lib/env'

export function ContactSection() {
  const wa = whatsappLink(defaultWhatsAppMessage)

  const focusForm = () => {
    // Let the anchor scroll first, then move focus into the form.
    window.setTimeout(() => document.getElementById('f-fullName')?.focus({ preventScroll: true }), 350)
  }

  return (
    <section id="contact" aria-labelledby="contact-title" className="section-y relative isolate overflow-hidden bg-ink">
      {/* cinematic backdrop: red practicals + grain over black (swap for a photo by adding an <img> here) */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute -left-24 top-0 h-[420px] w-[420px] rounded-full bg-brand/20 blur-[130px]" />
        <div className="absolute bottom-0 right-0 h-[380px] w-[520px] rounded-full bg-brand-deep/25 blur-[140px]" />
        <div className="grain absolute inset-0 opacity-60" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgb(10_10_10/0.6))]" />
      </div>
      <FilmReel className="pointer-events-none absolute -bottom-28 -left-28 -z-10 hidden w-[300px] opacity-50 lg:block" />

      <div className={`container-x grid gap-10 lg:grid-cols-2 xl:gap-8 ${hasContactInfo ? 'xl:grid-cols-[1fr_1.25fr_0.8fr]' : 'xl:grid-cols-[1fr_1.2fr]'}`}>
        <Reveal className="flex flex-col">
          <p className="eyebrow mb-3">Let’s Work Together</p>
          <h2 id="contact-title" className="heading-lg text-white">
            <span className="block">Ready to Create</span>
            <span className="block text-brand">Something Amazing?</span>
          </h2>
          <p className="mt-5 max-w-md text-[0.98rem] leading-relaxed text-white/75">
            Let’s turn your next idea into a video worth watching. Tell us about your business, your project, and the
            story you want to share.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {wa ? (
              <ButtonLink href={wa} target="_blank" rel="noopener noreferrer" variant="whatsapp" size="lg" icon={<MessageCircle className="h-5 w-5" aria-hidden />}>
                Chat on WhatsApp
              </ButtonLink>
            ) : (
              showPlaceholders && (
                <span className="inline-flex min-h-13 items-center gap-2.5 rounded-[10px] border border-dashed border-[#1FAF54]/60 px-5 text-[0.8rem] text-white/60">
                  <MessageCircle className="h-5 w-5 text-[#1FAF54]" aria-hidden />
                  WhatsApp button appears once a number is set in src/data/site.ts
                </span>
              )
            )}
            <ButtonLink href="#enquiry-form" onClick={focusForm} size="lg" icon={<CalendarDays className="h-5 w-5" aria-hidden />}>
              Book a Shoot
            </ButtonLink>
          </div>

          {hasContactInfo && (
            <div className="mt-10 xl:hidden">
              <ContactInfoCard />
            </div>
          )}
        </Reveal>

        <Reveal delay={0.08}>
          <ContactForm />
        </Reveal>

        {hasContactInfo && (
          <Reveal delay={0.14} className="hidden xl:block">
            <ContactInfoCard />
          </Reveal>
        )}
      </div>
    </section>
  )
}
