import type { DiscountType, InvoiceStatus } from '@/types/db'
import { round2 } from './money'

export interface LineInput { quantity: number; unit_price: number }
export interface InvoiceTotals {
  subtotal: number; discount_amount: number; tax_amount: number; total: number
  amount_paid: number; balance_due: number
}

/** Same arithmetic as public.compute_invoice() in the database. */
export function computeInvoiceTotals(
  items: LineInput[], discountType: DiscountType, discountValue: number, taxRate: number, amountPaid = 0,
): InvoiceTotals {
  const subtotal = round2(items.reduce((s, i) => s + round2((Number(i.quantity) || 0) * (Number(i.unit_price) || 0)), 0))
  const dv = Math.max(Number(discountValue) || 0, 0)
  const discount_amount = discountType === 'percent' ? round2((subtotal * Math.min(dv, 100)) / 100) : Math.min(dv, subtotal)
  const taxable = round2(subtotal - discount_amount)
  const tax_amount = round2((taxable * (Number(taxRate) || 0)) / 100)
  const total = round2(taxable + tax_amount)
  const amount_paid = round2(amountPaid)
  return { subtotal, discount_amount, tax_amount, total, amount_paid, balance_due: Math.max(round2(total - amount_paid), 0) }
}

/** Same status rules as public.compute_invoice(). `today` is 'YYYY-MM-DD' in Asia/Kolkata. */
export function deriveInvoiceStatus(
  current: InvoiceStatus, total: number, paid: number, dueDate: string | null, today: string,
): InvoiceStatus {
  if (current === 'void') return 'void'
  let s: InvoiceStatus = current
  if (total > 0 && paid >= total) s = 'paid'
  else if (paid > 0) s = 'partially_paid'
  else if (s === 'paid' || s === 'partially_paid') s = 'sent'
  const balance = Math.max(total - paid, 0)
  if ((s === 'sent' || s === 'partially_paid') && dueDate && dueDate < today && balance > 0) s = 'overdue'
  else if (s === 'overdue' && (!dueDate || dueDate >= today)) s = paid > 0 ? 'partially_paid' : 'sent'
  return s
}

/** Throws the same message the database raises when a payment would exceed the invoice total. */
export function assertPaymentFits(total: number, otherPayments: number, amount: number) {
  if (amount <= 0) throw new Error('Payment amount must be greater than zero')
  if (round2(otherPayments + amount) > round2(total)) {
    throw new Error(`Payment of ${amount.toFixed(2)} exceeds the invoice balance of ${Math.max(round2(total - otherPayments), 0).toFixed(2)}`)
  }
}
