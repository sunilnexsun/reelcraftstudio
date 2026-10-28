import { Mail, MessageCircle, Phone } from 'lucide-react'
import { cn, telLink, whatsappLink } from '@/lib/utils'

/** Click-to-call, WhatsApp and email shortcuts. Hidden when the contact detail is missing. */
export function ContactLinks({ phone, whatsapp, email, message, size = 'sm', className }: {
  phone?: string | null; whatsapp?: string | null; email?: string | null; message?: string; size?: 'sm' | 'md'; className?: string
}) {
  const tel = telLink(phone)
  const wa = whatsappLink(whatsapp ?? phone, message)
  const cls = cn('grid place-items-center rounded-lg border border-line-strong text-fg-soft transition-colors hover:text-white', size === 'sm' ? 'size-8 [&_svg]:size-4' : 'size-10 [&_svg]:size-5')
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {tel && <a href={tel} className={cn(cls, 'hover:border-sky-400/50 hover:bg-sky-500/10')} aria-label={`Call ${phone}`} title={`Call ${phone}`}><Phone /></a>}
      {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className={cn(cls, 'hover:border-emerald-400/50 hover:bg-emerald-500/10')} aria-label="WhatsApp" title="WhatsApp"><MessageCircle /></a>}
      {email && <a href={`mailto:${email}`} className={cn(cls, 'hover:border-accent/50 hover:bg-accent-soft')} aria-label={`Email ${email}`} title={email}><Mail /></a>}
    </div>
  )
}
