import type { LucideIcon } from 'lucide-react'
import type { PlaceholderTone } from '../data/portfolio'

/**
 * Styled stand-in for photography/thumbnails that haven't been supplied yet.
 * Pass `image` to render the real (lazy-loaded) photo instead.
 */
const tones: Record<PlaceholderTone, { a: string; b: string }> = {
  ember:   { a: 'rgb(255 23 68 / 0.55)',  b: 'rgb(255 120 40 / 0.28)' },
  crimson: { a: 'rgb(255 23 68 / 0.62)',  b: 'rgb(184 0 45 / 0.45)' },
  amber:   { a: 'rgb(255 140 40 / 0.45)', b: 'rgb(255 23 68 / 0.35)' },
  rose:    { a: 'rgb(255 80 120 / 0.45)', b: 'rgb(255 200 160 / 0.18)' },
  steel:   { a: 'rgb(120 150 190 / 0.32)', b: 'rgb(255 23 68 / 0.35)' },
  violet:  { a: 'rgb(170 60 255 / 0.36)', b: 'rgb(255 23 68 / 0.42)' },
}

interface PlaceholderArtProps {
  icon: LucideIcon
  tone?: PlaceholderTone
  image?: string
  alt: string
  className?: string
  /** Small corner label, e.g. "Sample" — omit to hide. */
  label?: string
  /** 'corner' keeps the centre free for an overlay such as a play button. */
  iconPlacement?: 'center' | 'corner'
}

export function PlaceholderArt({ icon: Icon, tone = 'crimson', image, alt, className = '', label, iconPlacement = 'center' }: PlaceholderArtProps) {
  if (image) {
    return (
      <img
        src={image}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`h-full w-full object-cover ${className}`}
      />
    )
  }
  const t = tones[tone]
  return (
    <div
      role="img"
      aria-label={`${alt} (placeholder image)`}
      className={`relative h-full w-full overflow-hidden bg-[#111] ${className}`}
      style={{
        backgroundImage: `radial-gradient(120% 90% at 85% 10%, ${t.a}, transparent 55%),
          radial-gradient(90% 80% at 10% 100%, ${t.b}, transparent 60%),
          linear-gradient(180deg, #161616, #0b0b0b)`,
      }}
    >
      {/* light leak */}
      <div className="absolute -right-10 -top-16 h-48 w-24 rotate-[28deg] bg-white/10 blur-2xl" aria-hidden />
      {/* subject icon */}
      <Icon
        aria-hidden
        strokeWidth={1.1}
        className={
          iconPlacement === 'center'
            ? 'absolute left-1/2 top-1/2 h-[42%] w-[42%] -translate-x-1/2 -translate-y-1/2 text-white/25'
            : 'absolute -bottom-[8%] -right-[4%] h-[62%] w-[62%] -rotate-12 text-white/[0.13]'
        }
      />
      <div className="grain absolute inset-0 opacity-70 mix-blend-overlay" aria-hidden />
      {label && (
        <span className="absolute left-2.5 top-2.5 rounded-md bg-black/55 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-white/80 backdrop-blur-sm">
          {label}
        </span>
      )}
    </div>
  )
}
