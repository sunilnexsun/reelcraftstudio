import { motion } from 'framer-motion'
import { ArrowRight, CalendarDays, Play, Sparkles } from 'lucide-react'
import heroImage from '../assets/hero-camera.webp'
import { Button, ButtonLink } from '../components/Button'
import { brand } from '../data/site'

interface HeroProps {
  onWatchShowreel: () => void
}

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const, delay },
})

export function Hero({ onWatchShowreel }: HeroProps) {
  return (
    <section
      id="home"
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[88svh] sm:min-h-[100svh] items-center overflow-hidden bg-ink pb-16 pt-28 lg:min-h-[760px] lg:pb-20 lg:pt-32"
    >
      {/* Visual: cinema camera with red practicals. Background on mobile, right column on desktop. */}
      <div className="absolute inset-y-0 right-0 -z-10 w-full lg:w-[58%]">
        <img
          src={heroImage}
          alt="Cinema camera on a tripod with monitor, lit by dramatic red studio lights"
          width={879}
          height={1020}
          fetchPriority="high"
          className="h-full w-full object-cover object-[60%_30%] opacity-45 lg:opacity-100"
        />
        {/* fades into the black text side + bottom */}
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/40 to-transparent lg:via-ink/10" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-ink/70 to-transparent" />
      </div>
      {/* ambient red light behind the headline */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-1/3 -z-10 h-[420px] w-[520px] rounded-full bg-brand/15 blur-[120px]"
      />

      <div className="container-x">
        <div className="max-w-[640px]">
          <motion.p {...fade(0.05)} className="eyebrow mb-5 !text-white/90 !tracking-[0.32em]">
            Video Production Studio
          </motion.p>

          <motion.h1 {...fade(0.12)} id="hero-title" className="heading-xl lg:!text-[clamp(3.2rem,5.2vw,4.4rem)] lg:whitespace-nowrap">
            <span className="block text-white">We Create</span>
            <span className="block text-brand">Videos That Sell.</span>
          </motion.h1>

          <motion.p {...fade(0.2)} className="mt-5 font-display text-[clamp(1.1rem,2vw,1.45rem)] font-semibold text-white">
            {brand.tagline}
          </motion.p>

          <motion.p {...fade(0.26)} className="mt-4 max-w-[34rem] text-[clamp(0.98rem,1.4vw,1.08rem)] leading-relaxed text-white/75">
            From creative concepts to professional production, we help brands capture attention, build trust, and
            create content that drives real results.
          </motion.p>

          <motion.div {...fade(0.32)} className="mt-8 flex flex-wrap gap-3.5">
            <ButtonLink
              href="#contact"
              size="lg"
              icon={<CalendarDays className="h-[18px] w-[18px]" aria-hidden />}
              iconRight={<ArrowRight className="h-4 w-4" aria-hidden />}
            >
              Book a Shoot
            </ButtonLink>
            <Button
              variant="outline"
              size="lg"
              onClick={onWatchShowreel}
              icon={
                <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-current">
                  <Play className="ml-px h-2.5 w-2.5 fill-current" aria-hidden />
                </span>
              }
            >
              Watch Showreel
            </Button>
          </motion.div>

          <motion.p {...fade(0.4)} className="mt-8 flex items-center gap-3 text-sm text-white/70">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/5">
              <Sparkles className="h-4 w-4 text-brand" aria-hidden />
            </span>
            <span>
              <span className="block font-semibold text-white">Made for growing brands</span>
              Businesses · Startups · Personal brands
            </span>
          </motion.p>
        </div>
      </div>
    </section>
  )
}
