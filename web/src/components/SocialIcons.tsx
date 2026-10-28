import type { SVGProps } from 'react'
import { socials } from '../data/site'

/** Simple outline brand glyphs (lucide-react no longer ships brand icons). */
type P = SVGProps<SVGSVGElement>
const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export const InstagramIcon = (p: P) => (
  <svg {...base} {...p}><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" /></svg>
)
export const YoutubeIcon = (p: P) => (
  <svg {...base} {...p}><path d="M2.5 17a24 24 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.6 49.6 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24 24 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.6 49.6 0 0 1-16.2 0A2 2 0 0 1 2.5 17" /><path d="m10 15 5-3-5-3z" /></svg>
)
export const FacebookIcon = (p: P) => (
  <svg {...base} {...p}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
)
export const LinkedinIcon = (p: P) => (
  <svg {...base} {...p}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>
)

const all = [
  { key: 'instagram', label: 'Instagram', Icon: InstagramIcon },
  { key: 'youtube', label: 'YouTube', Icon: YoutubeIcon },
  { key: 'facebook', label: 'Facebook', Icon: FacebookIcon },
  { key: 'linkedin', label: 'LinkedIn', Icon: LinkedinIcon },
] as const

/** Only social profiles with a configured URL are returned. */
export const configuredSocials = all
  .map((s) => ({ ...s, href: socials[s.key] }))
  .filter((s) => s.href.trim() !== '')

export function SocialLinks({ className = '' }: { className?: string }) {
  if (configuredSocials.length === 0) return null
  return (
    <ul className={`flex flex-wrap gap-2.5 ${className}`}>
      {configuredSocials.map(({ key, label, Icon, href }) => (
        <li key={key}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Reel Craft Studio on ${label}`}
            className="grid h-10 w-10 place-items-center rounded-full bg-brand text-white transition-colors hover:bg-brand-deep"
          >
            <Icon className="h-[18px] w-[18px]" />
          </a>
        </li>
      ))}
    </ul>
  )
}
