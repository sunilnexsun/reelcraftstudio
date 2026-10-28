import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Check, Minus, Pencil, Plus, Trash, UserRound, CalendarDays, Briefcase } from 'lucide-react'
import type { TeamMember } from '@/types/db'
import { Card, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Dialog } from '@/components/ui/dialog'
import { Input, Select, Switch } from '@/components/ui/field'
import { EmptyState } from '@/components/ui/states'
import { useConfirm } from '@/components/ui/confirm'
import { ContactLinks } from '@/components/ContactLinks'
import { TagInput } from '@/components/forms/MemberPicker'
import { DataTable, FilterSelect, SearchInput, Toolbar, type Column } from '@/components/tables/DataTable'
import { usePageHeader } from '@/components/layout/PageMeta'
import { db } from '@/lib/data'
import { mutate, useTable } from '@/hooks/useData'
import { useAuth } from '@/lib/auth'
import { can, canManageUsers, type Module } from '@/lib/permissions'
import { AVAILABILITY, BOOKING_STATUS, PROJECT_STATUS, ROLE_LABEL, enumOptions } from '@/lib/labels'
import { ACTIVE_PROJECT } from '@/lib/domain/reports'
import { fmtDate, fmtTime } from '@/lib/domain/dates'
import { email, opt, phone, req, str, toText } from '@/lib/validation'
import { matches } from '@/lib/utils'
import type { AppRole } from '@/types/db'

export default function TeamPage() {
  usePageHeader({ subtitle: 'Crew, roles and who is working on what.', showDateRange: false })
  const { role } = useAuth()
  const confirm = useConfirm()
  const { data, loading, error, refetch } = useTable('team_members')
  const ptm = useTable('project_team_members')
  const projects = useTable('projects')
  const crew = useTable('booking_crew')
  const bookings = useTable('bookings')
  const [q, setQ] = useState('')
  const [roleF, setRoleF] = useState('')
  const [editing, setEditing] = useState<TeamMember | null | undefined>(undefined)
  const [viewing, setViewing] = useState<TeamMember | null>(null)
  const canEdit = can(role, 'team', 'edit')
  const now = new Date().toISOString()

  const load = useMemo(() => {
    const active = new Set(projects.data.filter((p) => ACTIVE_PROJECT.includes(p.status)).map((p) => p.id))
    const upcoming = new Set(bookings.data.filter((b) => b.end_at >= now && ['confirmed', 'requested'].includes(b.status)).map((b) => b.id))
    const m = new Map<string, { projects: number; shoots: number }>()
    for (const t of data) m.set(t.id, { projects: ptm.data.filter((x) => x.team_member_id === t.id && active.has(x.project_id)).length, shoots: crew.data.filter((c) => c.team_member_id === t.id && upcoming.has(c.booking_id)).length })
    return m
  }, [data, ptm.data, projects.data, crew.data, bookings.data, now])

  const rows = data.filter((t) => (!roleF || t.role === roleF) && matches(q, t.full_name, t.email, t.phone, t.designation, t.skills.join(' ')))
  const remove = async (t: TeamMember) => {
    if (!(await confirm({ title: `Remove ${t.full_name}?`, description: 'They will be unassigned from projects and shoots. To keep history, mark them inactive instead.' }))) return
    try { await mutate(() => db.remove('team_members', t.id), 'team_members'); toast.success('Team member removed') } catch (e) { toast.error((e as Error).message) }
  }

  const columns: Column<TeamMember>[] = [
    { key: 'name', header: 'Name', sort: (t) => t.full_name, cell: (t) => <div className="flex items-center gap-3"><Avatar name={t.full_name} src={t.avatar_url} size={36} /><div className="min-w-0"><p className="truncate font-semibold text-fg">{t.full_name}</p><p className="truncate text-xs text-muted">{t.designation ?? ROLE_LABEL[t.role]}</p></div></div> },
    { key: 'role', header: 'Role', sort: (t) => t.role, cell: (t) => <Badge tone={t.role === 'owner' ? 'pink' : 'gray'}>{ROLE_LABEL[t.role]}</Badge>, hideBelow: 'md' },
    { key: 'avail', header: 'Availability', sort: (t) => t.availability, cell: (t) => <StatusBadge value={t.availability} map={AVAILABILITY} /> },
    { key: 'projects', header: 'Active projects', sort: (t) => load.get(t.id)?.projects, cell: (t) => <span className="tabular">{load.get(t.id)?.projects ?? 0}</span>, hideBelow: 'sm' },
    { key: 'shoots', header: 'Upcoming shoots', sort: (t) => load.get(t.id)?.shoots, cell: (t) => <span className="tabular">{load.get(t.id)?.shoots ?? 0}</span>, hideBelow: 'lg' },
    { key: 'status', header: 'Status', sort: (t) => (t.is_active ? 1 : 0), cell: (t) => (t.is_active ? <Badge tone="green" dot>Active</Badge> : <Badge>Inactive</Badge>), hideBelow: 'md' },
    { key: 'contact', header: <span className="sr-only">Actions</span>, className: 'w-px', cell: (t) => (
      <div className="flex items-center justify-end gap-1">
        <ContactLinks phone={t.phone} email={t.email} />
        {canEdit && <Button size="icon-sm" variant="ghost" aria-label={`Edit ${t.full_name}`} onClick={() => setEditing(t)}><Pencil /></Button>}
        {can(role, 'team', 'delete') && <Button size="icon-sm" variant="ghost" aria-label={`Remove ${t.full_name}`} className="hover:text-red-400" onClick={() => remove(t)}><Trash /></Button>}
      </div>
    ) },
  ]

  return (
    <div className="space-y-5">
      <Card>
        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder="Search name, skill, phone…" />
          <FilterSelect label="Role" value={roleF} onChange={setRoleF} options={enumOptions(ROLE_LABEL)} />
          <span className="flex-1" />
          {can(role, 'team', 'create') && <Button variant="primary" icon={<Plus />} onClick={() => setEditing(null)}>Add member</Button>}
        </Toolbar>
        <DataTable rows={rows} columns={columns} rowKey={(t) => t.id} onRowClick={setViewing} loading={loading} error={error?.message} onRetry={refetch} initialSort={{ key: 'name', dir: 'asc' }} minWidth={520}
          empty={<EmptyState icon={<UserRound />} title="No team members" />} />
      </Card>
      <PermissionMatrix />
      <MemberForm open={editing !== undefined} member={editing} onClose={() => setEditing(undefined)} />
      <MemberSheet member={viewing} onClose={() => setViewing(null)} />
    </div>
  )
}

function MemberSheet({ member, onClose }: { member: TeamMember | null; onClose: () => void }) {
  const ptm = useTable('project_team_members')
  const projects = useTable('projects')
  const crew = useTable('booking_crew')
  const bookings = useTable('bookings')
  if (!member) return null
  const mine = projects.data.filter((p) => ptm.data.some((x) => x.project_id === p.id && x.team_member_id === member.id) && !['delivered', 'cancelled'].includes(p.status))
  const shoots = bookings.data.filter((b) => crew.data.some((c) => c.booking_id === b.id && c.team_member_id === member.id) && b.end_at >= new Date().toISOString() && b.status !== 'cancelled').sort((a, b) => a.start_at.localeCompare(b.start_at))
  return (
    <Dialog open variant="sheet" onClose={onClose} title={member.full_name} description={`${member.designation ?? ''}${member.designation ? ' · ' : ''}${ROLE_LABEL[member.role]}`}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3"><StatusBadge value={member.availability} map={AVAILABILITY} /><ContactLinks phone={member.phone} email={member.email} size="md" /></div>
        {member.skills.length > 0 && <div className="flex flex-wrap gap-1.5">{member.skills.map((s) => <Badge key={s}>{s}</Badge>)}</div>}
        <section><h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Briefcase className="size-4 text-accent" />Assigned projects ({mine.length})</h3>
          <ul className="divide-y divide-line rounded-xl border border-line">{mine.map((p) => <li key={p.id}><Link to={`/projects/${p.id}`} className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-white/[0.03]"><span className="min-w-0 flex-1 truncate">{p.name}</span><StatusBadge value={p.status} map={PROJECT_STATUS} /></Link></li>)}{!mine.length && <li className="px-3 py-3 text-sm text-muted">No open projects.</li>}</ul>
        </section>
        <section><h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><CalendarDays className="size-4 text-accent" />Shoot schedule ({shoots.length})</h3>
          <ul className="divide-y divide-line rounded-xl border border-line">{shoots.map((b) => <li key={b.id}><Link to={`/bookings?open=${b.id}`} className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-white/[0.03]"><span className="w-28 shrink-0 text-xs text-muted">{fmtDate(b.start_at)}<br />{fmtTime(b.start_at)}</span><span className="min-w-0 flex-1 truncate">{b.title}</span><StatusBadge value={b.status} map={BOOKING_STATUS} /></Link></li>)}{!shoots.length && <li className="px-3 py-3 text-sm text-muted">No upcoming shoots.</li>}</ul>
        </section>
      </div>
    </Dialog>
  )
}

const schema = z.object({ full_name: req('Name', 2, 120), email, phone, role: z.string(), designation: opt(80), availability: z.string(), profile_id: z.string() })

function MemberForm({ open, member, onClose }: { open: boolean; member?: TeamMember | null; onClose: () => void }) {
  const { role } = useAuth()
  const profiles = useTable('profiles', open && canManageUsers(role))
  const team = useTable('team_members')
  const [skills, setSkills] = useState<string[]>([])
  const [active, setActive] = useState(true)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })
  useEffect(() => {
    if (!open) return
    reset({ full_name: str(member?.full_name), email: str(member?.email), phone: str(member?.phone), role: member?.role ?? 'editor', designation: str(member?.designation), availability: member?.availability ?? 'available', profile_id: str(member?.profile_id) })
    setSkills(member?.skills ?? []); setActive(member?.is_active ?? true)
  }, [open, member, reset])
  const linked = new Set(team.data.filter((t) => t.profile_id && t.id !== member?.id).map((t) => t.profile_id))
  const accountOptions = profiles.data.filter((p) => !linked.has(p.id)).map((p) => ({ value: p.id, label: `${p.full_name || p.email} (${p.email})` }))
  const submit = handleSubmit(async (v) => {
    const payload = { full_name: v.full_name.trim(), email: toText(v.email)?.toLowerCase() ?? null, phone: toText(v.phone), role: v.role as AppRole, designation: toText(v.designation), availability: v.availability as TeamMember['availability'], skills, is_active: active, ...(canManageUsers(role) ? { profile_id: v.profile_id || null } : {}) }
    try { await mutate(() => (member ? db.update('team_members', member.id, payload) : db.insert('team_members', payload)), 'team_members'); toast.success('Saved'); onClose() } catch (e) { toast.error((e as Error).message) }
  })
  return (
    <Dialog open={open} onClose={onClose} size="lg" title={member ? `Edit ${member.full_name}` : 'Add team member'}
      description="The role here is used for crew planning. App access is controlled by the linked login's role in Settings → Users."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={isSubmitting} onClick={submit}>Save</Button></>}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input label="Full name" required autoFocus {...register('full_name')} error={errors.full_name?.message} />
        <Input label="Designation" placeholder="Cinematographer" {...register('designation')} />
        <Input label="Phone" type="tel" {...register('phone')} error={errors.phone?.message} />
        <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
        <Select label="Role" options={enumOptions(ROLE_LABEL)} {...register('role')} />
        <Select label="Availability" options={enumOptions(AVAILABILITY)} {...register('availability')} />
        {canManageUsers(role) && <Select label="Linked login" options={accountOptions} placeholder="No app login" {...register('profile_id')} wrapClassName="sm:col-span-2" help="Link a login so this person sees 'assigned to me' work and can update their projects." />}
        <div className="sm:col-span-2"><TagInput label="Skills" value={skills} onChange={setSkills} placeholder="Drone, Premiere Pro…" /></div>
        <div className="sm:col-span-2"><Switch checked={active} onChange={setActive} label="Active" description="Inactive members can't be assigned to new work" /></div>
        <button type="submit" hidden />
      </form>
    </Dialog>
  )
}

function PermissionMatrix() {
  const modules: [Module, string][] = [['enquiries', 'Enquiries'], ['projects', 'Projects'], ['bookings', 'Bookings'], ['clients', 'Clients'], ['portfolio', 'Portfolio'], ['services', 'Services'], ['testimonials', 'Testimonials'], ['content', 'Content'], ['team', 'Team'], ['finance', 'Finance'], ['reports', 'Reports'], ['settings', 'Settings']]
  const roles: AppRole[] = ['owner', 'manager', 'editor', 'videographer', 'accounts']
  const cell = (r: AppRole, m: Module) => can(r, m, 'edit') || can(r, m, 'create') ? <span className="inline-flex items-center gap-1 text-emerald-400"><Check className="size-4" />Edit</span> : can(r, m) ? <span className="text-fg-soft">View</span> : <Minus className="size-4 text-faint" aria-label="No access" />
  return (
    <Card>
      <CardHeader title="Role permissions" subtitle="Enforced by the database (Row Level Security); the interface hides what each role can't use. Editors and videographers can update only projects they're assigned to." />
      <div className="scroll-x px-2 pb-4">
        <table className="w-full min-w-[640px] text-sm">
          <thead><tr className="border-b border-line"><th className="th">Module</th>{roles.map((r) => <th key={r} className="th">{ROLE_LABEL[r]}</th>)}</tr></thead>
          <tbody>{modules.map(([m, label]) => <tr key={m} className="border-b border-line last:border-0"><td className="td font-medium">{label}</td>{roles.map((r) => <td key={r} className="td">{cell(r, m)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </Card>
  )
}
