import { motion } from 'framer-motion'
import { ArrowRight, CalendarDays, MapPin, MessageCircle } from 'lucide-react'
import aboutStudio from '../assets/about-studio.webp'
import { aboutIntro, missionVision, story, values } from '../data/about'
import { services } from '../data/services'
import { contact } from '../data/site'
import { projects } from '../data/portfolio'
import { Link } from '../components/Link'
import { buttonClass, ButtonLink } from '../components/Button'
import { Reveal } from '../components/Reveal'
import { FilmReel } from '../components/FilmReel'
import { SocialLinks } from '../components/SocialIcons'
import { StatsBar } from '../sections/StatsBar'
import { homeHref, pageHref, serviceHref } from '../lib/router'
import { defaultWhatsAppMessage, whatsappLink } from '../lib/links'

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const, delay },
})

export function AboutPage() {
  const wa = whatsappLink(defaultWhatsAppMessage)
  const stills = projects.filter((p) => p.thumbnail).slice(0, 3)

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section aria-labelledby="about-page-title" className="relative isolate overflow-hidden bg-ink pb-16 pt-28 lg:pb-24 lg:pt-36">
        <div aria-hidden className="pointer-events-none absolute -left-40 top-20 -z-10 h-[420px] w-[520px] rounded-full bg-brand/15 blur-[120px]" />
        <div className="container-x grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
          <div>
            <motion.nav {...fade(0)} aria-label="Breadcrumb" className="mb-7">
              <ol className="flex items-center gap-2 text-[0.78rem] text-white/50">
                <li>
                  <Link href={homeHref()} className="hover:text-white">Home</Link>
                </li>
                <li aria-hidden>/</li>
                <li aria-current="page" className="text-white/85">About Us</li>
              </ol>
            </motion.nav>
            <motion.p {...fade(0.05)} className="eyebrow mb-4">About Us</motion.p>
            <motion.h1 {...fade(0.1)} id="about-page-title" className="heading-xl !text-[clamp(2.3rem,5.4vw,4rem)] text-white">
              <span className="block">We Are</span>
              <span className="block text-brand">Reel Craft Studio.</span>
            </motion.h1>
            {aboutIntro.map((p, i) => (
              <motion.p key={i} {...fade(0.18 + i * 0.05)} className="mt-5 max-w-[36rem] text-[1rem] leading-relaxed text-white/72">
                {p}
              </motion.p>
            ))}
            <motion.p {...fade(0.28)} className="mt-6 inline-flex items-center gap-2 rounded-lg border border-white/12 px-3 py-2 text-sm text-white/80">
              <MapPin className="h-4 w-4 text-brand" aria-hidden /> Based in {contact.location}
            </motion.p>
          </div>
          <motion.figure {...fade(0.15)} className="relative">
            <img
              src={aboutStudio}
              alt="Reel Craft Studio clapperboard, film reel and camera on a red-lit studio set"
              width={1400}
              height={788}
              className="w-full rounded-[18px] object-cover shadow-[0_30px_60px_-30px_rgb(0_0_0/0.8)] ring-1 ring-white/10"
            />
          </motion.figure>
        </div>
      </section>

      <StatsBar />

      {/* ── Our story ────────────────────────────────────────────────────── */}
      <section aria-labelledby="story-title" className="section-y bg-white text-ink">
        <div className="container-x grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <Reveal>
            <p className="eyebrow mb-3">Our Story</p>
            <h2 id="story-title" className="heading-lg">
              <span className="block">{story.title[0]}</span>
              <span className="block text-brand">{story.title[1]}</span>
            </h2>
            {story.paragraphs.map((p, i) => (
              <p key={i} className="mt-5 max-w-xl text-[0.98rem] leading-[1.75] text-slate">
                {p}
              </p>
            ))}
          </Reveal>
          <Reveal delay={0.08}>
            <ul className="grid grid-cols-3 gap-3" aria-label="Stills from our client work">
              {stills.map((p, i) => (
                <li key={p.id} className={i === 1 ? 'translate-y-6' : ''}>
                  <img
                    src={p.thumbnail}
                    alt={`Still from our ${p.title} video`}
                    loading="lazy"
                    className="aspect-[9/14] w-full rounded-[14px] object-cover shadow-[var(--shadow-card)]"
                  />
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ── Mission & vision ─────────────────────────────────────────────── */}
      <section aria-labelledby="mv-title" className="section-y relative overflow-hidden bg-ink">
        <FilmReel className="pointer-events-none absolute -right-28 -top-28 hidden w-[300px] opacity-30 lg:block" />
        <div className="container-x relative">
          <Reveal>
            <p className="eyebrow mb-3">What Drives Us</p>
            <h2 id="mv-title" className="heading-lg text-white">
              <span className="block">Mission &</span>
              <span className="block text-brand">Vision.</span>
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {missionVision.map(({ title, icon: Icon, text }, i) => (
              <Reveal key={title} delay={i * 0.08} className="rounded-[18px] border border-white/10 bg-charcoal/60 p-7 sm:p-9">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient text-white">
                  <Icon className="h-7 w-7" aria-hidden />
                </span>
                <h3 className="mt-6 font-display text-xl font-extrabold uppercase text-white">{title}</h3>
                <p className="mt-3 text-[1rem] leading-relaxed text-white/72">{text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Values ───────────────────────────────────────────────────────── */}
      <section aria-labelledby="values-title" className="section-y bg-mist text-ink">
        <div className="container-x">
          <Reveal className="max-w-2xl">
            <p className="eyebrow mb-3">Our Values</p>
            <h2 id="values-title" className="heading-lg">
              <span className="block">What We</span>
              <span className="block text-brand">Stand For.</span>
            </h2>
          </Reveal>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {values.map(({ title, icon: Icon, text }, i) => (
              <Reveal as="li" key={title} delay={i * 0.05} className="rounded-[14px] bg-white p-6 ring-1 ring-black/5 transition-shadow hover:shadow-[var(--shadow-card)]">
                <Icon className="h-7 w-7 text-brand" strokeWidth={1.8} aria-hidden />
                <h3 className="mt-4 font-display text-base font-bold text-ink">{title}</h3>
                <p className="mt-2 text-[0.9rem] leading-relaxed text-slate">{text}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ── What we do ───────────────────────────────────────────────────── */}
      <section aria-labelledby="whatwedo-title" className="section-y bg-white text-ink">
        <div className="container-x">
          <Reveal className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow mb-3">What We Do</p>
              <h2 id="whatwedo-title" className="heading-lg">
                <span className="block">Our</span>
                <span className="block text-brand">Services.</span>
              </h2>
            </div>
            <Link href={pageHref('portfolio')} className={buttonClass('outlineDark', 'md', 'self-start sm:self-auto')}>
              <span>See Our Work</span>
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Reveal>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {services.map((s, i) => {
              const Icon = s.icon
              return (
                <Reveal as="li" key={s.slug} delay={i * 0.05}>
                  <Link href={serviceHref(s.slug)} className="group block h-full overflow-hidden rounded-[14px] bg-mist ring-1 ring-black/5 transition-shadow hover:shadow-[var(--shadow-card)]">
                    <img src={s.images[0].src} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover object-[50%_35%] transition-transform duration-500 group-hover:scale-[1.04]" />
                    <span className="block p-4">
                      <Icon className="h-5 w-5 text-brand" aria-hidden />
                      <span className="mt-2 block font-display text-[0.92rem] font-bold leading-snug text-ink group-hover:text-brand">{s.title}</span>
                    </span>
                  </Link>
                </Reveal>
              )
            })}
          </ul>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section aria-labelledby="about-cta-title" className="bg-white pb-[clamp(64px,9vw,112px)]">
        <div className="container-x">
          <Reveal className="relative overflow-hidden rounded-[20px] bg-ink p-8 text-white sm:p-12">
            <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand/30 blur-[90px]" />
            <div className="relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <h2 id="about-cta-title" className="heading-lg">
                  <span className="block">Let’s Create</span>
                  <span className="block text-brand">Together.</span>
                </h2>
                <p className="mt-4 max-w-lg text-white/75">
                  Have a product, offer or story to share? Book a shoot or message us, and we’ll plan a video that fits your brand.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link href={pageHref('contact')} className={buttonClass('primary', 'lg')}>
                    <CalendarDays className="h-[18px] w-[18px]" aria-hidden />
                    <span>Book a Shoot</span>
                  </Link>
                  {wa && (
                    <ButtonLink href={wa} target="_blank" rel="noopener noreferrer" variant="whatsapp" size="lg" icon={<MessageCircle className="h-5 w-5" aria-hidden />}>
                      Chat on WhatsApp
                    </ButtonLink>
                  )}
                </div>
              </div>
              <div className="rounded-[14px] border border-white/10 bg-white/[0.04] p-6 text-sm">
                <p className="font-display text-base font-bold">Reel Craft Studio</p>
                <p className="mt-2 flex items-center gap-2 text-white/75">
                  <MapPin className="h-4 w-4 text-brand" aria-hidden /> {contact.location}
                </p>
                <p className="mt-1 text-white/75">{contact.phone}</p>
                <p className="mt-1 break-all text-white/75">{contact.email}</p>
                <SocialLinks className="mt-5" />
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
