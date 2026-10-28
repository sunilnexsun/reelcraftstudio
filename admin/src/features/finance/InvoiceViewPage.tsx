import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Ban, IndianRupee, MessageCircle, Pencil, Printer, Send, Trash } from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { EmptyState, LoadingBlock } from '@/components/ui/states'
import { useConfirm } from '@/components/ui/confirm'
import { usePageHeader } from '@/components/layout/PageMeta'
import { db } from '@/lib/data'
import { mutate, useTable } from '@/hooks/useData'
import { useLookups } from '@/hooks/useLookups'
import { useAuth } from '@/lib/auth'
import { canRecordPayments } from '@/lib/permissions'
import { INVOICE_STATUS, PAYMENT_METHOD } from '@/lib/labels'
import { fmtDate } from '@/lib/domain/dates'
import { formatINR } from '@/lib/domain/money'
import { whatsappLink } from '@/lib/utils'
import { PaymentForm } from './PaymentForm'

export default function InvoiceViewPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const confirm = useConfirm()
  const { role } = useAuth()
  const invoices = useTable('invoices')
  const items = useTable('invoice_items')
  const payments = useTable('payments')
  const settings = useTable('studio_settings')
  const { clientById, projectById } = useLookups()
  const [paying, setPaying] = useState(false)
  const inv = invoices.data.find((i) => i.id === id)
  usePageHeader({ title: inv?.invoice_number ?? 'Invoice', crumbs: [{ label: 'Invoices & Expenses', to: '/finance' }, { label: inv?.invoice_number ?? '…' }], showDateRange: false }, [inv?.invoice_number])

  if (invoices.loading && !inv) return <LoadingBlock rows={8} />
  if (!inv) return <EmptyState title="Invoice not found" action={<Button onClick={() => nav('/finance')}>Back to invoices</Button>} />

  const s = settings.data[0]
  const client = clientById.get(inv.client_id)
  const project = inv.project_id ? projectById.get(inv.project_id) : null
  const lines = items.data.filter((i) => i.invoice_id === inv.id).sort((a, b) => a.sort_order - b.sort_order)
  const pays = payments.data.filter((p) => p.invoice_id === inv.id).sort((a, b) => a.paid_on.localeCompare(b.paid_on))
  const writer = canRecordPayments(role)

  const act = async (fn: () => Promise<unknown>, ok: string) => { try { await mutate(fn, 'invoices'); toast.success(ok) } catch (e) { toast.error((e as Error).message) } }
  const voidIt = async () => { if (await confirm({ title: `Void ${inv.invoice_number}?`, description: 'A void invoice stays on record for audit but no longer counts as billed or outstanding. This cannot be reversed.', confirmLabel: 'Void invoice' })) void act(() => db.update('invoices', inv.id, { status: 'void' }), 'Invoice voided') }
  const remove = async () => {
    if (!(await confirm({ title: `Delete ${inv.invoice_number}?`, description: 'Only invoices without payments can be deleted. Consider voiding instead to keep your numbering continuous.' }))) return
    try { await mutate(() => db.remove('invoices', inv.id), 'invoices'); toast.success('Invoice deleted'); nav('/finance') } catch (e) { toast.error((e as Error).message) }
  }
  const wa = whatsappLink(client?.whatsapp ?? client?.phone, `Hi ${client?.name?.split(' ')[0] ?? ''}, here are the details of invoice ${inv.invoice_number} from ${s?.studio_name ?? 'ReelCraft Studio'}: total ${formatINR(inv.total)}, balance due ${formatINR(inv.balance_due)}${inv.due_date ? ` by ${fmtDate(inv.due_date)}` : ''}. Thank you!`)

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center gap-2">
        <StatusBadge value={inv.status} map={INVOICE_STATUS} />
        <div className="ml-auto flex flex-wrap gap-2">
          <Button icon={<Printer />} onClick={() => window.print()}>Print / Save PDF</Button>
          {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong px-4 text-sm font-semibold hover:bg-white/5"><MessageCircle className="size-4" />WhatsApp</a>}
          {writer && inv.status !== 'void' && <>
            {inv.status === 'draft' && <Button icon={<Send />} onClick={() => act(() => db.update('invoices', inv.id, { status: 'sent' }), 'Marked as sent')}>Mark sent</Button>}
            {inv.balance_due > 0 && inv.status !== 'draft' && <Button variant="primary" icon={<IndianRupee />} onClick={() => setPaying(true)}>Record payment</Button>}
            <Button icon={<Pencil />} onClick={() => nav(`/finance/invoices/${inv.id}/edit`)}>Edit</Button>
            <Button variant="ghost" icon={<Ban />} onClick={voidIt}>Void</Button>
            {!pays.length && <Button variant="ghost" className="text-red-400" icon={<Trash />} onClick={remove}>Delete</Button>}
          </>}
        </div>
      </div>

      {/* printable sheet: light paper look on screen and in print */}
      <Card className="print-sheet mx-auto max-w-4xl overflow-hidden bg-white text-neutral-900">
        <div className="relative p-6 sm:p-10">
          {inv.status === 'void' && <div className="pointer-events-none absolute inset-0 grid place-items-center text-[120px] font-black tracking-widest text-red-500/10 select-none">VOID</div>}
          <div className="flex flex-wrap items-start justify-between gap-6 border-b border-neutral-200 pb-6">
            <div>
              {s?.logo_url ? <img src={s.logo_url} alt="" className="mb-2 h-12 w-auto" /> : <p className="font-display text-2xl font-bold">Reel<span className="text-[#FF1744]">Craft</span> <span className="text-sm font-semibold tracking-[0.3em] text-neutral-500">STUDIO</span></p>}
              <p className="mt-1 text-sm whitespace-pre-line text-neutral-600">{[s?.studio_name, s?.address, [s?.phone, s?.email].filter(Boolean).join(' · '), s?.gstin && `GSTIN: ${s.gstin}`].filter(Boolean).join('\n')}</p>
            </div>
            <div className="text-right">
              <p className="font-display text-3xl font-bold tracking-tight">{inv.tax_rate > 0 ? 'TAX INVOICE' : 'INVOICE'}</p>
              <p className="mt-1 font-semibold tabular">{inv.invoice_number}</p>
              <p className="text-sm text-neutral-600">Issued {fmtDate(inv.issue_date)}{inv.due_date && <><br />Due {fmtDate(inv.due_date)}</>}</p>
            </div>
          </div>
          <div className="grid gap-6 py-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">Bill to</p>
              <p className="mt-1 font-semibold">{client?.business_name ?? client?.name}</p>
              <p className="text-sm whitespace-pre-line text-neutral-600">{[client?.business_name ? client.name : null, client?.address, client?.city, client?.phone, client?.email, client?.gstin && `GSTIN: ${client.gstin}`].filter(Boolean).join('\n')}</p>
            </div>
            {project && <div className="sm:text-right"><p className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">Project</p><p className="mt-1 font-semibold">{project.name}</p><p className="text-sm text-neutral-600">{project.code}</p></div>}
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-y border-neutral-200 text-left text-xs text-neutral-500 uppercase"><th className="py-2 pr-2">#</th><th className="py-2 pr-2">Description</th><th className="py-2 pr-2 text-right">Qty</th><th className="py-2 pr-2 text-right">Rate</th><th className="py-2 text-right">Amount</th></tr></thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={l.id} className="border-b border-neutral-100 align-top"><td className="py-2.5 pr-2 text-neutral-500">{i + 1}</td><td className="py-2.5 pr-2">{l.description}</td><td className="py-2.5 pr-2 text-right tabular">{l.quantity}</td><td className="py-2.5 pr-2 text-right tabular">{formatINR(l.unit_price)}</td><td className="py-2.5 text-right tabular">{formatINR(l.amount)}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 ml-auto w-full max-w-xs space-y-1.5 text-sm">
            <Line label="Subtotal" value={formatINR(inv.subtotal)} />
            {inv.discount_amount > 0 && <Line label={`Discount${inv.discount_type === 'percent' ? ` (${inv.discount_value}%)` : ''}`} value={`− ${formatINR(inv.discount_amount)}`} />}
            {inv.tax_rate > 0 && <Line label={`${inv.tax_label} @ ${inv.tax_rate}%`} value={formatINR(inv.tax_amount)} />}
            <div className="flex justify-between border-t border-neutral-300 pt-2 text-base font-bold"><span>Total</span><span className="tabular">{formatINR(inv.total)}</span></div>
            {inv.amount_paid > 0 && <Line label="Paid" value={`− ${formatINR(inv.amount_paid)}`} />}
            <div className="flex justify-between rounded-md bg-neutral-100 px-2 py-1.5 font-semibold"><span>Balance due</span><span className="tabular">{formatINR(inv.status === 'void' ? 0 : inv.balance_due)}</span></div>
          </div>
          {pays.length > 0 && (
            <div className="mt-8">
              <p className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">Payments received</p>
              <ul className="mt-2 space-y-1 text-sm text-neutral-700">{pays.map((p) => <li key={p.id} className="flex justify-between gap-4"><span>{fmtDate(p.paid_on)} · {PAYMENT_METHOD[p.method]}{p.reference ? ` · ${p.reference}` : ''}{p.is_advance ? ' · advance' : ''}</span><span className="tabular">{formatINR(p.amount)}</span></li>)}</ul>
            </div>
          )}
          {(inv.notes || inv.terms) && (
            <div className="mt-8 grid gap-4 border-t border-neutral-200 pt-6 text-sm text-neutral-600 sm:grid-cols-2">
              {inv.notes && <div><p className="mb-1 font-semibold text-neutral-800">Notes</p><p className="whitespace-pre-line">{inv.notes}</p></div>}
              {inv.terms && <div><p className="mb-1 font-semibold text-neutral-800">Terms</p><p className="whitespace-pre-line">{inv.terms}</p></div>}
            </div>
          )}
          <p className="mt-10 text-center text-xs text-neutral-400">Thank you for your business · {s?.website ?? ''}</p>
        </div>
      </Card>
      <PaymentForm open={paying} onClose={() => setPaying(false)} defaults={{ invoice_id: inv.id }} />
    </div>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-neutral-600"><span>{label}</span><span className="tabular">{value}</span></div>
}
