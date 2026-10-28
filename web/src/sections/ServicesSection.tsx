import { ArrowRight } from 'lucide-react'
import { services } from '../data/services'
import { ServiceCard } from '../components/ServiceCard'
import { SectionHeading } from '../components/SectionHeading'
import { buttonClass } from '../components/Button'
import { Link } from '../components/Link'
import { pageHref } from '../lib/router'
import { Reveal } from '../components/Reveal'

export function ServicesSection() {
  return (
    <section id="services" aria-labelledby="services-title" className="section-y bg-mist text-ink">
      <div className="container-x">
        <div className="grid items-end gap-8 lg:grid-cols-[1.1fr_1fr]">
          <SectionHeading id="services-title" eyebrow="Our Services" line1="Creative Content." line2="Powerful Stories." />
          <Reveal delay={0.08} className="flex flex-col gap-5 sm:flex-row sm:items-center lg:justify-end">
            <p className="max-w-sm text-[0.95rem] leading-relaxed text-slate">
              We provide end-to-end video production and creative content services to help your brand stand out in the
              digital world.
            </p>
            <Link href={pageHref('services')} className={buttonClass('outlineDark', 'md', 'shrink-0 self-start sm:self-auto')}>
              <span>View All Services</span>
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Reveal>
        </div>

        <ul className="mt-12 flex flex-wrap justify-center gap-x-5 gap-y-8">
          {services.map((service, i) => (
            <Reveal as="li" key={service.slug} delay={i * 0.07} className="w-full sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)]">
              <ServiceCard service={service} />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
