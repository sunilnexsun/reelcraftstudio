import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { EllipsisVertical, Paperclip, Pencil, Plus, ReceiptIndianRupee, Trash, Wallet, IndianRupee } from 'lucide-react'
import { toast } from 'sonner'
import type { Expense, Invoice, Payment } from '@/types/db'
import { Card, Stat } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Menu } from '@/components/ui/menu'
import { Tabs } from '@/components/ui/segmented'
import { EmptyState } from '@/components/ui/states'
import { useConfirm } from '@/components/ui/confirm'
import { DataTable, ExportButton, FilterSelect, SearchInput, Toolbar, type Column } from '@/components/tables/DataTable'
import { usePageHeader } from '@/components/layout/PageMeta'
import { db } from '@/lib/data'
import { mutate, useTable } from '@/hooks/useData'
import { useLookups } from '@/hooks/useLookups'
import { useDateRange } from '@/hooks/useDateRange'
import { useAuth } from '@/lib/auth'
import { canRecordPayments } from '@/lib/permissions'
import { INVOICE_STATUS, PAYMENT_METHOD, enumOptions } from '@/lib/labels'
import { fmtDate, inRange, rangeLabel, todayIST } from '@/lib/domain/dates'
import { formatINR } from '@/lib/domain/money'
import { financeSummary } from '@/lib/domain/reports'
import { downloadCSV } from '@/lib/domain/csv'
import { matches } from '@/lib/utils'
import { PaymentForm } from './PaymentForm'
import { ExpenseForm } from './ExpenseForm'

type Tab = 'invoices' | 'payments' | 'expenses'

export default function FinancePage() {
  usePageHeader({ subtitle: 'Invoices, payments received and business expenses.' })
  const { role } = useAuth()
  const nav = useNavigate()
  const confirm = useConfirm()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'invoices'
  const setTab = (t: Tab) => setParams({ tab: t }, { replace: true })
  const { range } = useDateRange()
  const invoices = useTable('invoices')
  const payments = useTable('payments')
  const expenses = useTable('expenses')
  const { clientName, projectById } = useLookups()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [payForm, setPayForm] = useState<Payment | null | undefined>(undefined)
  const [expForm, setExpForm] = useState<Expense | null | undefined>(undefined)
  const writer = canRecordPayments(role)
  const sum = useMemo(() => financeSummary(payments.data, invoices.data, expenses.data, range), [payments.data, invoices.data, expenses.data, range])
  const today = todayIST()

  const invRows = invoices.data.filter((i) => (!status || i.status === status) && matches(q, i.invoice_number, clientName(i.client_id), i.project_id ? projectById.get(i.project_id)?.name : ''))
  const payRows = payments.data.filter((p) => inRange(p.paid_on, range) && matches(q, p.reference, clientName(p.client_id), invoices.data.find((i) => i.id === p.invoice_id)?.invoice_number))
  const expRows = expenses.data.filter((x) => inRange(x.spent_on, range) && (!category || x.category === category) && matches(q, x.description, x.vendor, x.category))
  const categories = [...new Set(expenses.data.map((x) => x.category))].sort().map((c) => ({ value: c, label: c }))

  const delPayment = async (p: Payment) => {
    if (!(await confirm({ title: 'Delete this payment?', description: `${formatINR(p.amount)} on ${fmtDate(p.paid_on)}. The invoice balance and project dues will be recalculated.` }))) return
    try { await mutate(() => db.remove('payments', p.id), 'payments'); toast.success('Payment deleted') } catch (e) { toast.error((e as Error).message) }
  }
  const delExpense = async (x: Expense) => {
    if (!(await confirm({ title: 'Delete this expense?', description: `${x.description} — ${formatINR(x.amount)}` }))) return
    try { await mutate(() => db.remove('expenses', x.id), 'expenses'); toast.success('Expense deleted') } catch (e) { toast.error((e as Error).message) }
  }
  const openReceipt = async (x: Expense) => {
    try { const url = await db.fileUrl('receipts', x.receipt_path!); window.open(url, '_blank', 'noopener') } catch (e) { toast.error((e as Error).message) }
  }

  const invCols: Column<Invoice>[] = [
    { key: 'no', header: 'Invoice', sort: (i) => i.invoice_number, cell: (i) => <span className="font-semibold tabular text-fg">{i.invoice_number}</span> },
    { key: 'client', header: 'Client', sort: (i) => clientName(i.client_id), cell: (i) => <div className="min-w-0"><p className="truncate">{clientName(i.client_id)}</p>{i.project_id && <p className="truncate text-xs text-muted">{projectById.get(i.project_id)?.name}</p>}</div> },
    { key: 'issued', header: 'Issued', sort: (i) => i.issue_date, cell: (i) => <span className="tabular whitespace-nowrap">{fmtDate(i.issue_date)}</span>, hideBelow: 'md' },
    { key: 'due', header: 'Due', sort: (i) => i.due_date, hideBelow: 'lg', cell: (i) => <span className={`tabular whitespace-nowrap ${i.status === 'overdue' ? 'font-semibold text-red-400' : ''}`}>{fmtDate(i.due_date)}</span> },
    { key: 'total', header: 'Total', sort: (i) => i.total, cell: (i) => <span className="tabular">{formatINR(i.total)}</span>, className: 'text-right', headerClassName: 'text-right' },
    { key: 'balance', header: 'Balance', sort: (i) => (i.status === 'void' ? 0 : i.balance_due), className: 'text-right', headerClassName: 'text-right', hideBelow: 'sm', cell: (i) => <span className={`tabular ${i.balance_due > 0 && i.status !== 'void' && i.status !== 'draft' ? 'font-semibold text-amber-300' : 'text-muted'}`}>{i.status === 'void' ? '—' : formatINR(i.balance_due)}</span> },
    { key: 'status', header: 'Status', sort: (i) => i.status, cell: (i) => <StatusBadge value={i.status} map={INVOICE_STATUS} /> },
  ]
  const payCols: Column<Payment>[] = [
    { key: 'date', header: 'Date', sort: (p) => p.paid_on, cell: (p) => <span className="tabular whitespace-nowrap">{fmtDate(p.paid_on)}</span> },
    { key: 'client', header: 'Client', sort: (p) => clientName(p.client_id), cell: (p) => clientName(p.client_id) },
    { key: 'for', header: 'Against', hideBelow: 'md', cell: (p) => <span className="text-muted">{p.invoice_id ? invoices.data.find((i) => i.id === p.invoice_id)?.invoice_number : projectById.get(p.project_id ?? '')?.code ?? '—'}{p.is_advance && <Badge tone="cyan" className="ml-2">Advance</Badge>}</span> },
    { key: 'method', header: 'Method', hideBelow: 'lg', cell: (p) => <span>{PAYMENT_METHOD[p.method]}{p.reference && <span className="block text-xs text-muted">{p.reference}</span>}</span> },
    { key: 'amount', header: 'Amount', sort: (p) => p.amount, className: 'text-right', headerClassName: 'text-right', cell: (p) => <span className="font-semibold text-emerald-400 tabular">{formatINR(p.amount)}</span> },
    ...(writer ? [{ key: 'act', header: <span className="sr-only">Actions</span>, className: 'w-px', cell: (p: Payment) => <Menu label="Payment actions" items={[{ label: 'Edit', icon: <Pencil />, onSelect: () => setPayForm(p) }, { label: 'Delete', icon: <Trash />, danger: true, onSelect: () => delPayment(p) }]} trigger={(t) => <Button {...t} size="icon-sm" variant="ghost" aria-label="Payment actions"><EllipsisVertical /></Button>} /> }] : []),
  ]
  const expCols: Column<Expense>[] = [
    { key: 'date', header: 'Date', sort: (x) => x.spent_on, cell: (x) => <span className="tabular whitespace-nowrap">{fmtDate(x.spent_on)}</span> },
    { key: 'desc', header: 'Description', sort: (x) => x.description, cell: (x) => <div className="min-w-0"><p className="truncate">{x.description}</p><p className="truncate text-xs text-muted">{[x.vendor, x.project_id && projectById.get(x.project_id)?.code].filter(Boolean).join(' · ')}</p></div> },
    { key: 'cat', header: 'Category', sort: (x) => x.category, cell: (x) => <Badge>{x.category}</Badge>, hideBelow: 'md' },
    { key: 'method', header: 'Paid via', cell: (x) => PAYMENT_METHOD[x.payment_method], hideBelow: 'lg' },
    { key: 'amount', header: 'Amount', sort: (x) => x.amount, className: 'text-right', headerClassName: 'text-right', cell: (x) => <span className="font-semibold tabular">{formatINR(x.amount)}</span> },
    { key: 'act', header: <span className="sr-only">Actions</span>, className: 'w-px', cell: (x) => (
      <div className="flex items-center justify-end gap-1">
        {x.receipt_path && <Button size="icon-sm" variant="ghost" aria-label="Open receipt" onClick={() => openReceipt(x)}><Paperclip /></Button>}
        {writer && <Menu label="Expense actions" items={[{ label: 'Edit', icon: <Pencil />, onSelect: () => setExpForm(x) }, { label: 'Delete', icon: <Trash />, danger: true, onSelect: () => delExpense(x) }]} trigger={(t) => <Button {...t} size="icon-sm" variant="ghost" aria-label="Expense actions"><EllipsisVertical /></Button>} />}
      </div>
    ) },
  ]

  const exportCsv = () => {
    if (tab === 'invoices') downloadCSV(`invoices-${today}`, invRows, [
      { header: 'Invoice', value: (i) => i.invoice_number }, { header: 'Client', value: (i) => clientName(i.client_id) }, { header: 'Project', value: (i) => (i.project_id ? projectById.get(i.project_id)?.name : '') },
      { header: 'Issue date', value: (i) => i.issue_date }, { header: 'Due date', value: (i) => i.due_date }, { header: 'Subtotal', value: (i) => i.subtotal }, { header: 'Discount', value: (i) => i.discount_amount },
      { header: 'Tax', value: (i) => i.tax_amount }, { header: 'Total', value: (i) => i.total }, { header: 'Paid', value: (i) => i.amount_paid }, { header: 'Balance', value: (i) => i.balance_due }, { header: 'Status', value: (i) => INVOICE_STATUS[i.status].label },
    ])
    if (tab === 'payments') downloadCSV(`payments-${range.from}-to-${range.to}`, payRows, [
      { header: 'Date', value: (p) => p.paid_on }, { header: 'Client', value: (p) => clientName(p.client_id) }, { header: 'Invoice', value: (p) => invoices.data.find((i) => i.id === p.invoice_id)?.invoice_number },
      { header: 'Project', value: (p) => projectById.get(p.project_id ?? '')?.code }, { header: 'Advance', value: (p) => (p.is_advance ? 'Yes' : 'No') }, { header: 'Method', value: (p) => PAYMENT_METHOD[p.method] },
      { header: 'Reference', value: (p) => p.reference }, { header: 'Amount', value: (p) => p.amount },
    ])
    if (tab === 'expenses') downloadCSV(`expenses-${range.from}-to-${range.to}`, expRows, [
      { header: 'Date', value: (x) => x.spent_on }, { header: 'Category', value: (x) => x.category }, { header: 'Description', value: (x) => x.description }, { header: 'Vendor', value: (x) => x.vendor },
      { header: 'Project', value: (x) => projectById.get(x.project_id ?? '')?.code }, { header: 'Paid via', value: (x) => PAYMENT_METHOD[x.payment_method] }, { header: 'Amount', value: (x) => x.amount },
    ])
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Collected" value={formatINR(sum.collected, { whole: true })} tone="green" hint="Payments received in period" />
        <Stat label="Invoiced" value={formatINR(sum.invoiced, { whole: true })} hint="Issued in period (excl. drafts)" />
        <Stat label="Expenses" value={formatINR(sum.expenses, { whole: true })} hint="Spent in period" />
        <Stat label="Outstanding" value={formatINR(sum.outstanding, { whole: true })} tone={sum.outstanding ? 'amber' : undefined} hint="All open invoices, today" />
        <Stat label="Overdue" value={formatINR(sum.overdue, { whole: true })} tone={sum.overdue ? 'red' : undefined} hint="Past due date" />
      </div>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-2 sm:px-5">
          <Tabs<Tab> value={tab} onChange={(t) => { setTab(t); setQ('') }} className="border-0" tabs={[
            { value: 'invoices', label: 'Invoices', count: invoices.data.length }, { value: 'payments', label: 'Payments', count: payRows.length }, { value: 'expenses', label: 'Expenses', count: expRows.length },
          ]} />
          {writer && <div className="flex gap-2 py-2">
            {tab === 'invoices' && <Button variant="primary" icon={<Plus />} onClick={() => nav('/finance/invoices/new')}>New invoice</Button>}
            {tab === 'payments' && <Button variant="primary" icon={<IndianRupee />} onClick={() => setPayForm(null)}>Record payment</Button>}
            {tab === 'expenses' && <Button variant="primary" icon={<Plus />} onClick={() => setExpForm(null)}>Record expense</Button>}
          </div>}
        </div>
        <Toolbar className="border-t">
          <SearchInput value={q} onChange={setQ} placeholder={tab === 'expenses' ? 'Search description, vendor…' : 'Search invoice no., client…'} />
          {tab === 'invoices' && <FilterSelect label="Status" value={status} onChange={setStatus} options={enumOptions(INVOICE_STATUS)} />}
          {tab === 'expenses' && <FilterSelect label="Category" value={category} onChange={setCategory} options={categories} />}
          {tab !== 'invoices' && <span className="text-xs text-muted">{rangeLabel(range)} · change with the date picker above</span>}
          <ExportButton onClick={exportCsv} />
        </Toolbar>
        {tab === 'invoices' && <DataTable rows={invRows} columns={invCols} rowKey={(i) => i.id} onRowClick={(i) => nav(`/finance/invoices/${i.id}`)} loading={invoices.loading} error={invoices.error?.message} onRetry={invoices.refetch} initialSort={{ key: 'issued', dir: 'desc' }} minWidth={560}
          rowClassName={(i) => (i.status === 'void' ? 'opacity-50' : undefined)}
          empty={<EmptyState icon={<ReceiptIndianRupee />} title={invoices.data.length ? 'No invoices match' : 'No invoices yet'} description={invoices.data.length ? undefined : 'Create your first invoice from a project or here.'} />} />}
        {tab === 'payments' && <DataTable rows={payRows} columns={payCols} rowKey={(p) => p.id} loading={payments.loading} error={payments.error?.message} onRetry={payments.refetch} initialSort={{ key: 'date', dir: 'desc' }} minWidth={520}
          empty={<EmptyState icon={<IndianRupee />} title="No payments in this period" description="Try a wider date range." />} />}
        {tab === 'expenses' && <DataTable rows={expRows} columns={expCols} rowKey={(x) => x.id} loading={expenses.loading} error={expenses.error?.message} onRetry={expenses.refetch} initialSort={{ key: 'date', dir: 'desc' }} minWidth={520}
          empty={<EmptyState icon={<Wallet />} title="No expenses in this period" description="Try a wider date range, or record an expense." />} />}
      </Card>
      <PaymentForm open={payForm !== undefined} payment={payForm} onClose={() => setPayForm(undefined)} />
      <ExpenseForm open={expForm !== undefined} expense={expForm} onClose={() => setExpForm(undefined)} />
    </div>
  )
}
