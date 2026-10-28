import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import type { ReactNode } from 'react'
import { contact } from '../data/site'
import { showPlaceholders } from '../lib/env'
import { SocialLinks, configuredSocials } from './SocialIcons'

function Row({ icon, label, value, href }: { icon: ReactNode; label: string; value?: string; href?: string }) {
  const configured = Boolean(value)
  if (!configured && !showPlaceholders) return null
  const content = configured ? (
    href ? (
      <a href={href} className="break-words text-white hover:text-brand">
        {value}
      </a>
    ) : (
      <span className="text-white">{value}</span>
    )
  ) : (
    <span className="text-white/40 italic">Add {label.toLowerCase()} in src/data/site.ts</span>
  )
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 text-brand" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 text-[0.88rem]">
        <span className="sr-only">{label}: </span>
        {content}
      </span>
    </li>
  )
}

/** False when nothing is configured and placeholders are hidden (card renders nothing). */
export const hasContactInfo =
  showPlaceholders || Boolean(contact.phone || contact.email || contact.location || configuredSocials.length > 0)

export function ContactInfoCard() {
  const tel = contact.phone ? `tel:+${contact.phone.replace(/\D/g, '')}` : undefined
  if (!hasContactInfo) return null

  return (
    <div className="rounded-[16px] border border-white/10 bg-charcoal/85 p-6 backdrop-blur-md">
      <h3 className="font-display text-lg font-bold text-white">Get in Touch</h3>
      <ul className="mt-5 space-y-4">
        <Row icon={<Phone className="h-4.5 w-4.5" />} label="Phone / WhatsApp" value={contact.phone} href={tel} />
        <Row icon={<Mail className="h-4.5 w-4.5" />} label="Email" value={contact.email} href={contact.email ? `mailto:${contact.email}` : undefined} />
        <Row icon={<MapPin className="h-4.5 w-4.5" />} label="Location" value={contact.location} />
        {contact.hours && <Row icon={<Clock className="h-4.5 w-4.5" />} label="Hours" value={contact.hours} />}
      </ul>
      {configuredSocials.length > 0 ? (
        <SocialLinks className="mt-6" />
      ) : (
        showPlaceholders && (
          <p className="mt-6 text-[0.8rem] italic text-white/40">Add Instagram, YouTube, Facebook and LinkedIn URLs in src/data/site.ts</p>
        )
      )}
    </div>
  )
}
