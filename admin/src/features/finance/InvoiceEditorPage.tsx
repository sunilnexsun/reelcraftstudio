import { useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Trash, Save, Send } from 'lucide-react'
import type { Invoice } from '@/types/db'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/field'
import { EmptyState, LoadingBlock } from '@/components/ui/states'
import { usePageHeader } from '@/components/layout/PageMeta'
import { db } from '@/lib/data'
import { mutate, useTable } from '@/hooks/useData'
import { useLookups } from '@/hooks/useLookups'
import { computeInvoiceTotals } from '@/lib/domain/invoice'
import { formatINR, round2 } from '@/lib/domain/money'
import { todayIST } from '@/lib/domain/dates'
import { addDays, format, parseISO } from 'date-fns'
import { date, dateReq, opt, str, toDate, toText } from '@/lib/validation'

const num = (label: string, opts: { min?: number; max?: number; gt0?: boolean } = {}) => z.string().trim().refine((v) => {
  const n = Number(v.replace(/,/g, ''))
  return v !== '' && Number.isFinite(n) && (opts.gt0 ? n > 0 : n >= (opts.min ?? 0)) && n <= (opts.max ?? 1e9) && /^\d+(\.\d{1,2})?$/.test(v.replace(/,/g, ''))
}, `${label} is invalid`)

const schema = z.object({
  invoice_number: z.string().trim().max(40).refine((v) => v === '' || /^[\w\-/]+$/.test(v), 'Letters, numbers, - and / only'),
  client_id: z.string().min(1, 'Choose a client'), project_id: z.string(), issue_date: dateReq, due_date: date,
  tax_label: z.string().trim().min(1).max(20), tax_rate: num('Tax rate', { max: 100 }), discount_type: z.enum(['flat', 'percent']), discount_value: num('Discount'),
  notes: opt(2000), terms: opt(2000),
  items: z.array(z.object({ id: z.string().optional(), description: z.string().trim().min(1, 'Describe the item').max(500), quantity: num('Qty', { gt0: true, max: 100000 }), unit_price: num('Rate') })).min(1, 'Add at least one line item'),
}).refine((v) => !v.due_date || v.due_date >= v.issue_date, { message: 'Due date must be on or after the issue date', path: ['due_date'] })
  .refine((v) => v.discount_type !== 'percent' || Number(v.discount_value) <= 100, { message: 'Max 100%', path: ['discount_value'] })
type Values = z.infer<typeof schema>

export default function InvoiceEditorPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const invoices = useTable('invoices')
  const items = useTable('invoice_items')
  const settings = useTable('studio_settings')
  const { clientOptions, projects, projectById, finByProject } = useLookups()
  const existing = id ? invoices.data.find((i) => i.id === id) : undefined
  const s = settings.data[0]
  usePageHeader({ title: existing ? `Edit ${existing.invoice_number}` : 'New invoice', crumbs: [{ label: 'Invoices & Expenses', to: '/finance' }, { label: existing ? existing.invoice_number : 'New invoice' }], showDateRange: false }, [existing?.id])

  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const ready = settings.ready && invoices.ready && items.ready
  useEffect(() => {
    if (!ready) return
    if (existing) {
      reset({
        invoice_number: existing.invoice_number, client_id: existing.client_id, project_id: str(existing.project_id), issue_date: existing.issue_date, due_date: str(existing.due_date),
        tax_label: existing.tax_label, tax_rate: String(existing.tax_rate), discount_type: existing.discount_type, discount_value: String(existing.discount_value),
        notes: str(existing.notes), terms: str(existing.terms),
        items: items.data.filter((i) => i.invoice_id === existing.id).sort((a, b) => a.sort_order - b.sort_order).map((i) => ({ id: i.id, description: i.description, quantity: String(i.quantity), unit_price: String(i.unit_price) })),
      })
    } else {
      const projectId = params.get('project') ?? ''
      const project = projectId ? projectById.get(projectId) : undefined
      const issue = todayIST()
      const budget = project ? finByProject.get(project.id)?.budget : undefined
      reset({
        invoice_number: '', client_id: params.get('client') ?? project?.client_id ?? '', project_id: projectId, issue_date: issue, due_date: format(addDays(parseISO(issue), 15), 'yyyy-MM-dd'),
        tax_label: s?.tax_label ?? 'GST', tax_rate: String(s?.default_tax_rate ?? 18), discount_type: 'flat', discount_value: '0', notes: '', terms: s?.invoice_terms ?? '',
        items: [{ description: project ? `${project.name}${project.service_label ? ' — ' + project.service_label : ''}` : '', quantity: '1', unit_price: budget ? String(budget) : '' }],
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, existing?.id])

  const v = watch()
  // computed every render: react-hook-form mutates the items array in place, so memoising on it goes stale
  const totals = computeInvoiceTotals(
    (v.items ?? []).map((i) => ({ quantity: Number(i.quantity) || 0, unit_price: Number(i.unit_price) || 0 })),
    v.discount_type ?? 'flat', Number(v.discount_value) || 0, Number(v.tax_rate) || 0, existing?.amount_paid ?? 0,
  )
  const clientProjects = projects.filter((p) => !v.client_id || p.client_id === v.client_id).map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }))

  const save = (status: Invoice['status']) => handleSubmit(async (f) => {
    const header = {
      client_id: f.client_id, project_id: f.project_id || null, issue_date: f.issue_date, due_date: toDate(f.due_date),
      tax_label: f.tax_label.trim(), tax_rate: Number(f.tax_rate), discount_type: f.discount_type, discount_value: Number(f.discount_value),
      notes: toText(f.notes), terms: toText(f.terms), status: existing && existing.status !== 'draft' && status === 'draft' ? existing.status : status,
      ...(f.invoice_number.trim() ? { invoice_number: f.invoice_number.trim() } : {}),
    }
    try {
      const saved = await mutate(async () => {
        const inv = existing ? await db.update('invoices', existing.id, header) : await db.insert('invoices', { ...header, invoice_number: f.invoice_number.trim() })
        const before = items.data.filter((i) => i.invoice_id === inv.id)
        const keep = new Set(f.items.map((i) => i.id).filter(Boolean))
        for (const old of before) if (!keep.has(old.id)) await db.remove('invoice_items', old.id)
        for (const [k, it] of f.items.entries()) {
          const row = { invoice_id: inv.id, description: it.description.trim(), quantity: Number(it.quantity), unit_price: round2(Number(it.unit_price)), sort_order: k }
          if (it.id) await db.update('invoice_items', it.id, row)
          else await db.insert('invoice_items', row)
        }
        return inv
      }, 'invoices', 'invoice_items')
      toast.success(existing ? 'Invoice saved' : `Invoice ${saved.invoice_number} created`)
      nav(`/finance/invoices/${saved.id}`, { replace: true })
    } catch (e) { toast.error((e as Error).message) }
  })()

  if (!ready) return <LoadingBlock rows={8} />
  if (id && !existing) return <EmptyState title="Invoice not found" action={<Button onClick={() => nav('/finance')}>Back</Button>} />
  if (existing?.status === 'void') return <EmptyState title="Void invoices can't be edited" action={<Button onClick={() => nav(`/finance/invoices/${existing.id}`)}>View invoice</Button>} />

  return (
    <form onSubmit={(e) => { e.preventDefault(); void save('draft') }} className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]" noValidate>
      <div className="min-w-0 space-y-5">
        <Card className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <Select label="Client" required options={clientOptions} placeholder="Select client" {...register('client_id', { onChange: () => setValue('project_id', '') })} error={errors.client_id?.message} />
          <Select label="Project" options={clientProjects} placeholder="Not linked to a project" {...register('project_id')} />
          <Input label="Invoice number" placeholder={existing ? '' : `Auto (${s?.invoice_prefix ?? 'RC-'}${todayIST().slice(2, 4)}-${String(s?.next_invoice_number ?? 1).padStart(4, '0')})`} {...register('invoice_number')} error={errors.invoice_number?.message} help={existing ? undefined : 'Leave blank to use the next number in sequence'} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Issue date" type="date" required {...register('issue_date')} error={errors.issue_date?.message} />
            <Input label="Due date" type="date" {...register('due_date')} error={errors.due_date?.message} />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between px-5 pt-5 sm:px-6"><h2 className="font-display text-lg font-semibold">Line items</h2></div>
          <div className="scroll-x px-2 py-3 sm:px-4">
            <table className="w-full min-w-[560px]">
              <thead><tr className="text-left text-xs text-muted"><th className="px-2 pb-2 font-medium">Description</th><th className="w-20 px-2 pb-2 font-medium">Qty</th><th className="w-32 px-2 pb-2 font-medium">Rate (₹)</th><th className="w-32 px-2 pb-2 text-right font-medium">Amount</th><th className="w-10" /></tr></thead>
              <tbody>
                {fields.map((f, i) => {
                  const amt = round2((Number(v.items?.[i]?.quantity) || 0) * (Number(v.items?.[i]?.unit_price) || 0))
                  const err = errors.items?.[i]
                  return (
                    <tr key={f.id} className="align-top">
                      <td className="px-2 py-1.5"><input className="input" aria-label={`Item ${i + 1} description`} aria-invalid={!!err?.description || undefined} {...register(`items.${i}.description`)} placeholder="Promo film (45s) — shoot + edit" />{err?.description && <p className="mt-1 text-xs text-red-400">{err.description.message}</p>}</td>
                      <td className="px-2 py-1.5"><input className="input text-right tabular" inputMode="decimal" aria-label={`Item ${i + 1} quantity`} aria-invalid={!!err?.quantity || undefined} {...register(`items.${i}.quantity`)} /></td>
                      <td className="px-2 py-1.5"><input className="input text-right tabular" inputMode="decimal" aria-label={`Item ${i + 1} rate`} aria-invalid={!!err?.unit_price || undefined} {...register(`items.${i}.unit_price`)} /></td>
                      <td className="px-2 py-3.5 text-right text-sm tabular">{formatINR(amt)}</td>
                      <td className="py-1.5"><Button variant="ghost" size="icon" aria-label={`Remove item ${i + 1}`} disabled={fields.length === 1} onClick={() => remove(i)}><Trash /></Button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {errors.items?.root && <p className="px-2 text-xs text-red-400">{errors.items.root.message}</p>}
            <Button className="mt-2 ml-2" size="sm" variant="outline" icon={<Plus />} onClick={() => append({ description: '', quantity: '1', unit_price: '' })}>Add line</Button>
          </div>
        </Card>

        <Card className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <Textarea label="Notes to client" rows={3} {...register('notes')} placeholder="Thank you for choosing ReelCraft Studio!" />
          <Textarea label="Payment terms" rows={3} {...register('terms')} />
        </Card>
      </div>

      <div className="space-y-5">
        <Card className="space-y-4 p-5 xl:sticky xl:top-4">
          <h2 className="font-display text-lg font-semibold">Tax & discount</h2>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Tax label" {...register('tax_label')} error={errors.tax_label?.message} />
            <Input label="Tax rate (%)" inputMode="decimal" {...register('tax_rate')} error={errors.tax_rate?.message} />
            <Select label="Discount" options={[{ value: 'flat', label: '₹ amount' }, { value: 'percent', label: '% of subtotal' }]} {...register('discount_type')} />
            <Input label={v.discount_type === 'percent' ? 'Discount (%)' : 'Discount (₹)'} inputMode="decimal" {...register('discount_value')} error={errors.discount_value?.message} />
          </div>
          <dl className="space-y-2 border-t border-line pt-4 text-sm">
            <Row label="Subtotal" value={formatINR(totals.subtotal)} />
            {totals.discount_amount > 0 && <Row label="Discount" value={`− ${formatINR(totals.discount_amount)}`} />}
            <Row label={`${v.tax_label || 'Tax'} @ ${Number(v.tax_rate) || 0}%`} value={formatINR(totals.tax_amount)} />
            <Row label={<span className="font-semibold text-fg">Total</span>} value={<span className="font-display text-xl font-bold text-fg">{formatINR(totals.total)}</span>} />
            {existing && existing.amount_paid > 0 && <>
              <Row label="Already paid" value={formatINR(existing.amount_paid)} />
              <Row label="Balance due" value={<span className={totals.total < existing.amount_paid ? 'text-red-400' : 'text-amber-300'}>{formatINR(totals.balance_due)}</span>} />
              {totals.total < existing.amount_paid && <p className="text-xs text-red-400">The new total is lower than what has already been paid.</p>}
            </>}
          </dl>
          <p className="text-xs text-muted">Totals are recalculated by the database on save.</p>
          <div className="flex flex-col gap-2">
            {(!existing || existing.status === 'draft') && <Button type="button" variant="primary" icon={<Send />} loading={isSubmitting} onClick={() => save('sent')}>Save & mark as sent</Button>}
            <Button type="submit" icon={<Save />} loading={isSubmitting} variant={existing && existing.status !== 'draft' ? 'primary' : 'secondary'}>{existing && existing.status !== 'draft' ? 'Save changes' : 'Save as draft'}</Button>
            <Button type="button" variant="ghost" onClick={() => nav(-1)}>Cancel</Button>
          </div>
        </Card>
      </div>
    </form>
  )
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return <div className="flex items-baseline justify-between gap-3"><dt className="text-muted">{label}</dt><dd className="tabular">{value}</dd></div>
}
