import { Clock, ExternalLink, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { contact } from '../data/site'
import { serviceFaqs } from '../data/services'
import { PageHero } from '../components/PageHero'
import { ContactForm } from '../components/ContactForm'
import { FaqList } from '../components/FaqList'
import { ButtonLink } from '../components/Button'
import { Reveal } from '../components/Reveal'
import { SocialLinks } from '../components/SocialIcons'
import { FilmReel } from '../components/FilmReel'
import { defaultWhatsAppMessage, whatsappLink } from '../lib/links'

const nextSteps = [
  { title: 'We read your request', text: 'Your booking details come straight to our inbox.' },
  { title: 'We get in touch', text: 'We call or WhatsApp you to understand your project and answer questions.' },
  { title: 'You get a plan', text: 'We share a plan and quote. Once you’re happy, we fix the shoot date.' },
]

export function ContactPage() {
  const wa = whatsappLink(defaultWhatsAppMessage)
  const tel = `tel:+${contact.phone.replace(/\D/g, '')}`
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.location)}`

  return (
    <>
      <PageHero
        crumb="Contact"
        eyebrow="Let’s Work Together"
        line1="Book Your"
        line2="Shoot Today."
        intro={
          <p>
            Let’s turn your next idea into a video worth watching. Fill in the form, call us, or message us on WhatsApp.
            Whichever is easiest for you.
          </p>
        }
        actions={
          wa ? (
            <ButtonLink href={wa} target="_blank" rel="noopener noreferrer" variant="whatsapp" size="lg" icon={<MessageCircle className="h-5 w-5" aria-hidden />}>
              Chat on WhatsApp
            </ButtonLink>
          ) : undefined
        }
      />

      <section aria-label="Booking form and contact details" className="relative isolate overflow-hidden bg-ink pb-[clamp(64px,9vw,112px)]">
        <FilmReel className="pointer-events-none absolute -bottom-28 -left-28 -z-10 hidden w-[300px] opacity-40 lg:block" />
        <div className="container-x grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <Reveal>
            <ContactForm />
          </Reveal>

          <div className="flex flex-col gap-5">
            <Reveal delay={0.06} className="rounded-[16px] border border-white/10 bg-charcoal/85 p-6">
              <h2 className="font-display text-lg font-bold text-white">Get in Touch</h2>
              <ul className="mt-5 space-y-4 text-[0.92rem]">
                <li className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
                  <span>
                    <span className="block text-xs uppercase tracking-wider text-white/45">Phone / WhatsApp</span>
                    <a href={tel} className="text-white hover:text-brand">{contact.phone}</a>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-xs uppercase tracking-wider text-white/45">Email</span>
                    <a href={`mailto:${contact.email}`} className="break-all text-white hover:text-brand">{contact.email}</a>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
                  <span>
                    <span className="block text-xs uppercase tracking-wider text-white/45">Location</span>
                    <span className="text-white">{contact.location}</span>
                    <a href={maps} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1 text-xs font-semibold text-brand hover:text-white">
                      Open in Google Maps <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  </span>
                </li>
                {contact.hours && (
                  <li className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
                    <span className="text-white">{contact.hours}</span>
                  </li>
                )}
              </ul>
              <p className="mt-6 text-xs uppercase tracking-wider text-white/45">Follow us</p>
              <SocialLinks className="mt-3" />
            </Reveal>

            <Reveal delay={0.12} className="rounded-[16px] border border-white/10 bg-charcoal/85 p-6">
              <h2 className="font-display text-lg font-bold text-white">What happens next?</h2>
              <ol className="mt-5 space-y-5">
                {nextSteps.map((s, i) => (
                  <li key={s.title} className="flex gap-4">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-brand font-display text-sm font-extrabold text-brand">
                      {i + 1}
                    </span>
                    <span>
                      <span className="block font-display text-[0.95rem] font-bold text-white">{s.title}</span>
                      <span className="mt-0.5 block text-[0.86rem] leading-relaxed text-white/65">{s.text}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>
        </div>
      </section>

      <section aria-labelledby="contact-faq-title" className="section-y bg-white text-ink">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          <Reveal>
            <p className="eyebrow mb-3">Questions</p>
            <h2 id="contact-faq-title" className="heading-lg">
              <span className="block">Before You</span>
              <span className="block text-brand">Book.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.06}>
            <FaqList items={serviceFaqs} />
          </Reveal>
        </div>
      </section>
    </>
  )
}
