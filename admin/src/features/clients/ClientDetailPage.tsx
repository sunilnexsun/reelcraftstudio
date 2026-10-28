import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CalendarDays, MessageSquare, Pencil, Trash, Briefcase, ReceiptIndianRupee, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { Card, DetailRow, Stat } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Tabs } from '@/components/ui/segmented'
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/states'
import { useConfirm } from '@/components/ui/confirm'
import { ContactLinks } from '@/components/ContactLinks'
import { usePageHeader } from '@/components/layout/PageMeta'
import { db } from '@/lib/data'
import { mutate, useTable } from '@/hooks/useData'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { BOOKING_STATUS, CLIENT_TYPE, ENQUIRY_STATUS, INVOICE_STATUS, PROJECT_STATUS, PAYMENT_METHOD } from '@/lib/labels'
import { fmtDate, fmtDateTime } from '@/lib/domain/dates'
import { formatINR, sum } from '@/lib/domain/money'
import { ClientForm } from './ClientForm'

type Tab = 'projects' | 'invoices' | 'bookings' | 'history'

export default function ClientDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const confirm = useConfirm()
  const { role } = useAuth()
  const finance = can(role, 'finance')
  const clients = useTable('clients')
  const projects = useTable('projects')
  const invoices = useTable('invoices', finance)
  const payments = useTable('payments', finance)
  const bookings = useTable('bookings')
  const enquiries = useTable('enquiries', can(role, 'enquiries'))
  const followups = useTable('enquiry_followups', can(role, 'enquiries'))
  const [tab, setTab] = useState<Tab>('projects')
  const [editing, setEditing] = useState(false)
  const client = clients.data.find((c) => c.id === id)
  usePageHeader({ title: client ? (client.business_name ?? client.name) : 'Client', subtitle: client ? `${CLIENT_TYPE[client.client_type]}${client.city ? ' · ' + client.city : ''}` : undefined, crumbs: [{ label: 'Clients', to: '/clients' }, { label: client?.business_name ?? client?.name ?? '…' }], showDateRange: false }, [client?.id, client?.name, client?.business_name, client?.city])

  const mine = useMemo(() => {
    const ps = projects.data.filter((p) => p.client_id === id)
    const inv = invoices.data.filter((i) => i.client_id === id)
    const billable = inv.filter((i) => i.status !== 'void' && i.status !== 'draft')
    const pays = payments.data.filter((p) => p.client_id === id)
    const bks = bookings.data.filter((b) => b.client_id === id)
    const enq = enquiries.data.filter((e) => e.client_id === id)
    const enqIds = new Set(enq.map((e) => e.id))
    const fus = followups.data.filter((f) => enqIds.has(f.enquiry_id))
    return { ps, inv, pays, bks, enq, fus, billed: sum(billable, (i) => i.total), paid: sum(pays, (p) => p.amount), outstanding: sum(billable, (i) => i.balance_due) }
  }, [id, projects.data, invoices.data, payments.data, bookings.data, enquiries.data, followups.data])

  if (clients.loading && !client) return <LoadingBlock rows={8} />
  if (clients.error) return <ErrorState message={clients.error.message} onRetry={clients.refetch} />
  if (!client) return <EmptyState title="Client not found" description="It may have been deleted." action={<Button onClick={() => nav('/clients')}>Back to clients</Button>} />

  const remove = async () => {
    if (!(await confirm({ title: `Delete ${client.business_name ?? client.name}?`, description: 'Projects, bookings and enquiries stay but are unlinked. Clients with invoices cannot be deleted.' }))) return
    try { await mutate(() => db.remove('clients', client.id), 'clients'); toast.success('Client deleted'); nav('/clients') } catch (e) { toast.error((e as Error).message) }
  }

  // communication history: enquiries, follow-ups, payments, bookings — newest first
  const history = [
    ...mine.enq.map((e) => ({ at: e.created_at, icon: MessageSquare, text: `Enquiry ${e.code}: ${e.service_label ?? 'general'} — ${ENQUIRY_STATUS[e.status].label}`, sub: e.notes })),
    ...mine.fus.map((f) => ({ at: f.created_at, icon: MessageSquare, text: `Follow-up via ${f.channel}`, sub: f.note })),
    ...mine.bks.map((b) => ({ at: b.created_at, icon: CalendarDays, text: `Booking ${b.code}: ${b.title}`, sub: `${fmtDateTime(b.start_at)} · ${BOOKING_STATUS[b.status].label}` })),
    ...mine.pays.map((p) => ({ at: `${p.paid_on}T12:00:00Z`, icon: ReceiptIndianRupee, text: `Payment received ${formatINR(p.amount)}`, sub: `${PAYMENT_METHOD[p.method]}${p.is_advance ? ' · advance' : ''}${p.reference ? ' · ' + p.reference : ''}` })),
  ].sort((a, b) => b.at.localeCompare(a.at))

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card className="h-fit p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <Avatar name={client.business_name ?? client.name} size={56} />
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-semibold">{client.business_name ?? client.name}</p>
            {client.business_name && <p className="text-sm text-muted">{client.name}</p>}
            <div className="mt-2 flex flex-wrap gap-1.5"><Badge>{CLIENT_TYPE[client.client_type]}</Badge>{client.city && <Badge><MapPin className="size-3" />{client.city}</Badge>}</div>
          </div>
        </div>
        <ContactLinks phone={client.phone} whatsapp={client.whatsapp} email={client.email} size="md" className="mt-5" />
        <dl className="mt-4 divide-y divide-line">
          <DetailRow label="Phone">{client.phone}</DetailRow>
          <DetailRow label="Email">{client.email}</DetailRow>
          <DetailRow label="GSTIN">{client.gstin}</DetailRow>
          <DetailRow label="Address"><span className="whitespace-pre-wrap">{client.address}</span></DetailRow>
          <DetailRow label="Client since">{fmtDate(client.created_at)}</DetailRow>
          <DetailRow label="Notes"><span className="whitespace-pre-wrap">{client.notes}</span></DetailRow>
        </dl>
        <div className="mt-5 flex flex-wrap gap-2">
          {can(role, 'clients', 'edit') && <Button icon={<Pencil />} onClick={() => setEditing(true)}>Edit</Button>}
          {can(role, 'clients', 'delete') && <Button variant="ghost" className="text-red-400" icon={<Trash />} onClick={remove}>Delete</Button>}
        </div>
      </Card>

      <div className="min-w-0 space-y-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Projects" value={mine.ps.length} hint={`${mine.ps.filter((p) => !['delivered', 'cancelled'].includes(p.status)).length} active`} />
          {finance ? <>
            <Stat label="Total billed" value={formatINR(mine.billed, { whole: true })} hint="Issued invoices" />
            <Stat label="Paid" value={formatINR(mine.paid, { whole: true })} tone="green" hint="Incl. advances" />
            <Stat label="Outstanding" value={formatINR(mine.outstanding, { whole: true })} tone={mine.outstanding > 0 ? 'amber' : undefined} hint="Open invoice balances" />
          </> : <Stat label="Shoots" value={mine.bks.length} />}
        </div>

        <Card>
          <div className="px-4 pt-2 sm:px-5">
            <Tabs<Tab> value={tab} onChange={setTab} tabs={[
              { value: 'projects', label: 'Projects', count: mine.ps.length },
              ...(finance ? [{ value: 'invoices' as Tab, label: 'Invoices', count: mine.inv.length }] : []),
              { value: 'bookings', label: 'Bookings', count: mine.bks.length },
              ...(can(role, 'enquiries') ? [{ value: 'history' as Tab, label: 'History', count: history.length }] : []),
            ]} />
          </div>
          <div className="p-2 sm:p-3">
            {tab === 'projects' && (mine.ps.length ? (
              <ul className="divide-y divide-line">
                {mine.ps.sort((a, b) => b.created_at.localeCompare(a.created_at)).map((p) => (
                  <li key={p.id}><Link to={`/projects/${p.id}`} className="flex flex-wrap items-center gap-3 rounded-lg px-3 py-3 hover:bg-white/[0.03]">
                    <Briefcase className="size-4 text-accent" />
                    <span className="min-w-0 flex-1"><span className="block truncate font-medium">{p.name}</span><span className="text-xs text-muted">{p.code} · {p.service_label} · due {fmtDate(p.delivery_date)}</span></span>
                    <StatusBadge value={p.status} map={PROJECT_STATUS} />
                  </Link></li>
                ))}
              </ul>
            ) : <EmptyState title="No projects yet" />)}
            {tab === 'invoices' && (mine.inv.length ? (
              <ul className="divide-y divide-line">
                {mine.inv.sort((a, b) => b.issue_date.localeCompare(a.issue_date)).map((i) => (
                  <li key={i.id}><Link to={`/finance/invoices/${i.id}`} className="flex flex-wrap items-center gap-3 rounded-lg px-3 py-3 hover:bg-white/[0.03]">
                    <ReceiptIndianRupee className="size-4 text-accent" />
                    <span className="min-w-0 flex-1"><span className="block font-medium tabular">{i.invoice_number}</span><span className="text-xs text-muted">Issued {fmtDate(i.issue_date)} · due {fmtDate(i.due_date)}</span></span>
                    <span className="text-right tabular"><span className="block font-semibold">{formatINR(i.total)}</span>{i.balance_due > 0 && i.status !== 'void' && <span className="text-xs text-amber-300">{formatINR(i.balance_due)} due</span>}</span>
                    <StatusBadge value={i.status} map={INVOICE_STATUS} />
                  </Link></li>
                ))}
              </ul>
            ) : <EmptyState title="No invoices yet" action={can(role, 'finance', 'create') && <Button variant="primary" onClick={() => nav(`/finance/invoices/new?client=${client.id}`)}>Create invoice</Button>} />)}
            {tab === 'bookings' && (mine.bks.length ? (
              <ul className="divide-y divide-line">
                {mine.bks.sort((a, b) => b.start_at.localeCompare(a.start_at)).map((b) => (
                  <li key={b.id}><Link to={`/bookings?open=${b.id}`} className="flex flex-wrap items-center gap-3 rounded-lg px-3 py-3 hover:bg-white/[0.03]">
                    <CalendarDays className="size-4 text-accent" />
                    <span className="min-w-0 flex-1"><span className="block truncate font-medium">{b.title}</span><span className="text-xs text-muted">{fmtDateTime(b.start_at)} · {b.location ?? 'Location TBC'}</span></span>
                    <StatusBadge value={b.status} map={BOOKING_STATUS} />
                  </Link></li>
                ))}
              </ul>
            ) : <EmptyState title="No shoots booked" />)}
            {tab === 'history' && (history.length ? (
              <ol className="space-y-4 px-3 py-3">
                {history.map((h, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent"><h.icon className="size-4" /></span>
                    <div className="min-w-0"><p className="text-sm font-medium">{h.text}</p>{h.sub && <p className="line-clamp-2 text-xs text-muted">{h.sub}</p>}<p className="mt-0.5 text-[11px] text-faint">{fmtDate(h.at)}</p></div>
                  </li>
                ))}
              </ol>
            ) : <EmptyState title="No history yet" />)}
          </div>
        </Card>
      </div>
      <ClientForm open={editing} client={client} onClose={() => setEditing(false)} />
    </div>
  )
}
