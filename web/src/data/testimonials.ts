/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  TESTIMONIALS — three boxes.
 *  Fill each slot with a genuine review from a real client, with their
 *  permission. A slot whose `quote` is empty shows a neutral
 *  "Client review coming soon" card, so nothing invented is ever published.
 *
 *  image:  optional — e.g. '/testimonials/client.jpg' in /public, only with permission
 *  rating: optional — only if the client actually gave one
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface Testimonial {
  name: string
  role: string
  quote: string
  image?: string
  rating?: 1 | 2 | 3 | 4 | 5
}

export const testimonials: Testimonial[] = [
  { name: '', role: '', quote: '' },
  { name: '', role: '', quote: '' },
  { name: '', role: '', quote: '' },
]
