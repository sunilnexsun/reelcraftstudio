import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'
import type { Booking } from '@/types/db'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/field'
import { MemberPicker, TagInput } from '@/components/forms/MemberPicker'
import { db } from '@/lib/data'
import { mutate, useTable } from '@/hooks/useData'
import { useLookups } from '@/hooks/useLookups'
import { ADVANCE_STATUS, BOOKING_STATUS, SHOOT_TYPES, enumOptions } from '@/lib/labels'
import { findConflicts } from '@/lib/domain/bookings'
import { dayKey, fmtDateTime, fmtTime, istInputToISO, isoToISTInput, todayIST } from '@/lib/domain/dates'
import { email, opt, phone, req, str, toText } from '@/lib/validation'

const schema = z.object({
  title: req('Title', 2, 160), client_id: z.string(), project_id: z.string(), shoot_type: opt(80),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'), start: z.string().regex(/^\d{2}:\d{2}$/, 'Start time'), end: z.string().regex(/^\d{2}:\d{2}$/, 'End time'),
  location: opt(300), status: z.string(), advance_status: z.string(), internal_notes: opt(4000),
  contact_name: opt(120), contact_phone: phone, contact_email: email,
}).refine((v) => v.end > v.start, { message: 'End must be after start', path: ['end'] })
type Values = z.infer<typeof schema>

export interface BookingDefaults { project_id?: string | null; client_id?: string | null; title?: string; crew?: string[]; date?: string; hour?: number }

export function BookingForm({ open, onClose, booking, defaults }: { open: boolean; onClose: () => void; booking?: Booking | null; defaults?: BookingDefaults }) {
  const { clientOptions, projectOptions, projectById, team, memberName } = useLookups()
  const bookings = useTable('bookings', open)
  const crewRows = useTable('booking_crew', open)
  const [crew, setCrew] = useState<string[]>([])
  const crewHydrated = useRef(false)
  const [equipment, setEquipment] = useState<string[]>([])
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!open) return
    const startLocal = booking ? isoToISTInput(booking.start_at) : null
    const endLocal = booking ? isoToISTInput(booking.end_at) : null
    const h = defaults?.hour ?? 10
    reset({
      title: booking?.title ?? defaults?.title ?? '', client_id: str(booking?.client_id ?? defaults?.client_id), project_id: str(booking?.project_id ?? defaults?.project_id),
      shoot_type: str(booking?.shoot_type), date: startLocal?.slice(0, 10) ?? defaults?.date ?? todayIST(),
      start: startLocal?.slice(11) ?? `${String(h).padStart(2, '0')}:00`, end: endLocal?.slice(11) ?? `${String(Math.min(h + 2, 23)).padStart(2, '0')}:00`,
      location: str(booking?.location), status: booking?.status ?? 'confirmed', advance_status: booking?.advance_status ?? 'pending',
      internal_notes: str(booking?.internal_notes), contact_name: str(booking?.contact_name), contact_phone: str(booking?.contact_phone), contact_email: str(booking?.contact_email),
    })
    setCrew(booking ? [] : defaults?.crew ?? [])
    setEquipment(booking?.equipment ?? [])
    crewHydrated.current = !booking
    // reset only when the dialog opens or switches record — never while the user is typing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, booking?.id, reset])

  // when editing, fill in the saved crew once their rows have loaded
  useEffect(() => {
    if (!open || !booking || crewHydrated.current || !crewRows.ready) return
    setCrew(crewRows.data.filter((c) => c.booking_id === booking.id).map((c) => c.team_member_id))
    crewHydrated.current = true
  }, [open, booking, crewRows.ready, crewRows.data])

  const [date, start, end, status, projectId] = watch(['date', 'start', 'end', 'status', 'project_id'])
  // picking a project fills in its client
  useEffect(() => { if (projectId && projectById.get(projectId)?.client_id) setValue('client_id', projectById.get(projectId)!.client_id!) }, [projectId, projectById, setValue])

  const startISO = date && start ? safeISO(`${date}T${start}`) : null
  const endISO = date && end ? safeISO(`${date}T${end}`) : null
  const crewMap = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const c of crewRows.data) m.set(c.booking_id, [...(m.get(c.booking_id) ?? []), c.team_member_id])
    return m
  }, [crewRows.data])
  const conflicts = useMemo(() => {
    if (!startISO || !endISO || endISO <= startISO || !['requested', 'confirmed'].includes(status)) return []
    return findConflicts({ start_at: startISO, end_at: endISO, crew, equipment, excludeId: booking?.id }, bookings.data, crewMap, memberName)
  }, [startISO, endISO, crew, equipment, status, bookings.data, crewMap, booking?.id, memberName])
  const busyIds = useMemo(() => {
    const s = new Set<string>()
    if (!startISO || !endISO) return s
    for (const c of findConflicts({ start_at: startISO, end_at: endISO, crew: team.map((t) => t.id), equipment: [], excludeId: booking?.id }, bookings.data, crewMap)) {
      for (const m of crewMap.get(c.booking_id) ?? []) s.add(m)
    }
    return s
  }, [startISO, endISO, team, bookings.data, crewMap, booking?.id])
  const equipmentSuggestions = useMemo(() => [...new Set(bookings.data.flatMap((b) => b.equipment))].sort(), [bookings.data])

  const submit = handleSubmit(async (v) => {
    if (conflicts.length) { toast.error('Resolve the schedule conflicts first'); return }
    const payload = {
      title: v.title.trim(), client_id: v.client_id || null, project_id: v.project_id || null, shoot_type: toText(v.shoot_type),
      start_at: istInputToISO(`${v.date}T${v.start}`), end_at: istInputToISO(`${v.date}T${v.end}`), location: toText(v.location), equipment,
      status: v.status as Booking['status'], advance_status: v.advance_status as Booking['advance_status'], internal_notes: toText(v.internal_notes),
      contact_name: toText(v.contact_name), contact_phone: toText(v.contact_phone), contact_email: toText(v.contact_email),
    }
    try {
      await mutate(async () => {
        if (booking) {
          await db.update('bookings', booking.id, payload)
          await db.rpc('set_booking_crew', { p_booking: booking.id, p_members: crew })
          return
        }
        const created = await db.insert('bookings', payload)
        try { await db.rpc('set_booking_crew', { p_booking: created.id, p_members: crew }) }
        catch (e) { await db.remove('bookings', created.id).catch(() => undefined); throw e } // keep the calendar clean if crew can't be assigned
      }, 'bookings', 'booking_crew')
      toast.success(booking ? 'Booking updated' : 'Shoot booked')
      onClose()
    } catch (e) { toast.error((e as Error).message) }
  })

  return (
    <Dialog open={open} onClose={onClose} size="lg" title={booking ? `Edit ${booking.code}` : 'Book a shoot'} description="Times are in India Standard Time (IST)."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={isSubmitting} disabled={conflicts.length > 0} onClick={submit}>{booking ? 'Save changes' : 'Book shoot'}</Button></>}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input label="Title" required autoFocus {...register('title')} error={errors.title?.message} wrapClassName="sm:col-span-2" placeholder="FitZone Gym – Promo Shoot" />
        <Select label="Project" options={projectOptions} placeholder="No project" {...register('project_id')} />
        <Select label="Client" options={clientOptions} placeholder="No client yet" {...register('client_id')} />
        <Input label="Date" type="date" required {...register('date')} error={errors.date?.message} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start" type="time" step={900} required {...register('start')} error={errors.start?.message} />
          <Input label="End" type="time" step={900} required {...register('end')} error={errors.end?.message} />
        </div>
        <Input label="Location" {...register('location')} placeholder="Sivakasi" />
        <Input label="Shoot type" list="shoot-types" {...register('shoot_type')} placeholder="Promo shoot" />
        <datalist id="shoot-types">{SHOOT_TYPES.map((s) => <option key={s} value={s} />)}</datalist>
        <Select label="Booking status" options={enumOptions(BOOKING_STATUS)} {...register('status')} />
        <Select label="Advance payment" options={enumOptions(ADVANCE_STATUS)} {...register('advance_status')} />
        <div className="sm:col-span-2"><MemberPicker team={team} value={crew} onChange={setCrew} label="Assigned crew" busyIds={busyIds} /></div>
        <div className="sm:col-span-2"><TagInput label="Equipment" value={equipment} onChange={setEquipment} suggestions={equipmentSuggestions} placeholder="Type an item and press Enter (e.g. Sony FX3 #1)" help="Name each physical item uniquely so double-bookings can be detected." /></div>
        {conflicts.length > 0 && (
          <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm sm:col-span-2">
            <p className="flex items-center gap-2 font-semibold text-red-300"><AlertTriangle className="size-4" />Schedule conflict</p>
            <ul className="mt-1.5 space-y-1 text-red-200/90">
              {conflicts.map((c) => <li key={c.booking_id}>{c.code} · {c.title} ({fmtDateTime(c.start_at)}–{dayKey(c.start_at) === dayKey(c.end_at) ? fmtTime(c.end_at) : fmtDateTime(c.end_at)}) — {c.reason}</li>)}
            </ul>
          </div>
        )}
        <details className="sm:col-span-2" open={!!booking?.contact_name}>
          <summary className="cursor-pointer text-sm font-medium text-fg-soft">Contact for a prospect (no client record yet)</summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <Input label="Name" {...register('contact_name')} />
            <Input label="Phone" type="tel" {...register('contact_phone')} error={errors.contact_phone?.message} />
            <Input label="Email" type="email" {...register('contact_email')} error={errors.contact_email?.message} />
          </div>
        </details>
        <Textarea label="Internal notes" rows={3} {...register('internal_notes')} wrapClassName="sm:col-span-2" placeholder="Parking, permissions, shot list link…" />
        <button type="submit" hidden />
      </form>
    </Dialog>
  )
}

function safeISO(local: string) { try { return istInputToISO(local) } catch { return null } }
