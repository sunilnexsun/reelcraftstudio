import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowRightLeft, CalendarClock, Pencil, Trash } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Enquiry, EnquiryFollowup } from '@/types/db'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { DetailRow } from '@/components/ui/card'
import { Select, Textarea, Input } from '@/components/ui/field'
import { useConfirm } from '@/components/ui/confirm'
import { ContactLinks } from '@/components/ContactLinks'
import { db } from '@/lib/data'
import { mutate, useTable } from '@/hooks/useData'
import { useLookups } from '@/hooks/useLookups'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { ENQUIRY_STATUS, LEAD_SOURCE, enumOptions } from '@/lib/labels'
import { fmtDate, todayIST } from '@/lib/domain/dates'
import { formatINR } from '@/lib/domain/money'
import { date, req, toDate } from '@/lib/validation'

const fuSchema = z.object({ note: req('Note', 1, 4000), channel: z.string(), next_follow_up: date })

export function EnquiryDetail({ enquiry, onClose, onEdit, onConvert }: {
  enquiry: Enquiry | null; onClose: () => void; onEdit: (e: Enquiry) => void; onConvert: (e: Enquiry) => void
}) {
  const { role, profile } = useAuth()
  const confirm = useConfirm()
  const { memberName, clientName } = useLookups()
  const followups = useTable('enquiry_followups', !!enquiry)
  const [statusBusy, setStatusBusy] = useState(false)
  const canEdit = can(role, 'enquiries', 'edit')
  const fu = useForm<z.infer<typeof fuSchema>>({ resolver: zodResolver(fuSchema), defaultValues: { note: '', channel: 'call', next_follow_up: '' } })

  if (!enquiry) return <Dialog open={false} onClose={onClose} title="">{null}</Dialog>
  const e = enquiry
  const logs = followups.data.filter((f) => f.enquiry_id === e.id).sort((a, b) => b.created_at.localeCompare(a.created_at))
  const overdue = e.follow_up_date && e.follow_up_date < todayIST() && !['converted', 'lost'].includes(e.status)

  const setStatus = async (status: Enquiry['status']) => {
    setStatusBusy(true)
    try { await mutate(() => db.update('enquiries', e.id, { status }), 'enquiries'); toast.success(`Marked ${ENQUIRY_STATUS[status].label}`) }
    catch (err) { toast.error((err as Error).message) } finally { setStatusBusy(false) }
  }

  const logFollowup = fu.handleSubmit(async (v) => {
    try {
      await mutate(async () => {
        await db.insert('enquiry_followups', { enquiry_id: e.id, note: v.note.trim(), channel: v.channel as EnquiryFollowup['channel'], next_follow_up: toDate(v.next_follow_up), created_by: profile?.id ?? null })
        const patch: Partial<Enquiry> = {}
        if (v.next_follow_up) patch.follow_up_date = v.next_follow_up
        if (e.status === 'new') patch.status = 'contacted'
        if (Object.keys(patch).length) await db.update('enquiries', e.id, patch)
      }, 'enquiry_followups', 'enquiries')
      fu.reset({ note: '', channel: v.channel, next_follow_up: '' })
      toast.success('Follow-up logged')
    } catch (err) { toast.error((err as Error).message) }
  })

  const remove = async () => {
    if (!(await confirm({ title: `Delete ${e.code}?`, description: 'The enquiry and its follow-up notes will be permanently removed.' }))) return
    try { await mutate(() => db.remove('enquiries', e.id), 'enquiries'); toast.success('Enquiry deleted'); onClose() } catch (err) { toast.error((err as Error).message) }
  }

  return (
    <Dialog open variant="sheet" size="lg" onClose={onClose}
      title={<span className="flex flex-wrap items-center gap-2">{e.client_name} <StatusBadge value={e.status} map={ENQUIRY_STATUS} /></span>}
      description={`${e.code} · received ${fmtDate(e.enquiry_date)}${e.submitted_via === 'website' ? ' via website form' : ''}`}
      footer={canEdit && <>
        <Button variant="ghost" className="mr-auto text-red-400" icon={<Trash />} onClick={remove}>Delete</Button>
        <Button icon={<Pencil />} onClick={() => onEdit(e)}>Edit</Button>
        {e.status !== 'converted' && <Button variant="primary" icon={<ArrowRightLeft />} onClick={() => onConvert(e)}>Convert to project</Button>}
      </>}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white/[0.02] p-4">
          <div className="min-w-0">
            <p className="font-semibold">{e.business_name ?? e.client_name}</p>
            <p className="text-sm text-muted">{[e.phone, e.email].filter(Boolean).join(' · ') || 'No contact details'}</p>
          </div>
          <ContactLinks phone={e.phone} email={e.email} size="md" message={`Hi ${e.client_name.split(' ')[0]}, this is ReelCraft Studio following up on your enquiry about ${e.service_label ?? 'a video project'}.`} />
        </div>

        {canEdit && (
          <div>
            <p className="label mb-2">Update status</p>
            <div className="flex flex-wrap gap-2">
              {enumOptions(ENQUIRY_STATUS).filter((o) => o.value !== 'converted').map((o) => (
                <button key={o.value} type="button" disabled={statusBusy || e.status === o.value} onClick={() => setStatus(o.value)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${e.status === o.value ? 'border-accent bg-accent-soft text-white' : 'border-line-strong text-fg-soft hover:border-white/30'}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <dl className="divide-y divide-line rounded-xl border border-line px-4">
          <DetailRow label="Service">{e.service_label}</DetailRow>
          <DetailRow label="Budget">{formatINR(e.budget, { whole: true })}</DetailRow>
          <DetailRow label="Lead source">{LEAD_SOURCE[e.lead_source]}</DetailRow>
          <DetailRow label="Follow-up">{e.follow_up_date ? <span className={overdue ? 'font-semibold text-red-400' : ''}>{fmtDate(e.follow_up_date)}{overdue && ' · overdue'}</span> : '—'}</DetailRow>
          <DetailRow label="Assigned to">{memberName(e.assigned_to)}</DetailRow>
          {e.client_id && <DetailRow label="Client"><Link className="text-accent hover:underline" to={`/clients/${e.client_id}`}>{clientName(e.client_id)}</Link></DetailRow>}
          {e.project_id && <DetailRow label="Project"><Link className="text-accent hover:underline" to={`/projects/${e.project_id}`}>Open project →</Link></DetailRow>}
          <DetailRow label="Notes"><span className="whitespace-pre-wrap">{e.notes}</span></DetailRow>
        </dl>

        <section aria-labelledby="fu-h">
          <h3 id="fu-h" className="mb-3 flex items-center gap-2 font-display font-semibold"><CalendarClock className="size-4 text-accent" />Follow-ups</h3>
          {canEdit && (
            <form onSubmit={logFollowup} className="mb-4 grid gap-3 rounded-xl border border-line bg-white/[0.02] p-4 sm:grid-cols-2" noValidate>
              <Textarea label="What happened?" rows={2} placeholder="Called — wants a quote for 3 reels by Friday" {...fu.register('note')} error={fu.formState.errors.note?.message} wrapClassName="sm:col-span-2" />
              <Select label="Channel" options={[{ value: 'call', label: 'Phone call' }, { value: 'whatsapp', label: 'WhatsApp' }, { value: 'email', label: 'Email' }, { value: 'meeting', label: 'Meeting' }, { value: 'other', label: 'Other' }]} {...fu.register('channel')} />
              <Input label="Next follow-up" type="date" min={todayIST()} {...fu.register('next_follow_up')} />
              <div className="sm:col-span-2"><Button type="submit" variant="primary" size="sm" loading={fu.formState.isSubmitting}>Log follow-up</Button></div>
            </form>
          )}
          <ol className="relative space-y-4 border-l border-line pl-5">
            {logs.map((f) => (
              <li key={f.id} className="relative">
                <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full bg-accent ring-4 ring-[#141414]" aria-hidden />
                <p className="text-sm whitespace-pre-wrap text-fg-soft">{f.note}</p>
                <p className="mt-1 text-xs text-muted">{f.channel} · {formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}{f.next_follow_up && ` · next ${fmtDate(f.next_follow_up)}`}</p>
              </li>
            ))}
            {!logs.length && <li className="text-sm text-muted">No follow-ups logged yet.</li>}
          </ol>
        </section>
      </div>
    </Dialog>
  )
}
