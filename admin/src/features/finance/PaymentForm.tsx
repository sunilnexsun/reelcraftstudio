import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import type { Payment } from '@/types/db'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox, Input, Select, Textarea } from '@/components/ui/field'
import { db } from '@/lib/data'
import { mutate, useTable } from '@/hooks/useData'
import { useLookups } from '@/hooks/useLookups'
import { PAYMENT_METHOD, enumOptions } from '@/lib/labels'
import { formatINR } from '@/lib/domain/money'
import { todayIST } from '@/lib/domain/dates'
import { dateReq, moneyReq, opt, str, toMoney, toText } from '@/lib/validation'

const schema = z.object({
  invoice_id: z.string(), project_id: z.string(), amount: moneyReq, paid_on: dateReq, method: z.string(),
  reference: opt(120), is_advance: z.boolean(), notes: opt(1000),
}).refine((v) => v.invoice_id || v.project_id, { message: 'Link the payment to an invoice or a project', path: ['invoice_id'] })
type Values = z.infer<typeof schema>

export function PaymentForm({ open, onClose, payment, defaults }: {
  open: boolean; onClose: () => void; payment?: Payment | null; defaults?: { invoice_id?: string; project_id?: string; is_advance?: boolean }
}) {
  const invoices = useTable('invoices', open)
  const payments = useTable('payments', open)
  const { projectOptions, clientName } = useLookups()
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!open) return
    reset({
      invoice_id: str(payment?.invoice_id ?? defaults?.invoice_id), project_id: str(payment?.project_id ?? defaults?.project_id),
      amount: str(payment?.amount), paid_on: payment?.paid_on ?? todayIST(), method: payment?.method ?? 'upi', reference: str(payment?.reference),
      is_advance: payment?.is_advance ?? defaults?.is_advance ?? false, notes: str(payment?.notes),
    })
  }, [open, payment, defaults?.invoice_id, defaults?.project_id, defaults?.is_advance, reset])

  const invoiceId = watch('invoice_id')
  const isAdvance = watch('is_advance')
  const inv = invoices.data.find((i) => i.id === invoiceId)
  // balance excluding this payment when editing
  const balance = inv ? Math.max(inv.total - payments.data.filter((p) => p.invoice_id === inv.id && p.id !== payment?.id).reduce((s, p) => s + p.amount, 0), 0) : null
  const invoiceOptions = useMemo(() => invoices.data
    .filter((i) => i.status !== 'void' && (i.balance_due > 0 || i.id === payment?.invoice_id || i.id === defaults?.invoice_id))
    .sort((a, b) => b.issue_date.localeCompare(a.issue_date))
    .map((i) => ({ value: i.id, label: `${i.invoice_number} · ${clientName(i.client_id)} · ${formatINR(i.balance_due)} due` })), [invoices.data, payment?.invoice_id, defaults?.invoice_id, clientName])

  useEffect(() => { if (inv?.project_id) setValue('project_id', inv.project_id) }, [inv?.project_id, setValue])

  const submit = handleSubmit(async (v) => {
    const amount = toMoney(v.amount)!
    if (balance != null && amount > balance + 0.001) { toast.error(`Amount exceeds the invoice balance of ${formatINR(balance)}`); return }
    const payload = {
      invoice_id: v.invoice_id || null, project_id: v.project_id || null, amount, paid_on: v.paid_on, method: v.method as Payment['method'],
      reference: toText(v.reference), is_advance: v.is_advance, notes: toText(v.notes),
    }
    try {
      await mutate(() => (payment ? db.update('payments', payment.id, payload) : db.insert('payments', payload)), 'payments')
      toast.success(payment ? 'Payment updated' : `${v.is_advance ? 'Advance' : 'Payment'} of ${formatINR(amount)} recorded`)
      onClose()
    } catch (e) { toast.error((e as Error).message) }
  })

  return (
    <Dialog open={open} onClose={onClose} title={payment ? 'Edit payment' : isAdvance ? 'Record advance' : 'Record payment'}
      description="Invoice status, balances and project dues update automatically."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={isSubmitting} onClick={submit}>Save payment</Button></>}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Select label="Invoice" options={invoiceOptions} placeholder="Not against an invoice" {...register('invoice_id')} error={errors.invoice_id?.message} wrapClassName="sm:col-span-2"
          help={inv ? <>Invoice total {formatINR(inv.total)} · balance <strong className="text-fg">{formatINR(balance)}</strong></> : 'Advances taken before invoicing can be linked to just the project.'} />
        <Select label="Project" options={projectOptions} placeholder="No project" {...register('project_id')} wrapClassName="sm:col-span-2" />
        <Input label="Amount (₹)" required inputMode="decimal" autoFocus {...register('amount')} error={errors.amount?.message} />
        <Input label="Paid on" type="date" required max={todayIST()} {...register('paid_on')} error={errors.paid_on?.message} />
        <Select label="Method" options={enumOptions(PAYMENT_METHOD)} {...register('method')} />
        <Input label="Reference / UTR" {...register('reference')} placeholder="UPI ref, cheque no." />
        <div className="sm:col-span-2"><Checkbox checked={!!isAdvance} onChange={(v) => setValue('is_advance', v)} label="This is an advance payment (counts toward the project's advance)" /></div>
        <Textarea label="Notes" rows={2} {...register('notes')} wrapClassName="sm:col-span-2" />
        <button type="submit" hidden />
      </form>
    </Dialog>
  )
}
