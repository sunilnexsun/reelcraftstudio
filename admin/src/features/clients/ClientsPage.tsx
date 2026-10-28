import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, UsersRound } from 'lucide-react'
import type { Client } from '@/types/db'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/states'
import { ContactLinks } from '@/components/ContactLinks'
import { DataTable, ExportButton, FilterSelect, SearchInput, Toolbar, type Column } from '@/components/tables/DataTable'
import { usePageHeader } from '@/components/layout/PageMeta'
import { useTable } from '@/hooks/useData'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { CLIENT_TYPE, enumOptions } from '@/lib/labels'
import { formatINR } from '@/lib/domain/money'
import { downloadCSV } from '@/lib/domain/csv'
import { todayIST } from '@/lib/domain/dates'
import { matches } from '@/lib/utils'
import { ClientForm } from './ClientForm'

export default function ClientsPage() {
  usePageHeader({ subtitle: 'Client profiles with their projects, billing and history.', showDateRange: false })
  const { role } = useAuth()
  const nav = useNavigate()
  const finance = can(role, 'finance')
  const { data, loading, error, refetch } = useTable('clients')
  const projects = useTable('projects')
  const invoices = useTable('invoices', finance)
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [creating, setCreating] = useState(false)

  const stats = useMemo(() => {
    const m = new Map<string, { projects: number; active: number; billed: number; outstanding: number }>()
    for (const c of data) m.set(c.id, { projects: 0, active: 0, billed: 0, outstanding: 0 })
    for (const p of projects.data) { const s = p.client_id && m.get(p.client_id); if (s) { s.projects++; if (!['delivered', 'cancelled'].includes(p.status)) s.active++ } }
    for (const i of invoices.data) {
      const s = m.get(i.client_id)
      if (s && i.status !== 'void' && i.status !== 'draft') { s.billed += i.total; s.outstanding += i.balance_due }
    }
    return m
  }, [data, projects.data, invoices.data])

  const rows = data.filter((c) => (!type || c.client_type === type) && matches(q, c.name, c.business_name, c.phone, c.email, c.city, c.gstin))

  const columns: Column<Client>[] = [
    {
      key: 'name', header: 'Client', sort: (c) => (c.business_name ?? c.name).toLowerCase(),
      cell: (c) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={c.business_name ?? c.name} size={36} />
          <div className="min-w-0"><p className="truncate font-semibold text-fg">{c.business_name ?? c.name}</p><p className="truncate text-xs text-muted">{c.business_name ? c.name : CLIENT_TYPE[c.client_type]}</p></div>
        </div>
      ),
    },
    { key: 'type', header: 'Type', cell: (c) => <Badge>{CLIENT_TYPE[c.client_type]}</Badge>, sort: (c) => c.client_type, hideBelow: 'lg' },
    { key: 'city', header: 'City', cell: (c) => c.city ?? '—', sort: (c) => c.city, hideBelow: 'md' },
    { key: 'projects', header: 'Projects', cell: (c) => { const s = stats.get(c.id)!; return <span className="tabular">{s.projects}{s.active > 0 && <span className="text-xs text-accent"> · {s.active} active</span>}</span> }, sort: (c) => stats.get(c.id)?.projects },
    ...(finance ? [
      { key: 'billed', header: 'Total billed', cell: (c: Client) => <span className="tabular">{formatINR(stats.get(c.id)!.billed, { whole: true })}</span>, sort: (c: Client) => stats.get(c.id)?.billed, hideBelow: 'md' as const },
      { key: 'due', header: 'Outstanding', cell: (c: Client) => { const v = stats.get(c.id)!.outstanding; return <span className={`tabular ${v > 0 ? 'font-semibold text-amber-300' : 'text-muted'}`}>{formatINR(v, { whole: true })}</span> }, sort: (c: Client) => stats.get(c.id)?.outstanding },
    ] : []),
    { key: 'contact', header: <span className="sr-only">Contact</span>, cell: (c) => <ContactLinks phone={c.phone} whatsapp={c.whatsapp} email={c.email} className="justify-end" />, className: 'w-px' },
  ]

  return (
    <Card>
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search clients, phone, city, GSTIN…" />
        <FilterSelect label="Type" value={type} onChange={setType} options={enumOptions(CLIENT_TYPE)} />
        <ExportButton disabled={!rows.length} onClick={() => downloadCSV(`clients-${todayIST()}`, rows, [
          { header: 'Name', value: (c) => c.name }, { header: 'Business', value: (c) => c.business_name }, { header: 'Type', value: (c) => CLIENT_TYPE[c.client_type] },
          { header: 'Phone', value: (c) => c.phone }, { header: 'WhatsApp', value: (c) => c.whatsapp }, { header: 'Email', value: (c) => c.email }, { header: 'City', value: (c) => c.city },
          { header: 'GSTIN', value: (c) => c.gstin }, { header: 'Projects', value: (c) => stats.get(c.id)?.projects },
          ...(finance ? [{ header: 'Total billed (INR)', value: (c: Client) => stats.get(c.id)?.billed }, { header: 'Outstanding (INR)', value: (c: Client) => stats.get(c.id)?.outstanding }] : []),
        ])} />
        {can(role, 'clients', 'create') && <Button variant="primary" icon={<Plus />} onClick={() => setCreating(true)}>New client</Button>}
      </Toolbar>
      <DataTable rows={rows} columns={columns} rowKey={(c) => c.id} onRowClick={(c) => nav(`/clients/${c.id}`)} loading={loading} error={error?.message} onRetry={refetch}
        initialSort={{ key: 'name', dir: 'asc' }} minWidth={560}
        empty={data.length ? <EmptyState title="No clients match" description="Try another search." /> : <EmptyState icon={<UsersRound />} title="No clients yet" description="Clients are created when you convert an enquiry, or you can add one directly." />} />
      <ClientForm open={creating} onClose={() => setCreating(false)} onSaved={(c) => nav(`/clients/${c.id}`)} />
    </Card>
  )
}
