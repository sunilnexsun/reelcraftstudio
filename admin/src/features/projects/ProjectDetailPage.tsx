import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CalendarPlus, Check, CircleCheck, ClipboardList, IndianRupee, Pause, Pencil, Plus, RotateCcw, Trash, UsersRound, CalendarDays, ReceiptIndianRupee } from 'lucide-react'
import { toast } from 'sonner'
import type { ProjectStatus, ProjectTask } from '@/types/db'
import { Card, CardHeader, DetailRow } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/states'
import { useConfirm } from '@/components/ui/confirm'
import { MemberPicker } from '@/components/forms/MemberPicker'
import { usePageHeader } from '@/components/layout/PageMeta'
import { db } from '@/lib/data'
import { mutate, useTable } from '@/hooks/useData'
import { useLookups } from '@/hooks/useLookups'
import { useAuth } from '@/lib/auth'
import { can, canRecordPayments, canSeeFinancials } from '@/lib/permissions'
import { APPROVAL, BOOKING_STATUS, INVOICE_STATUS, PRIORITY, PROJECT_FLOW, PROJECT_STATUS, ROLE_LABEL, enumOptions, projectProgress } from '@/lib/labels'
import { fmtDate, fmtDateTime, fmtTime } from '@/lib/domain/dates'
import { formatINR } from '@/lib/domain/money'
import { cn } from '@/lib/utils'
import { ProjectForm } from './ProjectForm'
import { ProgressBar } from './ProjectsPage'
import { BookingForm } from '@/features/bookings/BookingForm'
import { PaymentForm } from '@/features/finance/PaymentForm'

export default function ProjectDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const confirm = useConfirm()
  const { role, teamMemberId } = useAuth()
  const projects = useTable('projects')
  const tasks = useTable('project_tasks')
  const ptm = useTable('project_team_members')
  const bookings = useTable('bookings')
  const invoices = useTable('invoices', can(role, 'finance'))
  const activity = useTable('activity_logs', role === 'owner' || role === 'manager')
  const { clientName, team, teamById, finByProject } = useLookups()
  const [editing, setEditing] = useState(false)
  const [booking, setBooking] = useState(false)
  const [paying, setPaying] = useState<null | 'advance' | 'payment'>(null)
  const [newTask, setNewTask] = useState('')
  const [newRevision, setNewRevision] = useState('')
  const [teamEdit, setTeamEdit] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)

  const p = projects.data.find((x) => x.id === id)
  usePageHeader({
    title: p?.name ?? 'Project', subtitle: p ? `${p.code} · ${clientName(p.client_id)} · ${p.service_label ?? 'No service'}` : undefined,
    crumbs: [{ label: 'Projects', to: '/projects' }, { label: p?.code ?? '…' }], showDateRange: false,
  }, [p?.id, p?.name, p?.client_id, p?.service_label])

  const members = useMemo(() => ptm.data.filter((m) => m.project_id === id).map((m) => m.team_member_id), [ptm.data, id])
  const isOps = can(role, 'projects', 'create')
  const canEdit = can(role, 'projects', 'edit') && (isOps || members.includes(teamMemberId ?? ''))
  useEffect(() => { setTeamEdit(null) }, [id])

  if (projects.loading && !p) return <LoadingBlock rows={8} />
  if (projects.error) return <ErrorState message={projects.error.message} onRetry={projects.refetch} />
  if (!p) return <EmptyState title="Project not found" action={<Button onClick={() => nav('/projects')}>Back to projects</Button>} />

  const mine = tasks.data.filter((t) => t.project_id === p.id).sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
  const deliverables = mine.filter((t) => t.kind !== 'revision')
  const revisions = mine.filter((t) => t.kind === 'revision')
  const done = deliverables.filter((t) => t.is_done).length
  const pct = deliverables.length ? Math.round((done / deliverables.length) * 100) : 0
  const fin = finByProject.get(p.id)
  const shoots = bookings.data.filter((b) => b.project_id === p.id).sort((a, b) => a.start_at.localeCompare(b.start_at))
  const invs = invoices.data.filter((i) => i.project_id === p.id)
  const log = activity.data.filter((a) => a.entity_id === p.id).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8)
  const stageIdx = PROJECT_FLOW.indexOf(p.status)

  const run = async (fn: () => Promise<unknown>, ok: string, ...tables: Parameters<typeof mutate>[1][]) => {
    setBusy(true)
    try { await mutate(fn, ...(tables.length ? tables : ['projects' as const])); toast.success(ok) } catch (e) { toast.error((e as Error).message) } finally { setBusy(false) }
  }
  const setStatus = (s: ProjectStatus) => run(() => db.update('projects', p.id, { status: s }), `Moved to ${PROJECT_STATUS[s].label}`)
  const toggle = (t: ProjectTask) => run(() => db.update('project_tasks', t.id, { is_done: !t.is_done }), t.is_done ? 'Marked not done' : 'Marked done', 'project_tasks')
  const addTask = async () => {
    if (!newTask.trim()) return
    await run(() => db.insert('project_tasks', { project_id: p.id, title: newTask.trim().slice(0, 200), kind: 'deliverable', sort_order: deliverables.length }), 'Deliverable added', 'project_tasks')
    setNewTask('')
  }
  const addRevision = async () => {
    if (!newRevision.trim()) return
    await run(async () => {
      await db.insert('project_tasks', { project_id: p.id, title: newRevision.trim().slice(0, 200), kind: 'revision', sort_order: 100 + revisions.length })
      await db.update('projects', p.id, { revision_count: p.revision_count + 1, status: 'revisions', approval_status: 'changes_requested' })
    }, `Revision ${p.revision_count + 1} logged`, 'project_tasks', 'projects')
    setNewRevision('')
  }
  const removeTask = async (t: ProjectTask) => {
    if (!(await confirm({ title: 'Remove this item?', description: t.title }))) return
    await run(() => db.remove('project_tasks', t.id), 'Removed', 'project_tasks')
  }
  const remove = async () => {
    if (!(await confirm({ title: `Delete ${p.code}?`, description: 'The project, its checklist and team assignments are deleted. Bookings and invoices are kept but unlinked. Projects with recorded payments can’t be deleted — put them on hold instead.' }))) return
    try { await mutate(() => db.remove('projects', p.id), 'projects'); toast.success('Project deleted'); nav('/projects') } catch (e) { toast.error((e as Error).message) }
  }

  return (
    <div className="space-y-5">
      {/* workflow stepper */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge value={p.status} map={PROJECT_STATUS} />
          <StatusBadge value={p.priority} map={PRIORITY} />
          <StatusBadge value={p.approval_status} map={APPROVAL} />
          {p.revision_count > 0 && <Badge tone="red">{p.revision_count} revision{p.revision_count > 1 ? 's' : ''}</Badge>}
          <div className="ml-auto flex flex-wrap gap-2">
            {canEdit && <Button size="sm" icon={<Pencil />} onClick={() => setEditing(true)}>Edit</Button>}
            {isOps && p.status !== 'on_hold' && p.status !== 'delivered' && <Button size="sm" variant="ghost" icon={<Pause />} onClick={() => setStatus('on_hold')} disabled={busy}>Put on hold</Button>}
            {isOps && <Button size="sm" variant="ghost" className="text-red-400" icon={<Trash />} onClick={remove}>Delete</Button>}
          </div>
        </div>
        <ol className="scroll-x mt-5 flex items-start gap-0 pb-1" aria-label="Production workflow">
          {PROJECT_FLOW.map((s, i) => {
            const state = stageIdx < 0 ? 'todo' : i < stageIdx ? 'done' : i === stageIdx ? 'current' : 'todo'
            return (
              <li key={s} className="flex min-w-[92px] flex-1 flex-col items-center text-center">
                <div className="flex w-full items-center">
                  <span className={cn('h-0.5 flex-1', i === 0 ? 'opacity-0' : state === 'todo' ? 'bg-white/10' : 'bg-accent')} />
                  <button type="button" disabled={!canEdit || busy || state === 'current'} onClick={() => setStatus(s)}
                    aria-current={state === 'current' ? 'step' : undefined} aria-label={`Set status to ${PROJECT_STATUS[s].label}`}
                    className={cn('grid size-8 shrink-0 place-items-center rounded-full border-2 text-xs font-bold transition-colors disabled:cursor-default',
                      state === 'done' && 'border-accent bg-accent text-white', state === 'current' && 'border-accent bg-accent-soft text-white shadow-[0_0_0_4px_rgb(255_23_68/0.15)]',
                      state === 'todo' && 'border-white/15 text-muted enabled:hover:border-white/40')}>
                    {state === 'done' ? <Check className="size-4" /> : i + 1}
                  </button>
                  <span className={cn('h-0.5 flex-1', i === PROJECT_FLOW.length - 1 ? 'opacity-0' : i < stageIdx ? 'bg-accent' : 'bg-white/10')} />
                </div>
                <span className={cn('mt-2 px-1 text-[11px] leading-tight', state === 'current' ? 'font-semibold text-white' : 'text-muted')}>{PROJECT_STATUS[s].label}</span>
              </li>
            )
          })}
        </ol>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div><p className="mb-1 text-xs text-muted">Workflow stage</p><ProgressBar value={projectProgress(p.status)} /></div>
          <div><p className="mb-1 text-xs text-muted">Deliverables ({done}/{deliverables.length})</p><ProgressBar value={pct} /></div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader title="Deliverables checklist" icon={<ClipboardList />} subtitle={`${done} of ${deliverables.length} complete`} />
            <ul className="px-3 pb-2 sm:px-4">
              {deliverables.map((t) => (
                <li key={t.id} className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.03]">
                  <button type="button" role="checkbox" aria-checked={t.is_done} disabled={!canEdit || busy} onClick={() => toggle(t)}
                    className={cn('grid size-5 shrink-0 place-items-center rounded-md border-2 transition-colors', t.is_done ? 'border-accent bg-accent' : 'border-white/25 hover:border-white/50')}>
                    {t.is_done && <Check className="size-3.5 text-white" strokeWidth={3} />}
                  </button>
                  <span className={cn('min-w-0 flex-1 text-sm', t.is_done && 'text-muted line-through')}>{t.title}</span>
                  {t.due_date && <span className="text-xs text-muted">{fmtDate(t.due_date)}</span>}
                  {isOps && <button type="button" onClick={() => removeTask(t)} className="rounded p-1 text-faint opacity-0 group-hover:opacity-100 hover:text-red-400 focus:opacity-100" aria-label={`Remove ${t.title}`}><Trash className="size-3.5" /></button>}
                </li>
              ))}
              {!deliverables.length && <li className="px-2 py-4 text-sm text-muted">No deliverables yet.</li>}
            </ul>
            {canEdit && (
              <form className="flex gap-2 border-t border-line px-4 py-3 sm:px-5" onSubmit={(e) => { e.preventDefault(); void addTask() }}>
                <input className="input" value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Add a deliverable, e.g. 15s vertical cutdown" aria-label="New deliverable" maxLength={200} />
                <Button type="submit" icon={<Plus />} disabled={!newTask.trim() || busy}>Add</Button>
              </form>
            )}
          </Card>

          <Card>
            <CardHeader title="Revisions" icon={<RotateCcw />} subtitle="Client feedback rounds"
              action={canEdit && p.approval_status !== 'approved' && <Button size="sm" variant="outline" icon={<CircleCheck />} onClick={() => run(() => db.update('projects', p.id, { approval_status: 'approved', status: stageIdx < PROJECT_FLOW.indexOf('approved') ? 'approved' : p.status }), 'Client approval recorded')}>Mark client approved</Button>} />
            <ul className="px-3 pb-2 sm:px-4">
              {revisions.map((t, i) => (
                <li key={t.id} className="flex items-center gap-3 rounded-lg px-2 py-2">
                  <Badge tone={t.is_done ? 'green' : 'amber'}>R{i + 1}</Badge>
                  <span className={cn('min-w-0 flex-1 text-sm', t.is_done && 'text-muted')}>{t.title}</span>
                  {canEdit && <Button size="sm" variant="ghost" onClick={() => toggle(t)} disabled={busy}>{t.is_done ? 'Reopen' : 'Done'}</Button>}
                </li>
              ))}
              {!revisions.length && <li className="px-2 py-4 text-sm text-muted">No revision requests logged.</li>}
            </ul>
            {canEdit && (
              <form className="flex gap-2 border-t border-line px-4 py-3 sm:px-5" onSubmit={(e) => { e.preventDefault(); void addRevision() }}>
                <input className="input" value={newRevision} onChange={(e) => setNewRevision(e.target.value)} placeholder="What did the client ask to change?" aria-label="New revision request" maxLength={200} />
                <Button type="submit" icon={<Plus />} disabled={!newRevision.trim() || busy}>Log revision</Button>
              </form>
            )}
          </Card>

          <Card>
            <CardHeader title="Shoots" icon={<CalendarDays />} action={can(role, 'bookings', 'create') && <Button size="sm" variant="primary" icon={<CalendarPlus />} onClick={() => setBooking(true)}>Schedule shoot</Button>} />
            <ul className="divide-y divide-line px-3 pb-3 sm:px-4">
              {shoots.map((b) => (
                <li key={b.id}><Link to={`/bookings?open=${b.id}`} className="flex flex-wrap items-center gap-3 rounded-lg px-2 py-3 hover:bg-white/[0.03]">
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{b.title}</span><span className="text-xs text-muted">{fmtDate(b.start_at)} · {fmtTime(b.start_at)}–{fmtTime(b.end_at)} · {b.location ?? 'TBC'}</span></span>
                  <StatusBadge value={b.status} map={BOOKING_STATUS} />
                </Link></li>
              ))}
              {!shoots.length && <li className="px-2 py-4 text-sm text-muted">No shoots scheduled for this project.</li>}
            </ul>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <dl className="divide-y divide-line">
              <DetailRow label="Client">{p.client_id ? <Link to={`/clients/${p.client_id}`} className="text-accent hover:underline">{clientName(p.client_id)}</Link> : '—'}</DetailRow>
              <DetailRow label="Service">{p.service_label}</DetailRow>
              <DetailRow label="Start">{fmtDate(p.start_date)}</DetailRow>
              <DetailRow label="Delivery">{fmtDate(p.delivery_date)}</DetailRow>
              <DetailRow label="Client approval">
                {canEdit ? (
                  <select className="input h-8 w-auto py-0 text-xs" value={p.approval_status} onChange={(e) => run(() => db.update('projects', p.id, { approval_status: e.target.value as typeof p.approval_status }), 'Approval status updated')} aria-label="Client approval status">
                    {enumOptions(APPROVAL).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : APPROVAL[p.approval_status].label}
              </DetailRow>
              {p.enquiry_id && can(role, 'enquiries') && <DetailRow label="From enquiry"><Link to={`/enquiries?open=${p.enquiry_id}`} className="text-accent hover:underline">View enquiry →</Link></DetailRow>}
              <DetailRow label="Description"><span className="whitespace-pre-wrap">{p.description}</span></DetailRow>
              <DetailRow label="Internal notes"><span className="whitespace-pre-wrap">{p.internal_notes}</span></DetailRow>
            </dl>
          </Card>

          {canSeeFinancials(role) && (
            <Card className="p-5">
              <h2 className="mb-3 flex items-center gap-2 font-display font-semibold"><IndianRupee className="size-4 text-accent" />Payments</h2>
              <dl className="grid grid-cols-2 gap-3">
                <div><dt className="text-xs text-muted">Budget</dt><dd className="font-display text-lg font-semibold tabular">{formatINR(fin?.budget, { whole: true })}</dd></div>
                <div><dt className="text-xs text-muted">Advance paid</dt><dd className="font-display text-lg font-semibold tabular text-emerald-400">{formatINR(fin?.advance_paid, { whole: true })}</dd></div>
                <div><dt className="text-xs text-muted">Total received</dt><dd className="font-display text-lg font-semibold tabular">{formatINR(fin?.amount_received, { whole: true })}</dd></div>
                <div><dt className="text-xs text-muted">Amount due</dt><dd className={cn('font-display text-lg font-semibold tabular', (fin?.amount_due ?? 0) > 0 && 'text-amber-300')}>{formatINR(fin?.amount_due, { whole: true })}</dd></div>
              </dl>
              {fin && fin.budget > 0 && <ProgressBar className="mt-3" value={Math.min(100, Math.round((fin.amount_received / fin.budget) * 100))} />}
              {canRecordPayments(role) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="primary" onClick={() => setPaying('advance')}>Record advance</Button>
                  <Button size="sm" onClick={() => setPaying('payment')}>Record payment</Button>
                  <Button size="sm" variant="ghost" onClick={() => nav(`/finance/invoices/new?project=${p.id}`)}>Create invoice</Button>
                </div>
              )}
              {invs.length > 0 && (
                <ul className="mt-4 divide-y divide-line border-t border-line">
                  {invs.map((i) => (
                    <li key={i.id}><Link to={`/finance/invoices/${i.id}`} className="flex items-center gap-2 py-2.5 text-sm hover:text-white">
                      <ReceiptIndianRupee className="size-4 text-accent" /><span className="flex-1 tabular">{i.invoice_number}</span>
                      <span className="tabular">{formatINR(i.total, { whole: true })}</span><StatusBadge value={i.status} map={INVOICE_STATUS} />
                    </Link></li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display font-semibold"><UsersRound className="size-4 text-accent" />Team</h2>
              {isOps && teamEdit === null && <Button size="sm" variant="ghost" icon={<Pencil />} onClick={() => setTeamEdit(members)}>Assign</Button>}
            </div>
            {teamEdit !== null ? (
              <div className="space-y-3">
                <MemberPicker team={team} value={teamEdit} onChange={setTeamEdit} label="Assigned team" />
                <div className="flex gap-2">
                  <Button size="sm" variant="primary" loading={busy} onClick={async () => { await run(() => db.rpc('set_project_team', { p_project: p.id, p_members: teamEdit }), 'Team updated', 'project_team_members'); setTeamEdit(null) }}>Save team</Button>
                  <Button size="sm" variant="ghost" onClick={() => setTeamEdit(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {members.map((mid) => { const t = teamById.get(mid); return t && (
                  <li key={mid} className="flex items-center gap-3"><Avatar name={t.full_name} size={32} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{t.full_name}</span><span className="text-xs text-muted">{t.designation ?? ROLE_LABEL[t.role]}</span></span></li>
                ) })}
                {!members.length && <li className="text-sm text-muted">Nobody assigned yet.</li>}
              </ul>
            )}
          </Card>

          {log.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-3 font-display font-semibold">Recent activity</h2>
              <ol className="space-y-2.5">{log.map((a) => <li key={a.id} className="text-sm"><span className="text-fg-soft">{a.summary || a.action}</span><span className="block text-xs text-muted">{fmtDateTime(a.created_at)}</span></li>)}</ol>
            </Card>
          )}
        </div>
      </div>

      <ProjectForm open={editing} project={p} onClose={() => setEditing(false)} />
      <BookingForm open={booking} onClose={() => setBooking(false)} defaults={{ project_id: p.id, client_id: p.client_id, title: `${p.name} — Shoot`, crew: members }} />
      <PaymentForm open={paying !== null} onClose={() => setPaying(null)} defaults={{ project_id: p.id, is_advance: paying === 'advance' }} />
    </div>
  )
}
