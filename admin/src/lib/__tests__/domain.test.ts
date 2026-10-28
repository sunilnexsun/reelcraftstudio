import { describe, expect, it } from 'vitest'
import { assertPaymentFits, computeInvoiceTotals, deriveInvoiceStatus } from '../domain/invoice'
import { findConflicts, overlaps } from '../domain/bookings'
import { toCSV } from '../domain/csv'
import { formatDuration, parseDuration, parseVideoUrl } from '../domain/video'
import { dayKey, isoToISTInput, istInputToISO, previousRange, pctChange, presetRange } from '../domain/dates'
import { formatINR, formatINRCompact, round2 } from '../domain/money'
import { completionRate, conversionRate, financeSummary, projectStatusBreakdown } from '../domain/reports'
import { whatsappLink } from '../utils'
import type { Enquiry, Expense, Invoice, Payment, Project } from '@/types/db'

describe('invoice maths (mirrors public.compute_invoice)', () => {
  it('matches the database result for the reference invoice', () => {
    // same figures as the PGlite database check: 50,000 subtotal, 10% off, 18% GST
    const t = computeInvoiceTotals([{ quantity: 1, unit_price: 40000 }, { quantity: 2, unit_price: 5000 }], 'percent', 10, 18, 20000)
    expect(t).toEqual({ subtotal: 50000, discount_amount: 5000, tax_amount: 8100, total: 53100, amount_paid: 20000, balance_due: 33100 })
  })
  it('caps a flat discount at the subtotal and never goes negative', () => {
    const t = computeInvoiceTotals([{ quantity: 1, unit_price: 1000 }], 'flat', 5000, 18)
    expect(t.discount_amount).toBe(1000)
    expect(t.total).toBe(0)
  })
  it('rounds each line and the tax to paise', () => {
    const t = computeInvoiceTotals([{ quantity: 3, unit_price: 333.33 }], 'flat', 0, 18)
    expect(t.subtotal).toBe(999.99)
    expect(t.tax_amount).toBe(180)
    expect(t.total).toBe(1179.99)
  })
  it('derives status from payments and due date', () => {
    expect(deriveInvoiceStatus('sent', 1000, 0, '2026-10-30', '2026-10-26')).toBe('sent')
    expect(deriveInvoiceStatus('sent', 1000, 400, '2026-10-30', '2026-10-26')).toBe('partially_paid')
    expect(deriveInvoiceStatus('partially_paid', 1000, 1000, '2026-10-01', '2026-10-26')).toBe('paid')
    expect(deriveInvoiceStatus('sent', 1000, 0, '2026-10-01', '2026-10-26')).toBe('overdue')
    expect(deriveInvoiceStatus('partially_paid', 1000, 400, '2026-10-01', '2026-10-26')).toBe('overdue')
    expect(deriveInvoiceStatus('overdue', 1000, 0, '2026-11-30', '2026-10-26')).toBe('sent')
    expect(deriveInvoiceStatus('draft', 1000, 0, '2026-10-01', '2026-10-26')).toBe('draft')
    expect(deriveInvoiceStatus('void', 1000, 1000, null, '2026-10-26')).toBe('void')
    expect(deriveInvoiceStatus('paid', 1000, 0, null, '2026-10-26')).toBe('sent') // payment deleted
  })
  it('refuses overpayment', () => {
    expect(() => assertPaymentFits(53100, 20000, 40000)).toThrow(/exceeds the invoice balance of 33100.00/)
    expect(() => assertPaymentFits(53100, 20000, 33100)).not.toThrow()
    expect(() => assertPaymentFits(100, 0, 0)).toThrow()
  })
})

describe('booking conflicts (mirrors public.booking_conflicts)', () => {
  const A = { id: 'a', code: 'BK-1', title: 'Shoot A', start_at: '2026-11-01T03:30:00Z', end_at: '2026-11-01T07:30:00Z', equipment: ['Sony FX3 #1'], status: 'confirmed' }
  const crew = new Map([['a', ['vik']]])
  it('treats intervals as half-open', () => {
    expect(overlaps(A.start_at, A.end_at, '2026-11-01T07:30:00Z', '2026-11-01T09:00:00Z')).toBe(false)
    expect(overlaps(A.start_at, A.end_at, '2026-11-01T07:29:00Z', '2026-11-01T09:00:00Z')).toBe(true)
  })
  it('flags shared crew and shared equipment with a reason', () => {
    const c = findConflicts({ start_at: '2026-11-01T06:30:00Z', end_at: '2026-11-01T09:30:00Z', crew: ['vik'], equipment: ['Sony FX3 #1'] }, [A], crew, (id) => (id === 'vik' ? 'Vik Cam' : id))
    expect(c).toHaveLength(1)
    expect(c[0].reason).toBe('crew: Vik Cam; equipment: Sony FX3 #1')
  })
  it('ignores cancelled bookings, the booking itself, and different crew', () => {
    const cand = { start_at: '2026-11-01T06:30:00Z', end_at: '2026-11-01T09:30:00Z', crew: ['vik'], equipment: [] as string[] }
    expect(findConflicts(cand, [{ ...A, status: 'cancelled' }], crew)).toHaveLength(0)
    expect(findConflicts({ ...cand, excludeId: 'a' }, [A], crew)).toHaveLength(0)
    expect(findConflicts({ ...cand, crew: ['someone'] }, [A], crew)).toHaveLength(0)
  })
})

describe('CSV export', () => {
  it('quotes, escapes, and neutralises formulas', () => {
    const csv = toCSV([{ a: 'Hi, "there"', b: '=HYPERLINK("x")', c: -42, d: ['x', 'y'] }], [
      { header: 'A', value: (r) => r.a }, { header: 'B', value: (r) => r.b }, { header: 'C', value: (r) => r.c }, { header: 'D', value: (r) => r.d },
    ])
    expect(csv).toBe('A,B,C,D\r\n"Hi, ""there""","\'=HYPERLINK(""x"")",-42,x; y')
  })
})

describe('video links', () => {
  it('parses YouTube and Vimeo', () => {
    expect(parseVideoUrl('https://youtu.be/dQw4w9WgXcQ')?.embedUrl).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10')?.id).toBe('dQw4w9WgXcQ')
    expect(parseVideoUrl('https://youtube.com/shorts/abcDEF12345')?.id).toBe('abcDEF12345')
    expect(parseVideoUrl('https://vimeo.com/123456789')?.embedUrl).toBe('https://player.vimeo.com/video/123456789')
    expect(parseVideoUrl('http://youtu.be/dQw4w9WgXcQ')).toBeNull() // https only
    expect(parseVideoUrl('javascript:alert(1)')).toBeNull()
    expect(parseVideoUrl('https://example.com/reel.mp4')?.provider).toBe('other')
  })
  it('round-trips durations', () => {
    expect(parseDuration('1:30')).toBe(90)
    expect(parseDuration('45')).toBe(45)
    expect(Number.isNaN(parseDuration('1:75'))).toBe(true)
    expect(formatDuration(214)).toBe('3:34')
  })
})

describe('IST dates', () => {
  it('converts wall-clock IST to instants and back exactly', () => {
    expect(istInputToISO('2026-10-27T09:00')).toBe('2026-10-27T03:30:00.000Z')
    expect(isoToISTInput('2026-10-27T03:30:00.000Z')).toBe('2026-10-27T09:00')
    expect(dayKey('2026-10-26T19:00:00Z')).toBe('2026-10-27') // 00:30 IST next day
  })
  it('computes preset and previous ranges', () => {
    expect(presetRange('7d', '2026-10-26')).toEqual({ from: '2026-10-20', to: '2026-10-26' })
    expect(presetRange('month', '2026-10-26')).toEqual({ from: '2026-10-01', to: '2026-10-31' })
    expect(presetRange('year', '2026-02-10')).toEqual({ from: '2025-04-01', to: '2026-03-31' })
    expect(previousRange({ from: '2026-10-20', to: '2026-10-26' })).toEqual({ from: '2026-10-13', to: '2026-10-19' })
    expect(pctChange(24, 20)).toBe(20)
    expect(pctChange(5, 0)).toBeNull()
  })
})

describe('money & links', () => {
  it('formats rupees the Indian way', () => {
    expect(formatINR(245000, { whole: true })).toBe('₹2,45,000')
    expect(formatINRCompact(245000)).toBe('₹2.45L')
    expect(formatINRCompact(12500000)).toBe('₹1.25Cr')
    expect(round2(1.005)).toBe(1.01)
  })
  it('builds WhatsApp links for Indian numbers', () => {
    expect(whatsappLink('98400 12345')).toBe('https://wa.me/919840012345')
    expect(whatsappLink('+91 98400 12345', 'Hi')).toBe('https://wa.me/919840012345?text=Hi')
    expect(whatsappLink('123')).toBeNull()
  })
})

describe('reports', () => {
  const r = { from: '2026-10-01', to: '2026-10-31' }
  it('separates collected, invoiced, expenses and profit', () => {
    const inv = (o: Partial<Invoice>) => ({ status: 'sent', total: 0, balance_due: 0, issue_date: '2026-10-05', ...o }) as Invoice
    const s = financeSummary(
      [{ amount: 1000, paid_on: '2026-10-10' }, { amount: 500, paid_on: '2026-09-30' }] as Payment[],
      [inv({ total: 3000, balance_due: 2000 }), inv({ status: 'draft', total: 9999 }), inv({ status: 'void', total: 7777, balance_due: 7777 }), inv({ status: 'overdue', total: 400, balance_due: 400, issue_date: '2026-08-01' })],
      [{ amount: 300, spent_on: '2026-10-02' }] as Expense[], r)
    expect(s).toEqual({ collected: 1000, invoiced: 3000, expenses: 300, profit: 700, outstanding: 2400, overdue: 400 })
  })
  it('computes conversion and completion rates', () => {
    const e = (status: Enquiry['status']) => ({ status, enquiry_date: '2026-10-03' }) as Enquiry
    expect(conversionRate([e('converted'), e('lost'), e('new'), e('converted')], r)).toMatchObject({ total: 4, converted: 2, rate: 0.5 })
    const p = (status: Project['status'], delivery_date: string) => ({ status, delivery_date }) as Project
    expect(completionRate([p('delivered', '2026-10-10'), p('editing', '2026-10-20'), p('cancelled', '2026-10-21'), p('delivered', '2026-11-02')], r)).toMatchObject({ due: 2, delivered: 1, rate: 0.5 })
  })
  it('groups project statuses for the donut', () => {
    const p = (status: Project['status']) => ({ status }) as Project
    const b = projectStatusBreakdown([p('editing'), p('delivered'), p('planning'), p('on_hold'), p('cancelled')])
    expect(b.total).toBe(4)
    expect(b.groups.map((g) => g.value)).toEqual([1, 1, 1, 1])
  })
})
