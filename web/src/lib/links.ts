import { contact } from '../data/site'

/** Digits-only phone number, or '' when not configured. */
export function phoneDigits(raw: string = contact.phone): string {
  return raw.replace(/\D/g, '')
}

/**
 * Builds https://wa.me/<COUNTRYCODEPHONENUMBER>?text=… from the configured
 * number. Returns null when no valid number is configured, so callers can
 * fall back gracefully instead of rendering a broken link.
 */
export function whatsappLink(message?: string, raw: string = contact.phone): string | null {
  const digits = phoneDigits(raw)
  if (digits.length < 8) return null
  const text = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${digits}${text}`
}

export function mailtoLink(subject: string, body: string): string | null {
  if (!contact.email) return null
  return `mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export const defaultWhatsAppMessage =
  "Hi Reel Craft Studio! I'd like to talk about a video project."

/** Fired by "Know More" links so the enquiry form can preselect a service. */
export const SELECT_SERVICE_EVENT = 'rcs:select-service'
let pendingService: string | null = null
/** Preselects a service in the enquiry form — works even if the form mounts afterwards (page switch). */
export function selectService(title: string) {
  pendingService = title
  window.dispatchEvent(new CustomEvent<string>(SELECT_SERVICE_EVENT, { detail: title }))
}
export const peekPendingService = () => pendingService
export function takePendingService(): string | null {
  const s = pendingService
  pendingService = null
  return s
}
