import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Copy, Info, Plus, Trash } from 'lucide-react'
import type { ContentItem } from '@/types/db'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Input, Select, Textarea } from '@/components/ui/field'
import { ErrorState, LoadingBlock } from '@/components/ui/states'
import { useConfirm } from '@/components/ui/confirm'
import { TagInput } from '@/components/forms/MemberPicker'
import { FilterSelect } from '@/components/tables/DataTable'
import { CalendarHeader, MonthGrid, TimeGrid, type CalEvent, type CalView } from '@/components/calendar/Calendar'
import { usePageHeader } from '@/components/layout/PageMeta'
import { db } from '@/lib/data'
import { mutate, useTable } from '@/hooks/useData'
import { useLookups } from '@/hooks/useLookups'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { CONTENT_FORMAT, CONTENT_PLATFORM, CONTENT_STATUS, PLATFORM_COLOR, enumOptions } from '@/lib/labels'
import { fmtDateTime, isoToISTInput, istInputToISO, todayIST } from '@/lib/domain/dates'
import { opt, req, str, toText } from '@/lib/validation'

export default function ContentPage() {
  usePageHeader({ subtitle: 'Plan posts across platforms. This is a planning tool — publishing happens in each platform.', showDateRange: false })
  const { role } = useAuth()
  const [params, setParams] = useSearchParams()
  const { data, loading, error, refetch } = useTable('content_calendar')
  const { memberName } = useLookups()
  const [view, setView] = useState<CalView | 'board'>('month')
  const [cursor, setCursor] = useState(todayIST())
  const [platform, setPlatform] = useState('')
  const [form, setForm] = useState<{ item?: ContentItem | null; date?: string; hour?: number } | null>(params.get('new') ? { item: null } : null)
  const canEdit = can(role, 'content', 'edit')

  const rows = data.filter((c) => !platform || c.platform === platform)
  const events: CalEvent[] = rows.filter((c) => c.scheduled_at).map((c) => ({ id: c.id, start: c.scheduled_at!, title: `${CONTENT_PLATFORM[c.platform]} · ${c.title}`, subtitle: `${CONTENT_FORMAT[c.format]} · ${CONTENT_STATUS[c.status].label}`, color: PLATFORM_COLOR[c.platform], muted: c.status === 'published' }))
  const unscheduled = rows.filter((c) => !c.scheduled_at)
  const open = (id: string) => setForm({ item: data.find((c) => c.id === id) ?? null })
  const close = () => { setForm(null); if (params.get('new')) setParams({}, { replace: true }) }

  if (error) return <Card><ErrorState message={error.message} onRetry={refetch} /></Card>
  return (
    <div className="space-y-4">
      <Card>
        <CalendarHeader cursor={cursor} onCursor={setCursor} view={view === 'board' ? 'month' : view} onView={setView} views={['month', 'week']}
          extra={<>
            <button type="button" onClick={() => setView(view === 'board' ? 'month' : 'board')} className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${view === 'board' ? 'border-accent bg-accent text-white' : 'border-line-strong text-fg-soft'}`} aria-pressed={view === 'board'}>Status board</button>
            <FilterSelect label="Platform" value={platform} onChange={setPlatform} options={enumOptions(CONTENT_PLATFORM)} className="h-8 min-w-32 text-xs" />
            {can(role, 'content', 'create') && <Button size="sm" variant="primary" icon={<Plus />} onClick={() => setForm({ item: null, date: cursor })}>New post</Button>}
          </>} />
        {loading && !data.length ? <LoadingBlock /> : view === 'board' ? (
          <div className="scroll-x p-3"><div className="flex min-w-[1100px] gap-3">
            {enumOptions(CONTENT_STATUS).map((s) => {
              const items = rows.filter((c) => c.status === s.value).sort((a, b) => (a.scheduled_at ?? '9').localeCompare(b.scheduled_at ?? '9'))
              return (
                <section key={s.value} className="flex w-1/6 min-w-44 flex-col rounded-2xl border border-line bg-surface/60" aria-label={s.label}>
                  <h3 className="flex items-center justify-between px-3 pt-3 pb-2 text-[13px] font-semibold">{s.label}<span className="rounded-full bg-white/8 px-2 text-xs text-muted">{items.length}</span></h3>
                  <ul className="space-y-2 px-2 pb-2">
                    {items.map((c) => (
                      <li key={c.id}><button type="button" onClick={() => open(c.id)} className="w-full rounded-xl border border-line bg-[#171717] p-3 text-left hover:border-white/20" style={{ boxShadow: `inset 3px 0 0 ${PLATFORM_COLOR[c.platform]}` }}>
                        <p className="line-clamp-2 text-sm font-medium">{c.title}</p>
                        <p className="mt-1 text-[11px] text-muted">{CONTENT_PLATFORM[c.platform]} · {CONTENT_FORMAT[c.format]}</p>
                        <p className="mt-1 text-[11px] text-faint">{c.scheduled_at ? fmtDateTime(c.scheduled_at) : 'Not scheduled'} · {memberName(c.assigned_to)}</p>
                      </button></li>
                    ))}
                  </ul>
                </section>
              )
            })}
          </div></div>
        ) : view === 'month' ? <MonthGrid cursor={cursor} events={events} onSelect={open} onDayClick={canEdit ? (d) => setForm({ item: null, date: d }) : undefined} />
          : <TimeGrid cursor={cursor} view="week" events={events} onSelect={open} onSlotClick={canEdit ? (d, h) => setForm({ item: null, date: d, hour: h }) : undefined} />}
        <div className="flex flex-wrap gap-4 border-t border-line px-5 py-3 text-xs text-muted">
          {(Object.keys(PLATFORM_COLOR) as ContentItem['platform'][]).map((p) => <span key={p} className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: PLATFORM_COLOR[p] }} />{CONTENT_PLATFORM[p]}</span>)}
        </div>
      </Card>
      {unscheduled.length > 0 && view !== 'board' && (
        <Card className="p-4 sm:p-5">
          <p className="mb-3 text-sm font-semibold">Ideas without a date ({unscheduled.length})</p>
          <div className="flex flex-wrap gap-2">{unscheduled.map((c) => <button key={c.id} type="button" onClick={() => open(c.id)} className="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-white/25">{c.title}</button>)}</div>
        </Card>
      )}
      <ContentForm open={!!form} item={form?.item} date={form?.date} hour={form?.hour} onClose={close} />
    </div>
  )
}

const schema = z.object({ title: req('Title', 2, 160), platform: z.string(), format: z.string(), caption: opt(2200), date: z.string(), time: z.string(), assigned_to: z.string(), status: z.string(), project_id: z.string() })
  .refine((v) => !v.time || v.date, { message: 'Pick a date for this time', path: ['date'] })

function ContentForm({ open, item, date, hour, onClose }: { open: boolean; item?: ContentItem | null; date?: string; hour?: number; onClose: () => void }) {
  const { role } = useAuth()
  const confirm = useConfirm()
  const { teamOptions, projectOptions } = useLookups()
  const [tags, setTags] = useState<string[]>([])
  const readOnly = !can(role, 'content', 'edit')
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })
  useEffect(() => {
    if (!open) return
    const local = item?.scheduled_at ? isoToISTInput(item.scheduled_at) : null
    reset({ title: str(item?.title), platform: item?.platform ?? 'instagram', format: item?.format ?? 'reel', caption: str(item?.caption), date: local?.slice(0, 10) ?? date ?? '', time: local?.slice(11) ?? (hour != null ? `${String(hour).padStart(2, '0')}:00` : date ? '18:00' : ''), assigned_to: str(item?.assigned_to), status: item?.status ?? 'idea', project_id: str(item?.project_id) })
    setTags(item?.hashtags ?? [])
  }, [open, item, date, hour, reset])
  const caption = watch('caption') ?? ''
  const allHashtags = useMemo(() => tags.map((t) => (t.startsWith('#') ? t : `#${t}`)), [tags])

  const submit = handleSubmit(async (v) => {
    const payload = { title: v.title.trim(), platform: v.platform as ContentItem['platform'], format: v.format as ContentItem['format'], caption: toText(v.caption), hashtags: allHashtags, scheduled_at: v.date ? istInputToISO(`${v.date}T${v.time || '12:00'}`) : null, assigned_to: v.assigned_to || null, status: v.status as ContentItem['status'], project_id: v.project_id || null }
    try { await mutate(() => (item ? db.update('content_calendar', item.id, payload) : db.insert('content_calendar', payload)), 'content_calendar'); toast.success('Saved'); onClose() } catch (e) { toast.error((e as Error).message) }
  })
  const remove = async () => {
    if (!item || !(await confirm({ title: `Delete “${item.title}”?` }))) return
    try { await mutate(() => db.remove('content_calendar', item.id), 'content_calendar'); toast.success('Deleted'); onClose() } catch (e) { toast.error((e as Error).message) }
  }
  const copy = () => { void navigator.clipboard?.writeText([caption, allHashtags.join(' ')].filter(Boolean).join('\n\n')).then(() => toast.success('Caption and hashtags copied')) }

  return (
    <Dialog open={open} onClose={onClose} size="lg" title={item ? item.title : 'New content post'} description="Times in IST."
      footer={<>
        {item && !readOnly && <Button variant="ghost" className="mr-auto text-red-400" icon={<Trash />} onClick={remove}>Delete</Button>}
        <Button variant="ghost" icon={<Copy />} onClick={copy}>Copy caption</Button>
        {!readOnly && <Button variant="primary" loading={isSubmitting} onClick={submit}>Save</Button>}
      </>}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <fieldset disabled={readOnly} className="contents">
          <Input label="Title" required autoFocus {...register('title')} error={errors.title?.message} wrapClassName="sm:col-span-2" />
          <Select label="Platform" options={enumOptions(CONTENT_PLATFORM)} {...register('platform')} />
          <Select label="Format" options={enumOptions(CONTENT_FORMAT)} {...register('format')} />
          <Input label="Scheduled date" type="date" {...register('date')} error={errors.date?.message} />
          <Input label="Time" type="time" step={900} {...register('time')} />
          <Select label="Status" options={enumOptions(CONTENT_STATUS)} {...register('status')} />
          <Select label="Assigned to" options={teamOptions} placeholder="Unassigned" {...register('assigned_to')} />
          <Select label="Related project" options={projectOptions} placeholder="—" {...register('project_id')} wrapClassName="sm:col-span-2" />
          <Textarea label="Caption" rows={5} {...register('caption')} error={errors.caption?.message} wrapClassName="sm:col-span-2" help={`${caption.length}/2200 characters`} />
          <div className="sm:col-span-2"><TagInput label="Hashtags" value={tags} onChange={setTags} placeholder="#ReelCraftStudio" /></div>
        </fieldset>
        <p className="flex items-start gap-2 text-xs text-muted sm:col-span-2"><Info className="mt-0.5 size-3.5 shrink-0" />Marking a post “Scheduled” or “Published” only updates this plan. Nothing is posted automatically — no platform integration is configured.</p>
        {item && <p className="text-xs text-faint sm:col-span-2"><StatusBadge value={item.status} map={CONTENT_STATUS} /> · last updated {fmtDateTime(item.updated_at)}</p>}
        <button type="submit" hidden />
      </form>
    </Dialog>
  )
}
