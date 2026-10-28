import { ArrowRight } from 'lucide-react'
import type { Service } from '../data/services'
import { Link } from './Link'
import { serviceHref } from '../lib/router'

/** Whole card links to the service's own page. */
export function ServiceCard({ service }: { service: Service }) {
  const Icon = service.icon
  const cover = service.images[0]
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)] ring-1 ring-black/5 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-18px_rgb(0_0_0/0.35)] motion-reduce:hover:translate-y-0">
      <div className="relative aspect-[4/3] overflow-hidden bg-ink">
        <img
          src={cover.src}
          alt={cover.alt}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover object-[50%_35%] transition-transform duration-500 group-hover:scale-[1.05] motion-reduce:group-hover:scale-100"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
      </div>
      <div className="relative flex flex-1 flex-col px-5 pb-6 pt-9">
        <span className="absolute -top-7 left-5 grid h-14 w-14 place-items-center rounded-xl bg-white text-brand shadow-[0_8px_20px_-8px_rgb(0_0_0/0.35)] ring-1 ring-black/5 transition-colors duration-300 group-hover:bg-brand group-hover:text-white">
          <Icon className="h-6 w-6" strokeWidth={2} aria-hidden />
        </span>
        <h3 className="font-display text-[1.05rem] font-bold text-ink">{service.title}</h3>
        <p className="mt-2.5 flex-1 text-[0.9rem] leading-relaxed text-slate">{service.description}</p>
        <Link
          href={serviceHref(service.slug)}
          className="mt-5 inline-flex items-center gap-1.5 self-start font-display text-[0.82rem] font-bold text-brand transition-colors after:absolute after:inset-0 after:content-[''] hover:text-brand-deep"
        >
          Know More<span className="sr-only"> about {service.title}</span>
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
        </Link>
      </div>
    </article>
  )
}
