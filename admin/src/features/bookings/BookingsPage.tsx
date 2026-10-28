import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarPlus, CheckCircle2, MapPin, Package, Pencil, Trash, UserPlus, UsersRound, XCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'
import type { Booking } from '@/types/db'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Dialog } from '@/components/ui/dialog'
import { DetailRow } from '@/components/ui/card'
import { ErrorState, LoadingBlock, EmptyState } from '@/components/ui/states'
import { useConfirm } from '@/components/ui/confirm'
import { ContactLinks } from '@/components/ContactLinks'
import { FilterSelect } from '@/components/tables/DataTable'
import { CalendarHeader, MonthGrid, TimeGrid, type CalEvent, type CalView } from '@/components/calendar/Calendar'
import { usePageHeader } from '@/components/layout/PageMeta'
import { db } from '@/lib/data'
import { mutate, useTable } from '@/hooks/useData'
import { useLookups } from '@/hooks/useLookups'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { ADVANCE_STATUS, BOOKING_STATUS, enumOptions } from '@/lib/labels'
import { dayKey, fmtDate, fmtTime, todayIST } from '@/lib/domain/dates'
import { BookingForm, type BookingDefaults } from './BookingForm'

export const BOOKING_COLOR: Record<Booking['status'], string> = { confirmed: '#FF1744', requested: '#F59E0B', completed: '#60A5FA', cancelled: '#737373' }

export default function BookingsPage() {
  usePageHeader({ subtitle: 'Shoot calendar, crew and equipment — clashes are blocked automatically.', showDateRange: false })
  const { role, teamMemberId } = useAuth()
  const { data, loading, error, refetch } = useTable('bookings')
  const crew = useTable('booking_crew')
  const { teamOptions, clientName } = useLookups()
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState<CalView | 'list'>('month')
  const [cursor, setCursor] = useState(todayIST())
  const [status, setStatus] = useState('')
  const [member, setMember] = useState('')
  const [form, setForm] = useState<{ booking?: Booking | null; defaults?: BookingDefaults } | null>(null)
  const openId = params.get('open')
  const open = data.find((b) => b.id === openId) ?? null
  const setOpen = (id: string | null) => { const p = new URLSearchParams(params); if (id) p.set('open', id); else p.delete('open'); setParams(p, { replace: true }) }
  const canCreate = can(role, 'bookings', 'create')

  const crewOf = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const c of crew.data) m.set(c.booking_id, [...(m.get(c.booking_id) ?? []), c.team_member_id])
    return m
  }, [crew.data])

  const filtered = data.filter((b) => (!status || b.status === status) && (!member || (crewOf.get(b.id) ?? []).includes(member === 'me' ? teamMemberId ?? '' : member)))
  const events: CalEvent[] = filtered.map((b) => ({
    id: b.id, start: b.start_at, end: b.end_at, title: b.title, color: BOOKING_COLOR[b.status], muted: b.status === 'cancelled',
    subtitle: `${fmtTime(b.start_at)} · ${b.location ?? ''}`,
  }))
  const requests = data.filter((b) => b.status === 'requested').sort((a, b) => a.start_at.localeCompare(b.start_at))
  const upcoming = filtered.filter((b) => b.end_at >= new Date().toISOString() && b.status !== 'cancelled').sort((a, b) => a.start_at.localeCompare(b.start_at))

  if (error) return <Card><ErrorState message={error.message} onRetry={refetch} /></Card>

  return (
    <div className="space-y-4">
      {requests.length > 0 && can(role, 'bookings', 'edit') && (
        <Card className="border-amber-400/25 p-4 sm:p-5">
          <p className="mb-3 flex items-center gap-2 font-semibold text-amber-200"><Clock className="size-4" />{requests.length} booking request{requests.length > 1 ? 's' : ''} awaiting confirmation</p>
          <ul className="grid gap-2 md:grid-cols-2">
            {requests.slice(0, 4).map((b) => (
              <li key={b.id}><button type="button" onClick={() => setOpen(b.id)} className="flex w-full items-center gap-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5 text-left hover:border-white/20">
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{b.title}</span><span className="text-xs text-muted">{fmtDate(b.start_at)} · {fmtTime(b.start_at)} · {b.location ?? 'Location TBC'}{b.submitted_via === 'website' && ' · from website'}</span></span>
                <span className="text-xs font-semibold text-accent">Review →</span>
              </button></li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <CalendarHeader cursor={cursor} onCursor={setCursor} view={view === 'list' ? 'month' : view} onView={setView}
          extra={<>
            <button type="button" onClick={() => setView(view === 'list' ? 'month' : 'list')} className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${view === 'list' ? 'border-accent bg-accent text-white' : 'border-line-strong text-fg-soft'}`} aria-pressed={view === 'list'}>Agenda</button>
            <FilterSelect label="Status" value={status} onChange={setStatus} options={enumOptions(BOOKING_STATUS)} className="h-8 min-w-32 text-xs" />
            <FilterSelect label="Crew" value={member} onChange={setMember} options={[...(teamMemberId ? [{ value: 'me', label: 'My shoots' }] : []), ...teamOptions]} className="hidden h-8 min-w-32 text-xs sm:block" />
            {canCreate && <Button size="sm" variant="primary" icon={<CalendarPlus />} onClick={() => setForm({ defaults: { date: cursor } })}>Book shoot</Button>}
          </>} />
        {loading && !data.length ? <LoadingBlock /> : view === 'month' ? (
          <MonthGrid cursor={cursor} events={events} onSelect={setOpen} onDayClick={(d) => { setCursor(d); setView('day') }} />
        ) : view === 'list' ? (
          upcoming.length ? (
            <ul className="divide-y divide-line">
              {upcoming.map((b) => (
                <li key={b.id}><button type="button" onClick={() => setOpen(b.id)} className="flex w-full flex-wrap items-center gap-4 px-4 py-3 text-left hover:bg-white/[0.03] sm:px-5">
                  <span className="w-20 shrink-0 text-center"><span className="block text-xs text-muted">{fmtDate(b.start_at).split(',')[0]}</span><span className="block font-display font-semibold tabular">{fmtTime(b.start_at)}</span></span>
                  <span className="h-10 w-1 rounded-full" style={{ background: BOOKING_COLOR[b.status] }} aria-hidden />
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium">{b.title}</span><span className="text-xs text-muted">{b.location ?? 'Location TBC'} · {(crewOf.get(b.id) ?? []).length} crew</span></span>
                  <StatusBadge value={b.status} map={BOOKING_STATUS} />
                </button></li>
              ))}
            </ul>
          ) : <EmptyState title="No upcoming shoots" description="Book a shoot to see it here." />
        ) : (
          <TimeGrid cursor={cursor} view={view} events={events} onSelect={setOpen} onSlotClick={canCreate ? (d, h) => setForm({ defaults: { date: d, hour: h } }) : undefined} />
        )}
        <div className="flex flex-wrap gap-4 border-t border-line px-5 py-3 text-xs text-muted">
          {(Object.keys(BOOKING_COLOR) as Booking['status'][]).map((s) => <span key={s} className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: BOOKING_COLOR[s] }} />{BOOKING_STATUS[s].label}</span>)}
          <span className="ml-auto">All times IST</span>
        </div>
      </Card>

      <BookingDetail booking={open} crewIds={open ? crewOf.get(open.id) ?? [] : []} clientLabel={open ? clientName(open.client_id) : ''} onClose={() => setOpen(null)} onEdit={(b) => setForm({ booking: b })} />
      <BookingForm open={!!form} booking={form?.booking} defaults={form?.defaults} onClose={() => setForm(null)} />
    </div>
  )
}

function BookingDetail({ booking: b, crewIds, clientLabel, onClose, onEdit }: { booking: Booking | null; crewIds: string[]; clientLabel: string; onClose: () => void; onEdit: (b: Booking) => void }) {
  const { role } = useAuth()
  const confirm = useConfirm()
  const { teamById, projectById } = useLookups()
  const [busy, setBusy] = useState(false)
  if (!b) return null
  const canEdit = can(role, 'bookings', 'edit')
  const set = async (patch: Partial<Booking>, ok: string) => {
    setBusy(true)
    try { await mutate(() => db.update('bookings', b.id, patch), 'bookings'); toast.success(ok) } catch (e) { toast.error((e as Error).message) } finally { setBusy(false) }
  }
  const createClient = async () => {
    setBusy(true)
    try {
      await mutate(async () => {
        const c = await db.insert('clients', { name: b.contact_name ?? b.title, phone: b.contact_phone, whatsapp: b.contact_phone, email: b.contact_email, client_type: 'individual', notes: `Created from booking request ${b.code}` })
        await db.update('bookings', b.id, { client_id: c.id })
      }, 'clients', 'bookings')
      toast.success('Client created and linked')
    } catch (e) { toast.error((e as Error).message) } finally { setBusy(false) }
  }
  const remove = async () => {
    if (!(await confirm({ title: `Delete ${b.code}?`, description: 'The booking and its crew assignments will be removed. Consider marking it Cancelled instead to keep history.' }))) return
    try { await mutate(() => db.remove('bookings', b.id), 'bookings'); toast.success('Booking deleted'); onClose() } catch (e) { toast.error((e as Error).message) }
  }
  const project = b.project_id ? projectById.get(b.project_id) : null

  return (
    <Dialog open variant="sheet" size="md" onClose={onClose}
      title={<span className="flex flex-wrap items-center gap-2">{b.title}<StatusBadge value={b.status} map={BOOKING_STATUS} /></span>}
      description={`${b.code} · ${fmtDate(b.start_at)}, ${fmtTime(b.start_at)} – ${dayKey(b.start_at) === dayKey(b.end_at) ? fmtTime(b.end_at) : fmtDate(b.end_at) + ' ' + fmtTime(b.end_at)} IST`}
      footer={canEdit && <>
        <Button variant="ghost" className="mr-auto text-red-400" icon={<Trash />} onClick={remove}>Delete</Button>
        {b.status === 'requested' && <Button variant="primary" icon={<CheckCircle2 />} loading={busy} onClick={() => set({ status: 'confirmed' }, 'Booking confirmed')}>Confirm</Button>}
        {b.status === 'confirmed' && b.end_at < new Date().toISOString() && <Button icon={<CheckCircle2 />} loading={busy} onClick={() => set({ status: 'completed' }, 'Marked completed')}>Mark completed</Button>}
        {['requested', 'confirmed'].includes(b.status) && <Button variant="ghost" icon={<XCircle />} disabled={busy} onClick={async () => { if (await confirm({ title: 'Cancel this booking?', description: 'Crew and equipment will be freed for this slot.', confirmLabel: 'Cancel booking' })) void set({ status: 'cancelled' }, 'Booking cancelled') }}>Cancel</Button>}
        <Button icon={<Pencil />} onClick={() => onEdit(b)}>Edit</Button>
      </>}>
      <div className="space-y-5">
        {b.submitted_via === 'website' && <Badge tone="amber">Requested via website — confirm crew and advance before confirming</Badge>}
        {(b.contact_name || b.contact_phone) && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white/[0.02] p-4">
            <div><p className="font-semibold">{b.contact_name}</p><p className="text-sm text-muted">{[b.contact_phone, b.contact_email].filter(Boolean).join(' · ')}</p></div>
            <div className="flex items-center gap-2">
              <ContactLinks phone={b.contact_phone} email={b.contact_email} size="md" />
              {!b.client_id && can(role, 'clients', 'create') && <Button size="sm" icon={<UserPlus />} loading={busy} onClick={createClient}>Create client</Button>}
            </div>
          </div>
        )}
        <dl className="divide-y divide-line rounded-xl border border-line px-4">
          <DetailRow label="Client">{b.client_id ? <Link className="text-accent hover:underline" to={`/clients/${b.client_id}`}>{clientLabel}</Link> : '—'}</DetailRow>
          <DetailRow label="Project">{project ? <Link className="text-accent hover:underline" to={`/projects/${project.id}`}>{project.name}</Link> : '—'}</DetailRow>
          <DetailRow label="Shoot type">{b.shoot_type}</DetailRow>
          <DetailRow label={<span className="flex items-center gap-1"><MapPin className="size-3.5" />Location</span>}>{b.location}</DetailRow>
          <DetailRow label="Advance">{<StatusBadge value={b.advance_status} map={ADVANCE_STATUS} />}</DetailRow>
          <DetailRow label="Notes"><span className="whitespace-pre-wrap">{b.internal_notes}</span></DetailRow>
        </dl>
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><UsersRound className="size-4 text-accent" />Crew</h3>
          <ul className="flex flex-wrap gap-2">
            {crewIds.map((id) => <li key={id} className="flex items-center gap-2 rounded-full border border-line py-1 pr-3 pl-1 text-sm"><Avatar name={teamById.get(id)?.full_name} size={24} />{teamById.get(id)?.full_name}</li>)}
            {!crewIds.length && <li className="text-sm text-muted">No crew assigned.</li>}
          </ul>
        </section>
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Package className="size-4 text-accent" />Equipment</h3>
          <div className="flex flex-wrap gap-1.5">{b.equipment.length ? b.equipment.map((e) => <Badge key={e}>{e}</Badge>) : <span className="text-sm text-muted">None listed.</span>}</div>
        </section>
      </div>
    </Dialog>
  )
}
