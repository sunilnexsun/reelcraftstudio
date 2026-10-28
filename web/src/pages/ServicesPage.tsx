import { ArrowRight, CalendarDays, CheckCircle2 } from 'lucide-react'
import { services, serviceFaqs } from '../data/services'
import { PageHero } from '../components/PageHero'
import { CtaBand } from '../components/CtaBand'
import { FaqList } from '../components/FaqList'
import { Link } from '../components/Link'
import { buttonClass } from '../components/Button'
import { Reveal } from '../components/Reveal'
import { ScrollLink } from '../components/ScrollLink'
import { ProcessSection } from '../sections/ProcessSection'
import { pageHref, serviceHref } from '../lib/router'
import { selectService } from '../lib/links'

export function ServicesPage() {
  return (
    <>
      <PageHero
        crumb="Services"
        eyebrow="Our Services"
        line1="Creative Content."
        line2="Powerful Stories."
        intro={
          <>
            <p>
              We provide end-to-end video production and creative content services to help your brand stand out in the
              digital world, from the first idea to ready-to-post files.
            </p>
            <p>Choose a single video or a regular content plan. Every service below can be shaped around your goals and budget.</p>
          </>
        }
        actions={
          <Link href={pageHref('contact')} className={buttonClass('primary', 'lg')}>
            <CalendarDays className="h-[18px] w-[18px]" aria-hidden />
            <span>Book a Shoot</span>
          </Link>
        }
        aside={
          // Quick index of the five services
          <nav aria-label="Jump to a service" className="rounded-[18px] border border-white/10 bg-charcoal/60 p-3">
            <ul>
              {services.map((s) => {
                const Icon = s.icon
                return (
                  <li key={s.slug}>
                    <ScrollLink to={`svc-${s.slug}`} className="group flex items-center gap-4 rounded-[12px] p-3 transition-colors hover:bg-white/5">
                      <img src={s.images[0].src} alt="" className="h-14 w-14 shrink-0 rounded-[10px] object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 font-display text-[0.98rem] font-bold text-white group-hover:text-brand">
                          <Icon className="h-4 w-4 text-brand" aria-hidden /> {s.title}
                        </span>
                        <span className="mt-0.5 block truncate text-[0.82rem] text-white/55">{s.tagline}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 rotate-90 text-white/40 group-hover:text-brand" aria-hidden />
                    </ScrollLink>
                  </li>
                )
              })}
            </ul>
          </nav>
        }
      />

      {/* One detailed row per service, image side alternating */}
      <section aria-label="All services" className="bg-white text-ink">
        {services.map((s, i) => {
          const Icon = s.icon
          const flip = i % 2 === 1
          return (
            <article
              key={s.slug}
              id={`svc-${s.slug}`}
              aria-labelledby={`svc-${s.slug}-title`}
              className={`scroll-mt-24 py-[clamp(56px,8vw,96px)] ${i % 2 === 1 ? 'bg-mist' : 'bg-white'}`}
            >
              <div className="container-x grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                <Reveal className={`grid grid-cols-[1.3fr_1fr] gap-3 ${flip ? 'lg:order-2' : ''}`}>
                  <img
                    src={s.images[0].src}
                    alt={s.images[0].alt}
                    loading="lazy"
                    className="row-span-2 h-full max-h-[520px] w-full rounded-[18px] object-cover shadow-[0_24px_50px_-28px_rgb(0_0_0/0.55)]"
                  />
                  {s.images.slice(1, 3).map((img) => (
                    <img key={img.src} src={img.src} alt={img.alt} loading="lazy" className="aspect-[4/5] w-full rounded-[14px] object-cover" />
                  ))}
                </Reveal>

                <Reveal delay={0.06}>
                  <p className="eyebrow mb-3 flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand/10">
                      <Icon className="h-[18px] w-[18px] text-brand" aria-hidden />
                    </span>
                    Service {String(i + 1).padStart(2, '0')}
                  </p>
                  <h2 id={`svc-${s.slug}-title`} className="font-display text-[clamp(1.7rem,3.4vw,2.5rem)] font-extrabold uppercase leading-[1.05]">
                    {s.title}
                  </h2>
                  <p className="mt-3 font-display text-[1.05rem] font-semibold text-brand">{s.tagline}</p>
                  <p className="mt-4 text-[0.98rem] leading-[1.75] text-slate">{s.intro[0]}</p>

                  <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                    {s.includes.slice(0, 4).map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-[0.9rem] leading-snug text-ink">
                        <CheckCircle2 className="mt-px h-[18px] w-[18px] shrink-0 text-brand" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <p className="mt-6 text-[0.82rem] font-semibold uppercase tracking-[0.12em] text-slate">Ideal for</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {s.idealFor.map((t) => (
                      <li key={t} className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-[0.8rem] text-ink">
                        {t}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link href={serviceHref(s.slug)} className={buttonClass('primary', 'md')}>
                      <span>View Full Details</span>
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                    <Link
                      href={pageHref('contact')}
                      onClick={() => selectService(s.title)}
                      className={buttonClass('outlineDark', 'md')}
                    >
                      <span>Book This Service</span>
                    </Link>
                  </div>
                </Reveal>
              </div>
            </article>
          )
        })}
      </section>

      <ProcessSection />

      <section aria-labelledby="services-faq-title" className="section-y bg-white text-ink">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          <Reveal>
            <p className="eyebrow mb-3">Questions</p>
            <h2 id="services-faq-title" className="heading-lg">
              <span className="block">Good To</span>
              <span className="block text-brand">Know.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.06}>
            <FaqList items={serviceFaqs} />
          </Reveal>
        </div>
      </section>

      <CtaBand title="Not sure which service you need?" text="Tell us what you want to achieve and we’ll recommend the right video for your brand." />
    </>
  )
}
