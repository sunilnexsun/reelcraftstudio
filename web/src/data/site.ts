/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  CENTRAL SITE CONFIGURATION — edit this file to update contact details,
 *  social links, stats and the showreel. Nothing here is a confirmed business
 *  detail yet: every empty string is a placeholder waiting for real data.
 *  Empty values are hidden on the site (or shown as "Add …" in dev only).
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const brand = {
  name: 'Reel Craft Studio',
  tagline: 'Beyond Videos. Learn the Art.',
}

export const contact = {
  /**
   * WhatsApp / phone number in international format. Spaces, "+" and dashes
   * are fine here — they're stripped when building the wa.me link.
   */
  phone: '+91 79049 71847',
  email: 'reelcraftstudio.media@gmail.com',
  location: 'Sivakasi, Tamil Nadu',
  /** Optional opening-hours line shown in the contact card. */
  hours: '',
}

export const socials = {
  /** Full profile URLs. Empty links are hidden. */
  instagram: 'https://www.instagram.com/reel_craft_studio.2026/',
  youtube: '',
  facebook: 'https://www.facebook.com/profile.php?id=61595626267283',
  linkedin: '',
}

/**
 * Showreel played by the hero "Watch Showreel" button.
 * Supported: a YouTube or Vimeo URL, or a self-hosted .mp4/.webm file
 * (put the file in /public/videos and use '/videos/showreel.mp4').
 * PLACEHOLDER: leave empty until the real showreel is ready.
 */
export const showreel = {
  url: '',
  title: 'Reel Craft Studio — Showreel',
}

/**
 * Where "Book a Shoot" enquiries are sent.
 * Default: FormSubmit (formsubmit.co) — emails each enquiry to contact.email,
 * no account or server needed. The very first enquiry triggers a one-time
 * "Activate Form" email to that inbox; click it and every later enquiry is
 * delivered. Override with VITE_FORM_ENDPOINT (e.g. Formspree or your own API).
 * The form only shows success when the service confirms delivery.
 */
export const formEndpoint: string =
  import.meta.env.VITE_FORM_ENDPOINT || (contact.email ? `https://formsubmit.co/ajax/${contact.email}` : '')

/** Stats strip — figures confirmed by the studio (Oct 2026). */
export const stats = [
  { value: '50+', label: 'Projects Completed', icon: 'clapperboard' },
  { value: '65+', label: 'Happy Clients', icon: 'users' },
  { value: '2+', label: 'Years Experience', icon: 'star' },
  { value: '100%', label: 'Creative Focus', icon: 'zap' },
] as const

export const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'Services', href: '#services' },
  { label: 'Portfolio', href: '#portfolio' },
  { label: 'About', href: '#about' },
  { label: 'Process', href: '#process' },
  { label: 'Contact', href: '#contact' },
] as const
