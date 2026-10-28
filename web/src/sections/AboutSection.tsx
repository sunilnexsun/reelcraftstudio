import { ArrowRight, Camera, Clock, Sparkles, Star, Users, Video } from 'lucide-react'
import { Link } from '../components/Link'
import { buttonClass } from '../components/Button'
import { aboutHref } from '../lib/router'
import { SectionHeading } from '../components/SectionHeading'
import { PlaceholderArt } from '../components/PlaceholderArt'
import { FilmReel } from '../components/FilmReel'
import aboutStudio from '../assets/about-studio.webp'
import { Reveal } from '../components/Reveal'

const highlights = [
  { label: 'Creative Storytelling', icon: Sparkles },
  { label: 'Professional Team', icon: Users },
  { label: 'High-Quality Production', icon: Video },
  { label: 'On-Time Delivery', icon: Clock },
]

/**
 * To use a real behind-the-scenes photo: import it at the top
 * (e.g. `import bts from '../assets/about-bts.webp'`) and pass `image={bts}` below.
 */
const aboutImage: string | undefined = aboutStudio

export function AboutSection() {
  return (
    <section id="about" aria-labelledby="about-title" className="section-y relative overflow-hidden bg-white text-ink">
      <FilmReel className="pointer-events-none absolute -bottom-36 -right-36 hidden w-[340px] opacity-40 xl:block motion-safe:animate-[spin_60s_linear_infinite]" />

      <div className="container-x relative grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
        <Reveal className="relative">
          <div className="relative aspect-[16/11] overflow-hidden rounded-[18px] shadow-[0_30px_60px_-30px_rgb(0_0_0/0.55)]">
            <PlaceholderArt
              icon={Camera}
              tone="crimson"
              image={aboutImage}
              alt="Reel Craft Studio clapperboard, film reel and camera on a red-lit studio set"
              label={aboutImage ? undefined : 'Behind the scenes'}
            />
          </div>
          <div className="absolute -bottom-6 right-4 rounded-[14px] bg-ink p-5 text-white shadow-2xl sm:-right-6 sm:p-6">
            <Star className="mb-3 h-7 w-7 text-brand" strokeWidth={1.8} aria-hidden />
            <p className="font-display text-[0.95rem] font-bold leading-snug">
              Your Story
              <br />
              Our Visuals
              <br />
              <span className="text-brand">Real Impact</span>
            </p>
          </div>
        </Reveal>

        <div>
          <SectionHeading id="about-title" eyebrow="About Reel Craft Studio" line1="Beyond Videos." line2="We Create Experiences.">
            <p className="mt-6 max-w-xl text-[0.98rem] leading-[1.75] text-slate">
              At Reel Craft Studio, we believe every brand has a story worth telling. Our goal is to transform ideas into
              impactful visual content through creative planning, professional shooting, and thoughtful editing. From
              your first concept to the final video, we focus on delivering content that reflects your brand and speaks
              to your audience.
            </p>
          </SectionHeading>

          <ul className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {highlights.map(({ label, icon: Icon }, i) => (
              <Reveal
                as="li"
                key={label}
                delay={0.05 * i}
                className="flex flex-col items-center gap-2.5 rounded-[12px] border border-black/[0.07] bg-mist px-3 py-5 text-center transition-colors hover:border-brand/40"
              >
                <Icon className="h-7 w-7 text-brand" strokeWidth={1.8} aria-hidden />
                <span className="font-display text-[0.78rem] font-bold leading-tight text-ink">{label}</span>
              </Reveal>
            ))}
          </ul>

          <Reveal delay={0.2} className="mt-9">
            <Link href={aboutHref()} className={buttonClass('primary', 'lg')}>
              <span>More About Us</span>
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
