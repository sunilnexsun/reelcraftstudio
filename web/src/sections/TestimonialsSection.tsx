import { MessageSquareQuote, Quote, Star } from 'lucide-react'
import { testimonials, type Testimonial } from '../data/testimonials'
import { SectionHeading } from '../components/SectionHeading'
import { ButtonLink } from '../components/Button'
import { Reveal } from '../components/Reveal'
import { whatsappLink } from '../lib/links'
import { showPlaceholders } from '../lib/env'

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <figure className="flex h-full flex-col rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-black/5 sm:p-7">
      <Quote className="h-7 w-7 fill-brand/15 text-brand" aria-hidden />
      <blockquote className="mt-4 flex-1 text-[0.95rem] leading-relaxed text-slate">“{t.quote}”</blockquote>
      <figcaption className="mt-6 flex items-center gap-3 border-t border-black/[0.06] pt-5">
        {t.image ? (
          <img src={t.image} alt="" loading="lazy" className="h-11 w-11 rounded-full object-cover" width={44} height={44} />
        ) : (
          <span aria-hidden className="grid h-11 w-11 place-items-center rounded-full bg-brand font-display text-sm font-bold text-white">
            {t.name.trim().charAt(0).toUpperCase()}
          </span>
        )}
        <span className="min-w-0">
          <span className="block font-display text-sm font-bold text-ink">{t.name}</span>
          {t.role && <span className="block text-xs text-slate">{t.role}</span>}
        </span>
      </figcaption>
      {t.rating && (
        <p className="mt-3 flex gap-0.5" aria-label={`Rated ${t.rating} out of 5`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={`h-4 w-4 ${i < t.rating! ? 'fill-amber-400 text-amber-400' : 'text-black/15'}`} aria-hidden />
          ))}
        </p>
      )}
    </figure>
  )
}

/** Shown for a slot that doesn't have a real review yet. */
function PendingCard({ index }: { index: number }) {
  return (
    <div className="flex h-full flex-col rounded-[var(--radius-card)] border-2 border-dashed border-black/10 bg-white/60 p-6 sm:p-7">
      <Quote className="h-7 w-7 text-black/15" aria-hidden />
      <div aria-hidden className="mt-4 flex-1 space-y-2.5">
        <span className="block h-2.5 w-full rounded bg-black/[0.06]" />
        <span className="block h-2.5 w-11/12 rounded bg-black/[0.06]" />
        <span className="block h-2.5 w-3/4 rounded bg-black/[0.06]" />
      </div>
      <div className="mt-6 flex items-center gap-3 border-t border-black/[0.06] pt-5">
        <span aria-hidden className="grid h-11 w-11 place-items-center rounded-full bg-black/[0.06] text-black/25">
          <MessageSquareQuote className="h-5 w-5" />
        </span>
        <span>
          <span className="block font-display text-sm font-bold text-ink/60">Client review coming soon</span>
          {showPlaceholders && (
            <span className="block text-xs italic text-slate/70">Add review {index + 1} in src/data/testimonials.ts</span>
          )}
        </span>
      </div>
    </div>
  )
}

export function TestimonialsSection() {
  const feedbackHref =
    whatsappLink("Hi Reel Craft Studio! I'd like to share some feedback about working with you.") ?? '#contact'

  return (
    <section aria-labelledby="testimonials-title" className="section-y bg-mist text-ink">
      <div className="container-x">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading id="testimonials-title" eyebrow="Client Feedback" line1="What Our" line2="Clients Say." />
          <Reveal delay={0.08} className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <p className="max-w-sm text-[0.95rem] leading-relaxed text-slate">
              Worked with Reel Craft Studio? We'd love to hear how it went.
            </p>
            <ButtonLink
              href={feedbackHref}
              {...(feedbackHref.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              variant="outlineDark"
              className="shrink-0 self-start sm:self-auto"
            >
              Share Feedback
            </ButtonLink>
          </Reveal>
        </div>

        <ul className="mt-12 grid gap-5 md:grid-cols-3" aria-label="Client testimonials">
          {testimonials.map((t, i) => (
            <Reveal as="li" key={i} delay={i * 0.07}>
              {t.quote.trim() && t.name.trim() ? <TestimonialCard t={t} /> : <PendingCard index={i} />}
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
