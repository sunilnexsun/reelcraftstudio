import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, ChevronDown, MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Service } from '../data/services'
import { serviceFaqs, services } from '../data/services'
import { projects, type Project } from '../data/portfolio'
import { Link } from '../components/Link'
import { buttonClass, ButtonLink } from '../components/Button'
import { Reveal } from '../components/Reveal'
import { PortfolioCard } from '../components/PortfolioCard'
import { homeHref, pageHref, serviceHref } from '../lib/router'
import { selectService, whatsappLink } from '../lib/links'

interface ServicePageProps {
  service: Service
  onOpenProject: (p: Project) => void
}

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const, delay },
})

export function ServicePage({ service, onOpenProject }: ServicePageProps) {
  const Icon = service.icon
  const [cover, ...gallery] = service.images
  const related = (
    service.relatedCategories.length
      ? projects.filter((p) => service.relatedCategories.includes(p.category))
      : projects
  ).slice(0, 4)
  const others = services.filter((s) => s.slug !== service.slug)
  const wa = whatsappLink(`Hi Reel Craft Studio! I'm interested in ${service.title}.`)

  // Split the title so the last word gets the brand colour, like the home headings.
  const words = service.title.split(' ')
  const last = words.pop()

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section aria-labelledby="service-title" className="relative isolate overflow-hidden bg-ink pb-16 pt-28 lg:pb-24 lg:pt-36">
        <div aria-hidden className="pointer-events-none absolute -left-40 top-20 -z-10 h-[420px] w-[520px] rounded-full bg-brand/15 blur-[120px]" />
        <div aria-hidden className="pointer-events-none absolute -right-40 bottom-0 -z-10 h-[360px] w-[460px] rounded-full bg-brand-deep/20 blur-[130px]" />

        <div className="container-x grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div>
            <motion.nav {...fade(0)} aria-label="Breadcrumb" className="mb-7">
              <ol className="flex flex-wrap items-center gap-2 text-[0.78rem] text-white/50">
                <li>
                  <Link href={homeHref()} className="hover:text-white">Home</Link>
                </li>
                <li aria-hidden>/</li>
                <li>
                  <Link href={pageHref('services')} className="hover:text-white">Services</Link>
                </li>
                <li aria-hidden>/</li>
                <li aria-current="page" className="text-white/85">{service.title}</li>
              </ol>
            </motion.nav>

            <motion.p {...fade(0.05)} className="eyebrow mb-4 flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand/15">
                <Icon className="h-4 w-4 text-brand" aria-hidden />
              </span>
              Our Services
            </motion.p>
            <motion.h1 {...fade(0.1)} id="service-title" className="heading-xl !text-[clamp(2.3rem,5.4vw,4rem)] text-white">
              {words.join(' ')} <span className="text-brand">{last}</span>
            </motion.h1>
            <motion.p {...fade(0.16)} className="mt-5 font-display text-[clamp(1.05rem,1.8vw,1.3rem)] font-semibold text-white">
              {service.tagline}
            </motion.p>
            {service.intro.map((para, i) => (
              <motion.p key={i} {...fade(0.2 + i * 0.04)} className="mt-4 max-w-[36rem] text-[1rem] leading-relaxed text-white/72">
                {para}
              </motion.p>
            ))}
            <motion.div {...fade(0.3)} className="mt-8 flex flex-wrap gap-3">
              <Link
                href={pageHref('contact')}
                onClick={() => selectService(service.title)}
                className={buttonClass('primary', 'lg')}
              >
                <CalendarDays className="h-[18px] w-[18px]" aria-hidden />
                <span>Book This Service</span>
              </Link>
              {wa && (
                <ButtonLink href={wa} target="_blank" rel="noopener noreferrer" variant="whatsapp" size="lg" icon={<MessageCircle className="h-5 w-5" aria-hidden />}>
                  Ask on WhatsApp
                </ButtonLink>
              )}
            </motion.div>
          </div>

          {/* Collage: cover + two gallery stills, all from real client reels */}
          <motion.div {...fade(0.15)} className="grid grid-cols-[1.35fr_1fr] gap-3 sm:gap-4">
            <figure className="row-span-2 overflow-hidden rounded-[18px] ring-1 ring-white/10">
              <img src={cover.src} alt={cover.alt} width={720} height={1280} className="h-full max-h-[620px] w-full object-cover" />
            </figure>
            {gallery.slice(0, 2).map((img) => (
              <figure key={img.src} className="overflow-hidden rounded-[14px] ring-1 ring-white/10">
                <img src={img.src} alt={img.alt} loading="lazy" width={720} height={1280} className="aspect-[4/5] h-full w-full object-cover" />
              </figure>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── What's included + ideal for ──────────────────────────────────── */}
      <section aria-labelledby="included-title" className="section-y bg-mist text-ink">
        <div className="container-x grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
          <Reveal>
            <p className="eyebrow mb-3">What You Get</p>
            <h2 id="included-title" className="heading-lg">
              <span className="block">What's</span>
              <span className="block text-brand">Included.</span>
            </h2>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {service.includes.map((item) => (
                <li key={item} className="flex items-start gap-3 rounded-[12px] bg-white p-4 text-[0.92rem] leading-snug text-ink ring-1 ring-black/5">
                  <CheckCircle2 className="mt-px h-5 w-5 shrink-0 text-brand" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.08} className="lg:pt-16">
            <div className="rounded-[18px] bg-ink p-7 text-white sm:p-8">
              <h3 className="font-display text-lg font-bold">Ideal for</h3>
              <ul className="mt-5 flex flex-wrap gap-2">
                {service.idealFor.map((t) => (
                  <li key={t} className="rounded-lg border border-white/15 px-3 py-2 text-[0.82rem] text-white/85">
                    {t}
                  </li>
                ))}
              </ul>
              <p className="mt-7 text-[0.9rem] leading-relaxed text-white/65">
                Not sure this is the right fit? Tell us what you want to achieve and we'll suggest the best approach.
              </p>
              <Link
                href={pageHref('contact')}
                onClick={() => selectService(service.title)}
                className="mt-4 inline-flex items-center gap-1.5 font-display text-[0.85rem] font-bold text-brand hover:text-white"
              >
                Send an enquiry <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section aria-labelledby="how-title" className="section-y relative overflow-hidden bg-ink">
        <div className="container-x">
          <Reveal>
            <p className="eyebrow mb-3">How It Works</p>
            <h2 id="how-title" className="heading-lg text-white">
              <span className="block">From Brief</span>
              <span className="block text-brand">To Final Cut.</span>
            </h2>
          </Reveal>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {service.steps.map((step, i) => (
              <Reveal as="li" key={step.title} delay={i * 0.07} className="rounded-[14px] border border-white/10 bg-charcoal/60 p-6">
                <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-brand font-display text-sm font-extrabold text-brand">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-4 font-display text-base font-bold text-white">{step.title}</h3>
                <p className="mt-2 text-[0.88rem] leading-relaxed text-white/65">{step.text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Related work ─────────────────────────────────────────────────── */}
      {related.length > 0 && (
        <section aria-labelledby="work-title" className="section-y border-t border-white/8 bg-ink">
          <div className="container-x">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <Reveal>
                <p className="eyebrow mb-3">Our Work</p>
                <h2 id="work-title" className="heading-lg text-white">
                  <span className="block">See It</span>
                  <span className="block text-brand">In Action.</span>
                </h2>
              </Reveal>
              <Link href={pageHref('portfolio')} className={buttonClass('outlineDark', 'md', 'self-start sm:self-auto')}>
                <span>View Full Portfolio</span>
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <ul className={`mt-10 grid grid-cols-1 gap-x-5 gap-y-8 min-[480px]:grid-cols-2 ${related.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3 lg:max-w-[900px]'}`}>
              {related.map((p, i) => (
                <Reveal as="li" key={p.id} delay={i * 0.06}>
                  <PortfolioCard project={p} onOpen={onOpenProject} />
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section aria-labelledby="faq-title" className="section-y bg-white text-ink">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          <Reveal>
            <p className="eyebrow mb-3">Questions</p>
            <h2 id="faq-title" className="heading-lg">
              <span className="block">Good To</span>
              <span className="block text-brand">Know.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.06}>
            <div className="divide-y divide-black/10 border-y border-black/10">
              {serviceFaqs.map((f) => (
                <details key={f.q} className="group py-1">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-[0.98rem] font-bold text-ink [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronDown className="h-5 w-5 shrink-0 text-brand transition-transform duration-300 group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="pb-5 pr-8 text-[0.93rem] leading-relaxed text-slate">{f.a}</p>
                </details>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA + other services ─────────────────────────────────────────── */}
      <section aria-labelledby="more-title" className="section-y bg-mist text-ink">
        <div className="container-x">
          <Reveal className="flex flex-col items-start gap-6 rounded-[20px] bg-brand-gradient p-8 text-white sm:p-10 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-display text-[clamp(1.5rem,3vw,2.1rem)] font-extrabold uppercase leading-tight">
                Ready to start your {service.title.toLowerCase()} project?
              </h2>
              <p className="mt-2 text-white/85">Tell us about your business and we'll plan the right video for it.</p>
            </div>
            <Link
              href={pageHref('contact')}
              onClick={() => selectService(service.title)}
              className="inline-flex min-h-13 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-[10px] bg-white px-7 font-display text-[0.9rem] font-bold text-brand-deep transition-colors hover:bg-ink hover:text-white"
            >
              <CalendarDays className="h-[18px] w-[18px]" aria-hidden /> Book a Shoot
            </Link>
          </Reveal>

          <h2 id="more-title" className="mt-16 font-display text-sm font-bold uppercase tracking-[0.18em] text-slate">
            Explore other services
          </h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {others.map((s) => {
              const OIcon = s.icon
              return (
                <li key={s.slug}>
                  <Link
                    href={serviceHref(s.slug)}
                    className="group flex h-full items-center gap-4 overflow-hidden rounded-[14px] bg-white p-3 pr-5 ring-1 ring-black/5 transition-shadow hover:shadow-[var(--shadow-card)]"
                  >
                    <img src={s.images[0].src} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-[10px] object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-brand">
                        <OIcon className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      <span className="mt-1 block font-display text-[0.92rem] font-bold leading-snug text-ink group-hover:text-brand">
                        {s.title}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-brand transition-transform group-hover:translate-x-1" aria-hidden />
                  </Link>
                </li>
              )
            })}
          </ul>

          <Link href={pageHref('services')} className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-slate hover:text-brand">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back to all services
          </Link>
        </div>
      </section>
    </>
  )
}
