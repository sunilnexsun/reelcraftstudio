import { useMemo, useState, type DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, CalendarClock, Kanban, Plus, Table2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Project, ProjectStatus } from '@/types/db'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Segmented } from '@/components/ui/segmented'
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/states'
import { DataTable, ExportButton, FilterSelect, SearchInput, Toolbar, type Column } from '@/components/tables/DataTable'
import { usePageHeader } from '@/components/layout/PageMeta'
import { db } from '@/lib/data'
import { mutate, useTable } from '@/hooks/useData'
import { useLookups } from '@/hooks/useLookups'
import { useAuth } from '@/lib/auth'
import { can, canSeeFinancials } from '@/lib/permissions'
import { PRIORITY, PROJECT_FLOW, PROJECT_STATUS, APPROVAL, enumOptions } from '@/lib/labels'
import { fmtDate, todayIST } from '@/lib/domain/dates'
import { formatINR } from '@/lib/domain/money'
import { downloadCSV } from '@/lib/domain/csv'
import { cn, matches } from '@/lib/utils'
import { ProjectForm } from './ProjectForm'

type View = 'table' | 'kanban'

export function useProjectProgress() {
  const tasks = useTable('project_tasks')
  return useMemo(() => {
    const m = new Map<string, { done: number; total: number }>()
    for (const t of tasks.data) {
      if (t.kind !== 'deliverable') continue
      const s = m.get(t.project_id) ?? { done: 0, total: 0 }
      s.total++; if (t.is_done) s.done++
      m.set(t.project_id, s)
    }
    return m
  }, [tasks.data])
}

export default function ProjectsPage() {
  usePageHeader({ subtitle: 'Production pipeline from enquiry to delivery.', showDateRange: false })
  const { role, teamMemberId } = useAuth()
  const nav = useNavigate()
  const { data, loading, error, refetch } = useTable('projects')
  const ptm = useTable('project_team_members')
  const { clientName, clientOptions, serviceOptions, teamOptions, teamById, finByProject } = useLookups()
  const progress = useProjectProgress()
  const [view, setView] = useState<View>(() => (window.matchMedia?.('(max-width: 767px)').matches ? 'table' : 'kanban'))
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [client, setClient] = useState('')
  const [service, setService] = useState('')
  const [member, setMember] = useState('')
  const [creating, setCreating] = useState(false)
  const showMoney = canSeeFinancials(role)
  const today = todayIST()

  const teamOf = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const x of ptm.data) m.set(x.project_id, [...(m.get(x.project_id) ?? []), x.team_member_id])
    return m
  }, [ptm.data])

  const rows = useMemo(() => data.filter((p) =>
    (!status || (status === 'active' ? !['delivered', 'cancelled', 'on_hold'].includes(p.status) : p.status === status)) &&
    (!priority || p.priority === priority) && (!client || p.client_id === client) && (!service || p.service_id === service) &&
    (!member || (member === 'me' ? teamOf.get(p.id)?.includes(teamMemberId ?? '') : teamOf.get(p.id)?.includes(member))) &&
    matches(q, p.code, p.name, p.service_label, clientName(p.client_id), p.description),
  ), [data, status, priority, client, service, member, q, teamOf, clientName, teamMemberId])

  const move = async (p: Project, to: ProjectStatus) => {
    if (p.status === to) return
    try { await mutate(() => db.update('projects', p.id, { status: to }), 'projects'); toast.success(`${p.code} → ${PROJECT_STATUS[to].label}`) }
    catch (e) { toast.error((e as Error).message) }
  }

  const pct = (p: Project) => { const s = progress.get(p.id); return s && s.total ? Math.round((s.done / s.total) * 100) : 0 }

  const columns: Column<Project>[] = [
    { key: 'code', header: 'ID', cell: (p) => <span className="text-muted tabular">{p.code}</span>, sort: (p) => p.code, hideBelow: 'md' },
    { key: 'name', header: 'Project', sort: (p) => p.name.toLowerCase(), cell: (p) => <div className="min-w-0"><p className="truncate font-semibold text-fg">{p.name}</p><p className="truncate text-xs text-muted">{clientName(p.client_id)} · {p.service_label ?? '—'}</p></div> },
    { key: 'delivery', header: 'Delivery', sort: (p) => p.delivery_date, cell: (p) => <DueDate p={p} today={today} /> },
    { key: 'priority', header: 'Priority', cell: (p) => <StatusBadge value={p.priority} map={PRIORITY} />, sort: (p) => ['low', 'medium', 'high', 'urgent'].indexOf(p.priority), hideBelow: 'lg' },
    { key: 'team', header: 'Team', cell: (p) => <TeamStack ids={teamOf.get(p.id) ?? []} names={(id) => teamById.get(id)?.full_name ?? ''} />, hideBelow: 'xl' },
    { key: 'progress', header: 'Progress', sort: pct, hideBelow: 'md', cell: (p) => <ProgressBar value={pct(p)} /> },
    ...(showMoney ? [{ key: 'due', header: 'Amount due', hideBelow: 'lg' as const, sort: (p: Project) => finByProject.get(p.id)?.amount_due, cell: (p: Project) => <span className="tabular">{formatINR(finByProject.get(p.id)?.amount_due, { whole: true })}</span> }] : []),
    { key: 'status', header: 'Status', cell: (p) => <StatusBadge value={p.status} map={PROJECT_STATUS} />, sort: (p) => PROJECT_FLOW.indexOf(p.status) },
  ]

  const exportCsv = () => downloadCSV(`projects-${today}`, rows, [
    { header: 'Project ID', value: (p) => p.code }, { header: 'Project', value: (p) => p.name }, { header: 'Client', value: (p) => clientName(p.client_id) },
    { header: 'Service', value: (p) => p.service_label }, { header: 'Start', value: (p) => p.start_date }, { header: 'Delivery', value: (p) => p.delivery_date },
    { header: 'Priority', value: (p) => PRIORITY[p.priority].label }, { header: 'Status', value: (p) => PROJECT_STATUS[p.status].label },
    { header: 'Client approval', value: (p) => APPROVAL[p.approval_status].label }, { header: 'Revisions', value: (p) => p.revision_count },
    { header: 'Team', value: (p) => (teamOf.get(p.id) ?? []).map((id) => teamById.get(id)?.full_name).join('; ') }, { header: 'Deliverables done %', value: pct },
    ...(showMoney ? [
      { header: 'Budget (INR)', value: (p: Project) => finByProject.get(p.id)?.budget }, { header: 'Advance (INR)', value: (p: Project) => finByProject.get(p.id)?.advance_paid },
      { header: 'Received (INR)', value: (p: Project) => finByProject.get(p.id)?.amount_received }, { header: 'Due (INR)', value: (p: Project) => finByProject.get(p.id)?.amount_due },
    ] : []),
  ])

  const empty = data.length
    ? <EmptyState title="No projects match" description="Try clearing filters." />
    : <EmptyState icon={<Briefcase />} title="No projects yet" description="Convert an enquiry or create a project to start tracking production." action={can(role, 'projects', 'create') && <Button variant="primary" icon={<Plus />} onClick={() => setCreating(true)}>Create project</Button>} />

  return (
    <div className="space-y-4">
      <Card>
        <Toolbar>
          <Segmented<View> value={view} onChange={setView} label="View" options={[{ value: 'kanban', label: <span className="flex items-center gap-1.5"><Kanban />Board</span> }, { value: 'table', label: <span className="flex items-center gap-1.5"><Table2 />Table</span> }]} />
          <SearchInput value={q} onChange={setQ} placeholder="Search projects, clients, IDs…" />
          {view === 'table' && <FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: 'active', label: 'Active (in production)' }, ...enumOptions(PROJECT_STATUS)]} />}
          <FilterSelect label="Priority" value={priority} onChange={setPriority} options={enumOptions(PRIORITY)} className="hidden sm:block" />
          <FilterSelect label="Client" value={client} onChange={setClient} options={clientOptions} className="hidden lg:block" />
          <FilterSelect label="Service" value={service} onChange={setService} options={serviceOptions} className="hidden xl:block" />
          <FilterSelect label="Team" value={member} onChange={setMember} options={[...(teamMemberId ? [{ value: 'me', label: 'Assigned to me' }] : []), ...teamOptions]} className="hidden lg:block" />
          <ExportButton onClick={exportCsv} disabled={!rows.length} />
          {can(role, 'projects', 'create') && <Button variant="primary" icon={<Plus />} onClick={() => setCreating(true)}>New project</Button>}
        </Toolbar>
        {view === 'table' && (
          <DataTable rows={rows} columns={columns} rowKey={(p) => p.id} onRowClick={(p) => nav(`/projects/${p.id}`)} loading={loading} error={error?.message} onRetry={refetch}
            initialSort={{ key: 'delivery', dir: 'asc' }} minWidth={620} empty={empty} />
        )}
      </Card>

      {view === 'kanban' && (
        error ? <Card><ErrorState message={error.message} onRetry={refetch} /></Card>
          : loading && !data.length ? <Card><LoadingBlock /></Card>
          : !data.length ? <Card>{empty}</Card>
          : <KanbanBoard projects={rows} onMove={move} onOpen={(p) => nav(`/projects/${p.id}`)} canMove={(p) => can(role, 'projects', 'edit') && (can(role, 'projects', 'create') || (teamOf.get(p.id) ?? []).includes(teamMemberId ?? ''))}
              render={(p) => (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-sm font-semibold">{p.name}</p>
                    {p.priority !== 'medium' && p.priority !== 'low' && <StatusBadge value={p.priority} map={PRIORITY} />}
                  </div>
                  <p className="mt-1 truncate text-xs text-muted">{clientName(p.client_id)}</p>
                  <div className="mt-3"><ProgressBar value={pct(p)} /></div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <DueDate p={p} today={today} compact />
                    <TeamStack ids={teamOf.get(p.id) ?? []} names={(id) => teamById.get(id)?.full_name ?? ''} max={3} />
                  </div>
                  {p.status === 'revisions' && <Badge tone="red" className="mt-2">Revision {p.revision_count}</Badge>}
                </>
              )} />
      )}
      <ProjectForm open={creating} onClose={() => setCreating(false)} onSaved={(p) => nav(`/projects/${p.id}`)} />
    </div>
  )
}

function KanbanBoard({ projects, onMove, onOpen, render, canMove }: {
  projects: Project[]; onMove: (p: Project, s: ProjectStatus) => void; onOpen: (p: Project) => void; render: (p: Project) => React.ReactNode; canMove: (p: Project) => boolean
}) {
  const [over, setOver] = useState<ProjectStatus | null>(null)
  const cols: ProjectStatus[] = [...PROJECT_FLOW, 'on_hold']
  const onDrop = (e: DragEvent, s: ProjectStatus) => {
    e.preventDefault(); setOver(null)
    const p = projects.find((x) => x.id === e.dataTransfer.getData('text/project'))
    if (p) onMove(p, s)
  }
  return (
    <div className="scroll-x -mx-4 px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex gap-3" style={{ minWidth: cols.length * 262 }}>
        {cols.map((s) => {
          const items = projects.filter((p) => p.status === s)
          return (
            <section key={s} aria-label={PROJECT_STATUS[s].label}
              onDragOver={(e) => { e.preventDefault(); setOver(s) }} onDragLeave={() => setOver((o) => (o === s ? null : o))} onDrop={(e) => onDrop(e, s)}
              className={cn('flex w-[250px] shrink-0 flex-col rounded-2xl border bg-surface/70 transition-colors', over === s ? 'border-accent bg-accent/[0.06]' : 'border-line')}>
              <header className="flex items-center justify-between px-3.5 pt-3 pb-2">
                <h3 className="text-[13px] font-semibold">{PROJECT_STATUS[s].label}</h3>
                <span className="rounded-full bg-white/8 px-2 text-xs text-muted tabular">{items.length}</span>
              </header>
              <div className="flex min-h-24 flex-1 flex-col gap-2 px-2 pb-2">
                {items.map((p) => (
                  <article key={p.id} draggable={canMove(p)} onDragStart={(e) => { e.dataTransfer.setData('text/project', p.id); e.dataTransfer.effectAllowed = 'move' }}
                    className="group rounded-xl border border-line bg-[#171717] p-3 transition-colors hover:border-white/20">
                    <button type="button" className="block w-full text-left" onClick={() => onOpen(p)} aria-label={`Open ${p.name}`}>{render(p)}</button>
                    {canMove(p) && (
                      <label className="mt-2 flex items-center gap-1.5 text-[11px] text-faint opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                        Move to
                        <select value={p.status} onChange={(e) => onMove(p, e.target.value as ProjectStatus)} className="rounded bg-white/5 px-1 py-0.5 text-[11px] text-fg-soft outline-none">
                          {enumOptions(PROJECT_STATUS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </label>
                    )}
                  </article>
                ))}
                {!items.length && <p className="px-2 py-6 text-center text-xs text-faint">Drop projects here</p>}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label="Deliverables complete">
        <div className="h-full rounded-full bg-gradient-to-r from-accent to-[#ff6b86]" style={{ width: `${value}%` }} />
      </div>
      <span className="w-8 text-right text-xs text-muted tabular">{value}%</span>
    </div>
  )
}

export function TeamStack({ ids, names, max = 4 }: { ids: string[]; names: (id: string) => string; max?: number }) {
  if (!ids.length) return <span className="text-xs text-faint">—</span>
  return (
    <div className="flex -space-x-2" aria-label={ids.map(names).join(', ')} title={ids.map(names).join(', ')}>
      {ids.slice(0, max).map((id) => <Avatar key={id} name={names(id)} size={24} className="ring-2 ring-[#171717]" />)}
      {ids.length > max && <span className="grid size-6 place-items-center rounded-full bg-white/10 text-[10px] ring-2 ring-[#171717]">+{ids.length - max}</span>}
    </div>
  )
}

function DueDate({ p, today, compact }: { p: Project; today: string; compact?: boolean }) {
  if (!p.delivery_date) return <span className="text-xs text-faint">No date</span>
  const late = p.delivery_date < today && !['delivered', 'cancelled'].includes(p.status)
  return (
    <span className={cn('inline-flex items-center gap-1 tabular whitespace-nowrap', compact ? 'text-xs' : 'text-sm', late ? 'font-semibold text-red-400' : p.delivery_date === today ? 'text-amber-300' : compact ? 'text-muted' : '')}>
      {compact && <CalendarClock className="size-3.5" />}{fmtDate(p.delivery_date)}{late && !compact && ' · late'}
    </span>
  )
}
