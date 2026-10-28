import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowRightLeft, Eye, EllipsisVertical, MessagesSquare, Pencil, Plus, Trash } from 'lucide-react'
import { toast } from 'sonner'
import type { Enquiry } from '@/types/db'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Menu } from '@/components/ui/menu'
import { Tabs } from '@/components/ui/segmented'
import { EmptyState } from '@/components/ui/states'
import { useConfirm } from '@/components/ui/confirm'
import { ContactLinks } from '@/components/ContactLinks'
import { DataTable, ExportButton, FilterSelect, SearchInput, Toolbar, type Column } from '@/components/tables/DataTable'
import { usePageHeader } from '@/components/layout/PageMeta'
import { db } from '@/lib/data'
import { mutate, useTable } from '@/hooks/useData'
import { useLookups } from '@/hooks/useLookups'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { ENQUIRY_STATUS, LEAD_SOURCE, enumOptions } from '@/lib/labels'
import { fmtDate, todayIST } from '@/lib/domain/dates'
import { formatINR } from '@/lib/domain/money'
import { downloadCSV } from '@/lib/domain/csv'
import { matches } from '@/lib/utils'
import { EnquiryForm } from './EnquiryForm'
import { EnquiryDetail } from './EnquiryDetail'
import { ConvertDialog } from './ConvertDialog'

type StatusTab = 'all' | 'open' | Enquiry['status']

export default function EnquiriesPage() {
  usePageHeader({ subtitle: 'Every lead from the website, calls, WhatsApp and social — tracked to conversion.', showDateRange: false })
  const { role } = useAuth()
  const confirm = useConfirm()
  const { data, loading, error, refetch } = useTable('enquiries')
  const { memberName, teamOptions, serviceOptions } = useLookups()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<StatusTab>('all')
  const [source, setSource] = useState('')
  const [assignee, setAssignee] = useState('')
  const [service, setService] = useState('')
  const [editing, setEditing] = useState<Enquiry | null | undefined>(undefined) // undefined = closed, null = new
  const [converting, setConverting] = useState<Enquiry | null>(null)
  const openId = params.get('open')
  const open = data.find((e) => e.id === openId) ?? null
  const canEdit = can(role, 'enquiries', 'edit')
  const today = todayIST()

  const setOpen = (id: string | null) => { const p = new URLSearchParams(params); if (id) p.set('open', id); else p.delete('open'); setParams(p, { replace: true }) }

  const filtered = useMemo(() => data.filter((e) =>
    (tab === 'all' || (tab === 'open' ? !['converted', 'lost'].includes(e.status) : e.status === tab)) &&
    (!source || e.lead_source === source) &&
    (!assignee || (assignee === 'none' ? !e.assigned_to : e.assigned_to === assignee)) &&
    (!service || e.service_id === service) &&
    matches(q, e.code, e.client_name, e.business_name, e.phone, e.email, e.service_label, e.notes),
  ), [data, tab, source, assignee, service, q])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: data.length, open: 0 }
    for (const e of data) { c[e.status] = (c[e.status] ?? 0) + 1; if (!['converted', 'lost'].includes(e.status)) c.open++ }
    return c
  }, [data])

  const remove = async (e: Enquiry) => {
    if (!(await confirm({ title: `Delete ${e.code}?`, description: `${e.client_name}'s enquiry and its follow-up notes will be permanently removed.` }))) return
    try { await mutate(() => db.remove('enquiries', e.id), 'enquiries'); toast.success('Enquiry deleted') } catch (err) { toast.error((err as Error).message) }
  }

  const columns: Column<Enquiry>[] = [
    { key: 'code', header: '#', cell: (e) => <span className="text-muted tabular">{e.code.replace('ENQ-', '')}</span>, sort: (e) => e.code, className: 'w-16' },
    {
      key: 'name', header: 'Name', sort: (e) => e.client_name.toLowerCase(),
      cell: (e) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={e.client_name} size={34} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-fg">{e.client_name}</p>
            {e.business_name && <p className="truncate text-xs text-muted">{e.business_name}</p>}
          </div>
        </div>
      ),
    },
    { key: 'service', header: 'Service', cell: (e) => <span className="line-clamp-1">{e.service_label ?? '—'}</span>, sort: (e) => e.service_label, hideBelow: 'md' },
    { key: 'budget', header: 'Budget', cell: (e) => <span className="tabular">{formatINR(e.budget, { whole: true })}</span>, sort: (e) => e.budget, hideBelow: 'xl' },
    { key: 'source', header: 'Source', cell: (e) => LEAD_SOURCE[e.lead_source], sort: (e) => e.lead_source, hideBelow: 'xl' },
    { key: 'date', header: 'Date', cell: (e) => <span className="tabular whitespace-nowrap">{fmtDate(e.enquiry_date)}</span>, sort: (e) => e.enquiry_date + e.created_at },
    {
      key: 'follow', header: 'Follow-up', sort: (e) => e.follow_up_date, hideBelow: 'lg',
      cell: (e) => !e.follow_up_date || ['converted', 'lost'].includes(e.status) ? <span className="text-faint">—</span>
        : <span className={`tabular whitespace-nowrap ${e.follow_up_date < today ? 'font-semibold text-red-400' : e.follow_up_date === today ? 'font-semibold text-amber-300' : ''}`}>{e.follow_up_date === today ? 'Today' : fmtDate(e.follow_up_date)}</span>,
    },
    { key: 'assigned', header: 'Assigned', cell: (e) => <span className="whitespace-nowrap">{memberName(e.assigned_to)}</span>, sort: (e) => memberName(e.assigned_to), hideBelow: 'xl' },
    { key: 'status', header: 'Status', cell: (e) => <StatusBadge value={e.status} map={ENQUIRY_STATUS} />, sort: (e) => Object.keys(ENQUIRY_STATUS).indexOf(e.status) },
    {
      key: 'actions', header: <span className="sr-only">Actions</span>, className: 'w-px',
      cell: (e) => (
        <div className="flex items-center justify-end gap-1">
          <ContactLinks phone={e.phone} className="hidden sm:flex" />
          <Button variant="ghost" size="icon-sm" aria-label={`View ${e.client_name}`} onClick={() => setOpen(e.id)}><Eye /></Button>
          {canEdit && (
            <Menu label={`Actions for ${e.client_name}`} items={[
              { label: 'Edit', icon: <Pencil />, onSelect: () => setEditing(e) },
              { label: 'Convert to project', icon: <ArrowRightLeft />, onSelect: () => setConverting(e), hidden: e.status === 'converted' },
              'divider',
              { label: 'Delete', icon: <Trash />, danger: true, onSelect: () => remove(e) },
            ]} trigger={(p) => <Button {...p} variant="ghost" size="icon-sm" aria-label={`More actions for ${e.client_name}`}><EllipsisVertical /></Button>} />
          )}
        </div>
      ),
    },
  ]

  const exportCsv = () => downloadCSV(`enquiries-${today}`, filtered, [
    { header: 'Enquiry ID', value: (e) => e.code }, { header: 'Client name', value: (e) => e.client_name }, { header: 'Business', value: (e) => e.business_name },
    { header: 'Phone', value: (e) => e.phone }, { header: 'Email', value: (e) => e.email }, { header: 'Service', value: (e) => e.service_label },
    { header: 'Budget (INR)', value: (e) => e.budget }, { header: 'Lead source', value: (e) => LEAD_SOURCE[e.lead_source] }, { header: 'Enquiry date', value: (e) => e.enquiry_date },
    { header: 'Follow-up date', value: (e) => e.follow_up_date }, { header: 'Assigned to', value: (e) => (e.assigned_to ? memberName(e.assigned_to) : '') },
    { header: 'Status', value: (e) => ENQUIRY_STATUS[e.status].label }, { header: 'Notes', value: (e) => e.notes },
  ])

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-5">
          <Tabs<StatusTab> value={tab} onChange={setTab} className="min-w-0 flex-1 border-0" tabs={[
            { value: 'all', label: 'All', count: counts.all }, { value: 'open', label: 'Open', count: counts.open },
            ...enumOptions(ENQUIRY_STATUS).map((o) => ({ value: o.value as StatusTab, label: o.label, count: counts[o.value] ?? 0 })),
          ]} />
          {can(role, 'enquiries', 'create') && <Button variant="primary" icon={<Plus />} onClick={() => setEditing(null)}>New enquiry</Button>}
        </div>
        <Toolbar className="mt-2 border-t">
          <SearchInput value={q} onChange={setQ} placeholder="Search name, phone, email, ID…" />
          <FilterSelect label="Source" value={source} onChange={setSource} options={enumOptions(LEAD_SOURCE)} />
          <FilterSelect label="Service" value={service} onChange={setService} options={serviceOptions} className="hidden md:block" />
          <FilterSelect label="Assigned" value={assignee} onChange={setAssignee} options={[{ value: 'none', label: 'Unassigned' }, ...teamOptions]} className="hidden md:block" />
          <ExportButton onClick={exportCsv} disabled={!filtered.length} />
        </Toolbar>
        <DataTable
          rows={filtered} columns={columns} rowKey={(e) => e.id} onRowClick={(e) => setOpen(e.id)}
          loading={loading} error={error?.message} onRetry={refetch} initialSort={{ key: 'date', dir: 'desc' }} minWidth={640}
          empty={data.length
            ? <EmptyState title="No enquiries match" description="Try clearing the search or filters." action={<Button size="sm" onClick={() => { setQ(''); setTab('all'); setSource(''); setAssignee(''); setService('') }}>Clear filters</Button>} />
            : <EmptyState icon={<MessagesSquare />} title="No enquiries yet" description="Website form submissions land here automatically. You can also add leads from calls and DMs." action={can(role, 'enquiries', 'create') && <Button variant="primary" icon={<Plus />} onClick={() => setEditing(null)}>Add first enquiry</Button>} />}
        />
      </Card>

      <EnquiryForm open={editing !== undefined} enquiry={editing} onClose={() => setEditing(undefined)} />
      <EnquiryDetail enquiry={open} onClose={() => setOpen(null)} onEdit={(e) => setEditing(e)} onConvert={(e) => setConverting(e)} />
      <ConvertDialog enquiry={converting} onClose={() => setConverting(null)} />
    </div>
  )
}
