import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { Link } from './Link'
import { homeHref } from '../lib/router'

export const fadeIn = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const, delay },
})

interface PageHeroProps {
  /** Breadcrumb label for this page. */
  crumb: string
  eyebrow: string
  line1: string
  line2: string
  intro: ReactNode
  /** Buttons under the intro. */
  actions?: ReactNode
  /** Right-hand visual; without it the hero is a single centred-left column. */
  aside?: ReactNode
}

/** Dark hero used at the top of every inner page (owns the page's single <h1>). */
export function PageHero({ crumb, eyebrow, line1, line2, intro, actions, aside }: PageHeroProps) {
  return (
    <section aria-labelledby="page-title" className="relative isolate overflow-hidden bg-ink pb-14 pt-32 lg:pb-20 xl:pt-40">
      <div aria-hidden className="pointer-events-none absolute -left-40 top-20 -z-10 h-[420px] w-[520px] rounded-full bg-brand/15 blur-[120px]" />
      <div aria-hidden className="pointer-events-none absolute -right-40 bottom-0 -z-10 h-[340px] w-[460px] rounded-full bg-brand-deep/15 blur-[130px]" />
      <div className={`container-x grid items-center gap-12 ${aside ? 'lg:grid-cols-[1.05fr_1fr] lg:gap-16' : ''}`}>
        <div className={aside ? '' : 'max-w-3xl'}>
          <motion.nav {...fadeIn(0)} aria-label="Breadcrumb" className="mb-7">
            <ol className="flex flex-wrap items-center gap-2 text-[0.8rem] text-white/50">
              <li>
                <Link href={homeHref()} className="hover:text-white">Home</Link>
              </li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-white/85">{crumb}</li>
            </ol>
          </motion.nav>
          <motion.p {...fadeIn(0.05)} className="eyebrow mb-4">{eyebrow}</motion.p>
          <motion.h1 {...fadeIn(0.1)} id="page-title" className={`heading-xl text-white ${aside ? '!text-[clamp(2.2rem,4.6vw,3.5rem)]' : '!text-[clamp(2.3rem,5.4vw,4.1rem)]'}`}>
            <span className="block">{line1}</span>
            <span className="block text-brand">{line2}</span>
          </motion.h1>
          <motion.div {...fadeIn(0.18)} className="mt-6 max-w-[38rem] space-y-4 text-[1.02rem] leading-relaxed text-white/72">
            {intro}
          </motion.div>
          {actions && (
            <motion.div {...fadeIn(0.26)} className="mt-8 flex flex-wrap gap-3">
              {actions}
            </motion.div>
          )}
        </div>
        {aside && <motion.div {...fadeIn(0.15)}>{aside}</motion.div>}
      </div>
    </section>
  )
}
