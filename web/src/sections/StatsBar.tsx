import { Clapperboard, Star, Users, Zap, type LucideIcon } from 'lucide-react'
import { stats } from '../data/site'
import { Reveal } from '../components/Reveal'

const icons: Record<(typeof stats)[number]['icon'], LucideIcon> = {
  clapperboard: Clapperboard,
  users: Users,
  star: Star,
  zap: Zap,
}

/** Values live in src/data/site.ts (placeholders until confirmed by the studio). */
export function StatsBar() {
  return (
    <section aria-label="Studio at a glance" className="relative border-y border-white/8 bg-ink">
      <div className="container-x">
        <ul className="grid grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => {
            const Icon = icons[s.icon]
            return (
              <Reveal
                as="li"
                key={s.label}
                delay={i * 0.06}
                className={`flex items-center justify-center gap-4 px-3 py-7 sm:py-8 ${
                  i % 2 === 1 ? 'border-l border-white/10' : ''
                } ${i >= 2 ? 'border-t border-white/10 lg:border-t-0' : ''} ${i === 2 ? 'lg:border-l' : ''}`}
              >
                <Icon className="h-8 w-8 shrink-0 fill-brand/20 text-brand sm:h-9 sm:w-9" strokeWidth={1.8} aria-hidden />
                <div>
                  <p className="font-display text-[clamp(1.5rem,3vw,2.1rem)] font-extrabold leading-none text-white">
                    {s.value}
                  </p>
                  <p className="mt-1.5 text-xs text-white/65 sm:text-[0.8rem]">{s.label}</p>
                </div>
              </Reveal>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
