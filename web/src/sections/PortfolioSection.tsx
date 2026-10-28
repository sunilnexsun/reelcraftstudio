import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { portfolioCategories, projects, type Project } from '../data/portfolio'
import { PortfolioCard } from '../components/PortfolioCard'
import { SectionHeading } from '../components/SectionHeading'
import { buttonClass } from '../components/Button'
import { Link } from '../components/Link'
import { pageHref } from '../lib/router'
import { Reveal } from '../components/Reveal'

type Filter = (typeof portfolioCategories)[number]
const HOME_LIMIT = 5

interface PortfolioSectionProps {
  onOpenProject: (p: Project) => void
  /** On the Portfolio page the page hero carries the heading, so the section hides its own. */
  standalone?: boolean
}

export function PortfolioSection({ onOpenProject, standalone = false }: PortfolioSectionProps) {
  const [filter, setFilter] = useState<Filter>('All Work')
  const matching = useMemo(
    () => (filter === 'All Work' ? projects : projects.filter((p) => p.category === filter)),
    [filter],
  )
  // The home page shows the latest five; the Portfolio page shows everything.
  const visible = standalone ? matching : matching.slice(0, HOME_LIMIT)
  const hidden = matching.length - visible.length
  const hasSamples = projects.some((p) => p.isSample)
  // Only offer filters that have at least one project behind them.
  const filters = portfolioCategories.filter((c) => c === 'All Work' || projects.some((p) => p.category === c))

  return (
    <section
      id="portfolio"
      aria-labelledby={standalone ? undefined : 'portfolio-title'}
      aria-label={standalone ? 'Portfolio videos' : undefined}
      className={`relative overflow-hidden bg-ink ${standalone ? 'pb-[clamp(64px,9vw,112px)] pt-6' : 'section-y'}`}
    >
      <div aria-hidden className="pointer-events-none absolute -right-40 top-10 h-96 w-96 rounded-full bg-brand/10 blur-[110px]" />
      <div className="container-x relative">
        {!standalone && (
          <div className="grid items-end gap-8 lg:grid-cols-[1.1fr_1fr]">
            <SectionHeading id="portfolio-title" eyebrow="Our Portfolio" line1="Every Frame" line2="Tells a Story." tone="dark" />
            <Reveal delay={0.08} className="flex flex-col gap-5 sm:flex-row sm:items-center lg:justify-end">
              <p className="max-w-sm text-[0.95rem] leading-relaxed text-white/70">
                Explore our creative work across brand promotions, product videos, business advertisements, and social
                media reels.
              </p>
              <Link href={pageHref('portfolio')} className={buttonClass('outlineDark', 'md', 'shrink-0 self-start sm:self-auto')}>
                <span>View Full Portfolio</span>
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Reveal>
          </div>
        )}

        {/* Filters: a toggle-button group (aria-pressed) that filters the grid below */}
        <div
          role="group"
          aria-label="Filter portfolio by category"
          className={`-mx-4 ${standalone ? '' : 'mt-10'} flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0`}
        >
          {filters.map((cat) => {
            const on = filter === cat
            return (
              <button
                key={cat}
                type="button"
                aria-pressed={on}
                aria-controls="portfolio-grid"
                onClick={() => setFilter(cat)}
                className={`shrink-0 rounded-lg border px-4 py-2.5 font-display text-[0.78rem] font-semibold transition-colors ${
                  on
                    ? 'border-brand bg-brand text-white'
                    : 'border-white/15 bg-white/[0.03] text-white/80 hover:border-white/40 hover:text-white'
                }`}
              >
                {cat}
              </button>
            )
          })}
        </div>
        <p className="sr-only" aria-live="polite">
          Showing {visible.length} of {matching.length} {matching.length === 1 ? 'project' : 'projects'} in {filter}
        </p>

        <motion.ul id="portfolio-grid" layout className="mt-8 grid grid-cols-1 gap-x-5 gap-y-8 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map((project) => (
              <motion.li
                key={project.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
              >
                <PortfolioCard project={project} onOpen={onOpenProject} />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>

        {hidden > 0 && (
          <div className="mt-10 flex justify-center">
            <Link href={pageHref('portfolio')} className={buttonClass('primary', 'lg')}>
              <span>See All Videos</span>
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        )}

        {hasSamples && (
          <p className="mt-10 text-center text-xs text-white/45">
            Projects marked “Sample” are illustrative placeholders — final client work will be added here.
          </p>
        )}
      </div>
    </section>
  )
}
