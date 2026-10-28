import { SectionHeading } from '../components/SectionHeading'
import { Reveal } from '../components/Reveal'
import { Link } from '../components/Link'
import { ArrowRight } from 'lucide-react'
import { processSteps as steps } from '../data/process'
import { pageHref } from '../lib/router'


export function ProcessSection() {
  return (
    <section id="process" aria-labelledby="process-title" className="section-y relative overflow-hidden bg-ink">
      <div aria-hidden className="pointer-events-none absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-brand/10 blur-[110px]" />
      <div className="container-x relative grid gap-12 xl:grid-cols-[380px_1fr] xl:items-center lg:gap-10">
        <SectionHeading id="process-title" eyebrow="Our Process" line1="From Idea To" line2="Final Frame." tone="dark">
          <p className="mt-5 max-w-xs text-[0.95rem] leading-relaxed text-white/70">
            A simple and transparent process to deliver high-quality content for your brand.
          </p>
          <Link href={pageHref('process')} className="mt-6 inline-flex items-center gap-1.5 font-display text-[0.88rem] font-bold text-brand hover:text-white">
            See how each step works <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </SectionHeading>

        {/* Vertical timeline on mobile, horizontal from md up */}
        <ol className="relative grid gap-8 md:grid-cols-5 md:gap-4">
          {/* connecting line */}
          <span
            aria-hidden
            className="absolute bottom-6 left-[27px] top-6 w-px border-l-2 border-dashed border-brand/40 md:bottom-auto md:left-[10%] md:right-[10%] md:top-[27px] md:h-px md:w-auto md:border-l-0 md:border-t-2"
          />
          {steps.map((step, i) => (
            <Reveal
              as="li"
              key={step.title}
              delay={i * 0.08}
              className="relative flex items-start gap-5 md:flex-col md:items-center md:gap-0 md:text-center"
            >
              <span className="relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-brand bg-ink font-display text-lg font-extrabold text-brand shadow-[0_0_0_6px_var(--color-ink)]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="pt-2 md:pt-4">
                <h3 className="font-display text-base font-bold text-white">{step.title}</h3>
                <p className="mt-1.5 text-[0.85rem] leading-relaxed text-white/65 md:mx-auto md:max-w-[170px]">{step.short}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}
