import { z } from 'zod'

/** Form inputs are strings; these validate them, and the to* helpers convert on submit. */
export const req = (label: string, min = 2, max = 160) =>
  z.string().trim().min(min, `${label} must be at least ${min} characters`).max(max, `${label} is too long (max ${max})`)
export const opt = (max = 2000) => z.string().trim().max(max, `Too long (max ${max} characters)`)
export const phone = z.string().trim().refine((v) => v === '' || /^[0-9+\-\s()]{7,20}$/.test(v), 'Enter a valid phone number')
export const email = z.string().trim().refine((v) => v === '' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'Enter a valid email')
export const money = z.string().trim().refine((v) => v === '' || (/^\d{1,10}(\.\d{1,2})?$/.test(v.replace(/,/g, '')) && Number(v.replace(/,/g, '')) <= 1e9), 'Enter an amount like 25000 or 25000.50')
export const moneyReq = z.string().trim().refine((v) => /^\d{1,10}(\.\d{1,2})?$/.test(v.replace(/,/g, '')) && Number(v.replace(/,/g, '')) > 0, 'Enter an amount greater than 0')
export const date = z.string().refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Pick a date')
export const dateReq = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date')
export const url = z.string().trim().refine((v) => v === '' || /^https:\/\/[^\s]+$/i.test(v), 'Use a full https:// link')
export const hex = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #FF1744')

export const toMoney = (v: string): number | null => (v.trim() === '' ? null : Math.round(Number(v.replace(/,/g, '')) * 100) / 100)
export const toText = (v: string | undefined | null): string | null => (v == null || v.trim() === '' ? null : v.trim())
export const toDate = (v: string): string | null => (v === '' ? null : v)
export const str = (v: unknown): string => (v == null ? '' : String(v))
export const tags = (v: string): string[] => [...new Set(v.split(/[,\n]/).map((s) => s.trim()).filter(Boolean))]
