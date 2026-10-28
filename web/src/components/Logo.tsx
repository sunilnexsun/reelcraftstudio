import logo160 from '../assets/logo-160.webp'
import logo320 from '../assets/logo-320.webp'

interface LogoProps {
  /** Rendered size in px (the logo is circular). */
  size?: number
  showWordmark?: boolean
  className?: string
}

/** Official Reel Craft Studio logo (unaltered artwork, masked to its circular badge). */
export function Logo({ size = 56, showWordmark = true, className = '' }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <img
        src={logo160}
        srcSet={`${logo160} 160w, ${logo320} 320w`}
        sizes={`${size}px`}
        width={size}
        height={size}
        alt="Reel Craft Studio logo"
        className="shrink-0 rounded-full ring-1 ring-white/10"
        style={{ width: size, height: size }}
      />
      {showWordmark && (
        <span className="leading-none">
          <span className="block font-display text-[1.35rem] font-extrabold tracking-tight text-white">
            Reel<span className="text-brand">Craft</span>
          </span>
          <span className="mt-1 block font-display text-[0.62rem] font-semibold tracking-[0.42em] text-white/80">
            STUDIO
          </span>
        </span>
      )}
    </span>
  )
}
