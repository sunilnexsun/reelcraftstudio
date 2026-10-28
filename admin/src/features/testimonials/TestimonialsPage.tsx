import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, Check, MessageSquareQuote, Pencil, Plus, Star, Trash, X } from 'lucide-react'
import type { Testimonial } from '@/types/db'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Dialog } from '@/components/ui/dialog'
import { Input, Select, Switch, Textarea } from '@/components/ui/field'
import { Tabs } from '@/components/ui/segmented'
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/states'
import { useConfirm } from '@/components/ui/confirm'
import { ImageUpload } from '@/components/forms/FileUpload'
import { usePageHeader } from '@/components/layout/PageMeta'
import { db } from '@/lib/data'
import { mutate, useTable } from '@/hooks/useData'
import { useLookups } from '@/hooks/useLookups'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { TESTIMONIAL_STATUS, enumOptions } from '@/lib/labels'
import { opt, req, str, toText } from '@/lib/validation'
import { cn } from '@/lib/utils'

type Tab = 'all' | Testimonial['status']

export function Stars({ value, onChange, size = 16 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  return (
    <div className="flex gap-0.5" role={onChange ? 'radiogroup' : 'img'} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => onChange
        ? <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => onChange(n)}><Star style={{ width: size + 6, height: size + 6 }} className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-white/20'} /></button>
        : <Star key={n} style={{ width: size, height: size }} className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-white/20'} aria-hidden />)}
    </div>
  )
}

export default function TestimonialsPage() {
  usePageHeader({ subtitle: 'Approved testimonials appear on the website in the order shown here.', showDateRange: false })
  const { role } = useAuth()
  const confirm = useConfirm()
  const { data, loading, error, refetch } = useTable('testimonials')
  const [tab, setTab] = useState<Tab>('all')
  const [editing, setEditing] = useState<Testimonial | null | undefined>(undefined)
  const canEdit = can(role, 'testimonials', 'edit')
  const sorted = useMemo(() => [...data].sort((a, b) => a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at)), [data])
  const rows = sorted.filter((t) => tab === 'all' || t.status === tab)

  const patch = async (t: Testimonial, change: Partial<Testimonial>, ok: string) => { try { await mutate(() => db.update('testimonials', t.id, change), 'testimonials'); toast.success(ok) } catch (e) { toast.error((e as Error).message) } }
  const move = async (t: Testimonial, dir: -1 | 1) => {
    const list = [...sorted]; const i = list.findIndex((x) => x.id === t.id); const j = i + dir
    if (j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    try { await mutate(() => Promise.all(list.map((x, k) => (x.sort_order !== k ? db.update('testimonials', x.id, { sort_order: k }) : null))), 'testimonials') } catch (e) { toast.error((e as Error).message) }
  }
  const remove = async (t: Testimonial) => { if (await confirm({ title: `Delete ${t.client_name}'s testimonial?` })) { try { await mutate(() => db.remove('testimonials', t.id), 'testimonials'); toast.success('Deleted') } catch (e) { toast.error((e as Error).message) } } }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-2 sm:px-5">
        <Tabs<Tab> value={tab} onChange={setTab} className="border-0" tabs={[{ value: 'all', label: 'All', count: data.length }, ...enumOptions(TESTIMONIAL_STATUS).map((o) => ({ value: o.value as Tab, label: o.label, count: data.filter((t) => t.status === o.value).length }))]} />
        {can(role, 'testimonials', 'create') && <Button variant="primary" icon={<Plus />} onClick={() => setEditing(null)} className="my-2">Add testimonial</Button>}
      </div>
      {error ? <ErrorState message={error.message} onRetry={refetch} /> : loading && !data.length ? <LoadingBlock /> : !rows.length ? (
        <EmptyState icon={<MessageSquareQuote />} title="No testimonials here" description="Collect a quote after delivery and add it here for approval." />
      ) : (
        <ul className="grid gap-4 border-t border-line p-4 sm:p-5 lg:grid-cols-2">
          {rows.map((t) => {
            const i = sorted.findIndex((x) => x.id === t.id)
            return (
              <li key={t.id} className={cn('flex flex-col rounded-2xl border bg-[#151515] p-5', t.is_featured ? 'border-accent/40' : 'border-line')}>
                <div className="flex items-start gap-3">
                  <Avatar name={t.client_name} src={t.avatar_url} size={44} />
                  <div className="min-w-0 flex-1"><p className="font-semibold">{t.client_name}</p><p className="text-xs text-muted">{t.company}</p></div>
                  <div className="flex flex-col items-end gap-1.5"><StatusBadge value={t.status} map={TESTIMONIAL_STATUS} />{t.is_featured && <span className="flex items-center gap-1 text-[11px] font-semibold text-accent"><Star className="size-3 fill-current" />Featured</span>}</div>
                </div>
                <Stars value={t.rating} />
                <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-fg-soft">“{t.content}”</blockquote>
                {canEdit && (
                  <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-line pt-3">
                    {t.status !== 'approved' && <Button size="sm" variant="primary" icon={<Check />} onClick={() => patch(t, { status: 'approved' }, 'Approved — now on the website')}>Approve</Button>}
                    {t.status !== 'rejected' && <Button size="sm" variant="ghost" icon={<X />} onClick={() => patch(t, { status: 'rejected', is_featured: false }, 'Rejected')}>Reject</Button>}
                    <Button size="icon-sm" variant="ghost" aria-label={t.is_featured ? 'Unfeature' : 'Feature'} aria-pressed={t.is_featured} disabled={t.status !== 'approved'} onClick={() => patch(t, { is_featured: !t.is_featured }, t.is_featured ? 'Unfeatured' : 'Featured')}><Star className={t.is_featured ? 'fill-accent text-accent' : ''} /></Button>
                    <span className="flex-1" />
                    <Button size="icon-sm" variant="ghost" aria-label="Move earlier" disabled={tab !== 'all' || i === 0} onClick={() => move(t, -1)}><ArrowUp /></Button>
                    <Button size="icon-sm" variant="ghost" aria-label="Move later" disabled={tab !== 'all' || i === sorted.length - 1} onClick={() => move(t, 1)}><ArrowDown /></Button>
                    <Button size="icon-sm" variant="ghost" aria-label="Edit" onClick={() => setEditing(t)}><Pencil /></Button>
                    <Button size="icon-sm" variant="ghost" aria-label="Delete" className="hover:text-red-400" onClick={() => remove(t)}><Trash /></Button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <TestimonialForm open={editing !== undefined} item={editing} onClose={() => setEditing(undefined)} nextOrder={sorted.length} />
    </Card>
  )
}

const schema = z.object({ client_name: req('Name', 2, 120), company: opt(120), content: req('Testimonial', 10, 2000), status: z.string(), client_id: z.string() })

function TestimonialForm({ open, item, onClose, nextOrder }: { open: boolean; item?: Testimonial | null; onClose: () => void; nextOrder: number }) {
  const { clientOptions } = useLookups()
  const [avatar, setAvatar] = useState<string | null>(null)
  const [rating, setRating] = useState(5)
  const [featured, setFeatured] = useState(false)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })
  useEffect(() => {
    if (!open) return
    reset({ client_name: str(item?.client_name), company: str(item?.company), content: str(item?.content), status: item?.status ?? 'pending', client_id: str(item?.client_id) })
    setAvatar(item?.avatar_url ?? null); setRating(item?.rating ?? 5); setFeatured(item?.is_featured ?? false)
  }, [open, item, reset])
  const submit = handleSubmit(async (v) => {
    const payload = { client_name: v.client_name.trim(), company: toText(v.company), content: v.content.trim(), status: v.status as Testimonial['status'], client_id: v.client_id || null, avatar_url: avatar, rating, is_featured: featured && v.status === 'approved', ...(item ? {} : { sort_order: nextOrder }) }
    try { await mutate(() => (item ? db.update('testimonials', item.id, payload) : db.insert('testimonials', payload)), 'testimonials'); toast.success('Saved'); onClose() } catch (e) { toast.error((e as Error).message) }
  })
  return (
    <Dialog open={open} onClose={onClose} size="lg" title={item ? 'Edit testimonial' : 'Add testimonial'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={isSubmitting} onClick={submit}>Save</Button></>}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[160px_1fr]" noValidate>
        <ImageUpload label="Photo" bucket="avatars" folder="testimonials" value={avatar} onChange={setAvatar} aspect="aspect-square" maxMB={2} accept={['image/jpeg', 'image/png', 'image/webp']} />
        <div className="grid content-start gap-4 sm:grid-cols-2">
          <Input label="Client name" required autoFocus {...register('client_name')} error={errors.client_name?.message} />
          <Input label="Company" {...register('company')} />
          <Select label="Linked client" options={clientOptions} placeholder="—" {...register('client_id')} />
          <Select label="Approval" options={enumOptions(TESTIMONIAL_STATUS)} {...register('status')} />
          <div className="sm:col-span-2"><p className="label mb-1.5">Rating</p><Stars value={rating} onChange={setRating} /></div>
        </div>
        <Textarea label="Testimonial" required rows={5} {...register('content')} error={errors.content?.message} wrapClassName="sm:col-span-2" />
        <div className="sm:col-span-2"><Switch checked={featured} onChange={setFeatured} label="Featured" description="Only approved testimonials can be featured" /></div>
        <button type="submit" hidden />
      </form>
    </Dialog>
  )
}
