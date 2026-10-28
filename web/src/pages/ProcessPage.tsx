import { CalendarDays, CheckCircle2, Flag, MonitorPlay, UserRound } from 'lucide-react'
import { processSteps, deliveryFormats } from '../data/process'
import { serviceFaqs } from '../data/services'
import { PageHero } from '../components/PageHero'
import { CtaBand } from '../components/CtaBand'
import { FaqList } from '../components/FaqList'
import { Link } from '../components/Link'
import { buttonClass } from '../components/Button'
import { Reveal } from '../components/Reveal'
import { ScrollLink } from '../components/ScrollLink'
import { pageHref } from '../lib/router'

export function ProcessPage() {
  return (
    <>
      <PageHero
        crumb="Process"
        eyebrow="Our Process"
        line1="From Idea To"
        line2="Final Frame."
        intro={
          <>
            <p>
              A simple and transparent process to deliver high-quality content for your brand. You always know what is
              happening, what we need from you, and what comes next.
            </p>
            <p>Here is how a project runs, step by step.</p>
          </>
        }
        actions={
          <Link href={pageHref('contact')} className={buttonClass('primary', 'lg')}>
            <CalendarDays className="h-[18px] w-[18px]" aria-hidden />
            <span>Start Your Project</span>
          </Link>
        }
        aside={
          <ol className="grid grid-cols-5 gap-2 sm:gap-3" aria-label="Process overview">
            {processSteps.map((s, i) => {
              const Icon = s.icon
              return (
                <li key={s.title} className="flex flex-col items-center gap-3 text-center">
                  <ScrollLink to={`step-${i + 1}`} className="group flex flex-col items-center gap-3">
                    <span className="grid h-14 w-14 place-items-center rounded-full sm:h-20 sm:w-20 border-2 border-brand bg-ink text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                      <Icon className="h-[38%] w-[38%]" aria-hidden />
                    </span>
                    <span className="font-display text-[0.72rem] font-bold uppercase tracking-wider text-white/80 sm:text-[0.8rem]">
                      {String(i + 1).padStart(2, '0')}
                      <span className="block text-white">{s.title}</span>
                    </span>
                  </ScrollLink>
                </li>
              )
            })}
          </ol>
        }
      />

      {/* Detailed steps on a vertical timeline */}
      <section aria-label="Process steps in detail" className="section-y bg-white text-ink">
        <div className="container-x">
          <ol className="relative">
            <span aria-hidden className="absolute bottom-8 left-[27px] top-8 w-px border-l-2 border-dashed border-brand/35 md:left-[35px]" />
            {processSteps.map((s, i) => {
              const Icon = s.icon
              return (
                <Reveal as="li" key={s.title} className="relative pb-12 pl-[76px] last:pb-0 md:pl-[100px]">
                  <span
                    id={`step-${i + 1}`}
                    className="absolute left-0 top-0 grid h-14 w-14 scroll-mt-28 place-items-center rounded-full bg-brand font-display text-lg font-extrabold text-white shadow-[0_0_0_8px_white] md:h-[72px] md:w-[72px] md:text-xl"
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="rounded-[18px] bg-mist p-6 ring-1 ring-black/5 sm:p-8">
                    <div className="flex items-center gap-3">
                      <Icon className="h-6 w-6 text-brand" aria-hidden />
                      <h2 className="font-display text-[clamp(1.4rem,2.6vw,1.9rem)] font-extrabold uppercase">{s.title}</h2>
                    </div>
                    <p className="mt-3 max-w-3xl text-[0.98rem] leading-[1.75] text-slate">{s.detail}</p>
                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                      <div className="rounded-[12px] bg-white p-5 ring-1 ring-black/5">
                        <p className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide">
                          <MonitorPlay className="h-4 w-4 text-brand" aria-hidden /> What we do
                        </p>
                        <ul className="mt-3 space-y-2">
                          {s.weDo.map((t) => (
                            <li key={t} className="flex gap-2 text-[0.88rem] leading-snug text-ink">
                              <CheckCircle2 className="mt-px h-4 w-4 shrink-0 text-brand" aria-hidden />
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-[12px] bg-white p-5 ring-1 ring-black/5">
                        <p className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide">
                          <UserRound className="h-4 w-4 text-brand" aria-hidden /> What you do
                        </p>
                        <ul className="mt-3 space-y-2">
                          {s.youDo.map((t) => (
                            <li key={t} className="flex gap-2 text-[0.88rem] leading-snug text-ink">
                              <CheckCircle2 className="mt-px h-4 w-4 shrink-0 text-black/30" aria-hidden />
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-[12px] bg-ink p-5 text-white">
                        <p className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide">
                          <Flag className="h-4 w-4 text-brand" aria-hidden /> Result
                        </p>
                        <p className="mt-3 text-[0.95rem] leading-snug text-white/85">{s.outcome}</p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </ol>
        </div>
      </section>

      {/* What you receive */}
      <section aria-labelledby="formats-title" className="section-y bg-ink">
        <div className="container-x">
          <Reveal className="max-w-2xl">
            <p className="eyebrow mb-3">What You Receive</p>
            <h2 id="formats-title" className="heading-lg text-white">
              <span className="block">Ready For</span>
              <span className="block text-brand">Every Platform.</span>
            </h2>
            <p className="mt-5 text-[0.98rem] leading-relaxed text-white/70">
              We agree the formats at the start, so you get exactly the files you need to post, share or advertise.
            </p>
          </Reveal>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {deliveryFormats.map((f, i) => (
              <Reveal as="li" key={f.label} delay={i * 0.04} className="rounded-[14px] border border-white/10 bg-charcoal/60 p-6">
                <p className="font-display text-lg font-bold text-white">{f.label}</p>
                <p className="mt-1.5 text-[0.9rem] text-white/65">{f.use}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="process-faq-title" className="section-y bg-white text-ink">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          <Reveal>
            <p className="eyebrow mb-3">Questions</p>
            <h2 id="process-faq-title" className="heading-lg">
              <span className="block">Good To</span>
              <span className="block text-brand">Know.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.06}>
            <FaqList items={serviceFaqs} />
          </Reveal>
        </div>
      </section>

      <CtaBand title="Let’s start with step one." text="Tell us about your business and your goals. We’ll take it from there." />
    </>
  )
}
