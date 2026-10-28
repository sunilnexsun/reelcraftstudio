import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

export function initials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.replace(/^(dr|mr|mrs|ms)\.?\s+/i, '').trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export function slugify(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
}

/** Indian numbers without a country code get +91. Returns digits only (wa.me format). */
export function waNumber(phone: string | null | undefined): string | null {
  if (!phone) return null
  let d = phone.replace(/\D/g, '')
  if (d.length === 10) d = '91' + d
  if (d.length === 11 && d.startsWith('0')) d = '91' + d.slice(1)
  return d.length >= 11 ? d : null
}
export function whatsappLink(phone: string | null | undefined, text?: string): string | null {
  const n = waNumber(phone)
  return n ? `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}` : null
}
export function telLink(phone: string | null | undefined): string | null {
  if (!phone) return null
  const n = phone.replace(/[^\d+]/g, '')
  return n.length >= 7 ? `tel:${n}` : null
}

export function nullIfEmpty<T extends Record<string, unknown>>(o: T): T {
  const out = { ...o }
  for (const k of Object.keys(out)) if (out[k] === '') (out as Record<string, unknown>)[k] = null
  return out
}

/** Case-insensitive match across several fields. */
export function matches(q: string, ...fields: (string | number | null | undefined)[]): boolean {
  const s = q.trim().toLowerCase()
  if (!s) return true
  return fields.some((f) => f != null && String(f).toLowerCase().includes(s))
}

export function byId<T extends { id: string }>(rows: T[]): Map<string, T> { return new Map(rows.map((r) => [r.id, r])) }
