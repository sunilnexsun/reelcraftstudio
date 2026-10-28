import { CalendarDays, Gem, Shirt, Smartphone, Sofa, Sun, Utensils, Wifi, type LucideIcon } from 'lucide-react'
import type { Project } from '../data/portfolio'
import { PageHero } from '../components/PageHero'
import { CtaBand } from '../components/CtaBand'
import { Link } from '../components/Link'
import { buttonClass } from '../components/Button'
import { Reveal } from '../components/Reveal'
import { PortfolioSection } from '../sections/PortfolioSection'
import { StatsBar } from '../sections/StatsBar'
import { pageHref } from '../lib/router'

/** Industries shown in our real portfolio so far. */
const industries: { title: string; icon: LucideIcon; text: string }[] = [
  { title: 'Fashion & Expos', icon: Shirt, text: 'Store reels and exhibition promos, like Pommys Fashion, The Chennai Silks expo in Sivakasi and the VRB lifestyle expo.' },
  { title: 'Jewellery & Beauty', icon: Gem, text: 'Showroom and salon videos, from Thangamayil and Srikumaran jewellery to Face Arts’ bridal sets and Ruva’s beauty salon.' },
  { title: 'Interiors & Spaces', icon: Sofa, text: 'Walkthrough films that show finished spaces in detail, like FB Interiors’ restaurant and sports turf projects.' },
  { title: 'Mobiles & Appliances', icon: Smartphone, text: 'Offer-led store reels for phones and home appliances, like Satya Mobiles and Sri Meenakshi Fan House.' },
  { title: 'Food & Catering', icon: Utensils, text: 'Taste-review films that make food look as good as it is, like Ibu Catering Service.' },
  { title: 'Solar & Energy', icon: Sun, text: 'Promos that explain products and schemes clearly, like Solarich Green Power’s rooftop solar video.' },
  { title: 'Brand Collaborations', icon: Wifi, text: 'Co-branded ads that pair two brands in one story, like Mittai Kadai × Sense Connect’s IPL combo.' },
]

export function PortfolioPage({ onOpenProject }: { onOpenProject: (p: Project) => void }) {
  return (
    <>
      <PageHero
        crumb="Portfolio"
        eyebrow="Our Portfolio"
        line1="Every Frame"
        line2="Tells a Story."
        intro={
          <p>
            Explore our creative work across brand promotions, product videos, business advertisements and social media
            reels. Press play on any project to watch it here.
          </p>
        }
      />

      <PortfolioSection onOpenProject={onOpenProject} standalone />

      <StatsBar />

      <section aria-labelledby="industries-title" className="section-y bg-white text-ink">
        <div className="container-x">
          <Reveal className="max-w-2xl">
            <p className="eyebrow mb-3">Industries</p>
            <h2 id="industries-title" className="heading-lg">
              <span className="block">Brands We’ve</span>
              <span className="block text-brand">Worked With.</span>
            </h2>
            <p className="mt-5 text-[0.98rem] leading-relaxed text-slate">
              Every business has its own customers and its own way of selling. Here are the kinds of brands our videos
              have helped so far.
            </p>
          </Reveal>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {industries.map(({ title, icon: Icon, text }, i) => (
              <Reveal as="li" key={title} delay={i * 0.05} className="rounded-[14px] bg-mist p-6 ring-1 ring-black/5">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand text-white">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <h3 className="mt-5 font-display text-base font-bold">{title}</h3>
                <p className="mt-2 text-[0.9rem] leading-relaxed text-slate">{text}</p>
              </Reveal>
            ))}
          </ul>
          <Reveal className="mt-10">
            <Link href={pageHref('contact')} className={buttonClass('primary', 'lg')}>
              <CalendarDays className="h-[18px] w-[18px]" aria-hidden />
              <span>Get Your Brand Featured</span>
            </Link>
          </Reveal>
        </div>
      </section>

      <CtaBand title="Want a video like these?" text="Share your idea and we’ll plan a reel, promo or brand film that fits your business." />
    </>
  )
}
