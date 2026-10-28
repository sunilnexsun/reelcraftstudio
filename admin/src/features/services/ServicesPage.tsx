import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, Clock, LayoutGrid, Pencil, Plus, Trash } from 'lucide-react'
import type { Service } from '@/types/db'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Input, Select, Switch, Textarea } from '@/components/ui/field'
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/states'
import { useConfirm } from '@/components/ui/confirm'
import { ImageUpload } from '@/components/forms/FileUpload'
import { usePageHeader } from '@/components/layout/PageMeta'
import { db } from '@/lib/data'
import { mutate, useTable } from '@/hooks/useData'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { PRICING_MODEL, enumOptions } from '@/lib/labels'
import { formatINR } from '@/lib/domain/money'
import { money, opt, req, str, toMoney, toText } from '@/lib/validation'
import { placeholderArt } from '@/lib/art'
import { cn, slugify } from '@/lib/utils'

export function priceLabel(s: Pick<Service, 'pricing_model' | 'starting_price'>) {
  if (s.pricing_model === 'custom_quote' || s.starting_price == null) return 'Custom quote'
  const p = formatINR(s.starting_price, { whole: true })
  return { fixed: p, starting_from: `From ${p}`, per_hour: `${p} / hour`, per_day: `${p} / day`, custom_quote: 'Custom quote' }[s.pricing_model]
}

export default function ServicesPage() {
  usePageHeader({ subtitle: 'Services and starting prices shown on the website and used across enquiries and projects.', showDateRange: false })
  const { role } = useAuth()
  const confirm = useConfirm()
  const { data, loading, error, refetch } = useTable('services')
  const [editing, setEditing] = useState<Service | null | undefined>(undefined)
  const canEdit = can(role, 'services', 'edit')
  const sorted = useMemo(() => [...data].sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title)), [data])

  const move = async (s: Service, dir: -1 | 1) => {
    const list = [...sorted]; const i = list.findIndex((x) => x.id === s.id); const j = i + dir
    if (j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    try { await mutate(() => Promise.all(list.map((x, k) => (x.sort_order !== k ? db.update('services', x.id, { sort_order: k }) : null))), 'services') } catch (e) { toast.error((e as Error).message) }
  }
  const toggle = async (s: Service) => {
    try { await mutate(() => db.update('services', s.id, { is_active: !s.is_active }), 'services'); toast.success(s.is_active ? 'Hidden from website' : 'Shown on website') } catch (e) { toast.error((e as Error).message) }
  }
  const remove = async (s: Service) => {
    if (!(await confirm({ title: `Delete “${s.title}”?`, description: 'Existing enquiries and projects keep the service name but lose the link. Consider deactivating instead.' }))) return
    try { await mutate(() => db.remove('services', s.id), 'services'); toast.success('Service deleted') } catch (e) { toast.error((e as Error).message) }
  }

  if (error) return <Card><ErrorState message={error.message} onRetry={refetch} /></Card>
  return (
    <div className="space-y-4">
      <div className="flex justify-end">{can(role, 'services', 'create') && <Button variant="primary" icon={<Plus />} onClick={() => setEditing(null)}>New service</Button>}</div>
      {loading && !data.length ? <Card><LoadingBlock /></Card> : !sorted.length ? <Card><EmptyState icon={<LayoutGrid />} title="No services yet" description="Add the services you offer so leads and projects can be tagged." /></Card> : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {sorted.map((s, i) => (
            <li key={s.id} className={cn('card overflow-hidden', !s.is_active && 'opacity-60')}>
              <div className="relative aspect-[16/8]"><img src={s.thumbnail_url ?? placeholderArt(s.slug)} alt="" className="h-full w-full object-cover" loading="lazy" />
                {!s.is_active && <Badge className="absolute top-2 left-2">Inactive</Badge>}</div>
              <div className="p-4">
                <p className="font-display font-semibold">{s.title}</p>
                <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted">{s.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm"><span className="font-semibold text-accent">{priceLabel(s)}</span>{s.delivery_estimate && <span className="flex items-center gap-1 text-xs text-muted"><Clock className="size-3.5" />{s.delivery_estimate}</span>}</div>
                {canEdit && (
                  <div className="mt-3 flex items-center gap-1 border-t border-line pt-3">
                    <Switch checked={s.is_active} onChange={() => toggle(s)} />
                    <span className="ml-2 text-xs text-muted">{s.is_active ? 'Active' : 'Inactive'}</span>
                    <span className="flex-1" />
                    <Button size="icon-sm" variant="ghost" aria-label="Move earlier" disabled={i === 0} onClick={() => move(s, -1)}><ArrowUp /></Button>
                    <Button size="icon-sm" variant="ghost" aria-label="Move later" disabled={i === sorted.length - 1} onClick={() => move(s, 1)}><ArrowDown /></Button>
                    <Button size="icon-sm" variant="ghost" aria-label={`Edit ${s.title}`} onClick={() => setEditing(s)}><Pencil /></Button>
                    {can(role, 'services', 'delete') && <Button size="icon-sm" variant="ghost" aria-label={`Delete ${s.title}`} className="hover:text-red-400" onClick={() => remove(s)}><Trash /></Button>}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <ServiceForm open={editing !== undefined} service={editing} onClose={() => setEditing(undefined)} nextOrder={sorted.length} />
    </div>
  )
}

const schema = z.object({
  title: req('Title', 2, 120), slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Lowercase letters, numbers and dashes'), description: opt(2000),
  pricing_model: z.string(), starting_price: money, delivery_estimate: opt(60),
})

function ServiceForm({ open, service, onClose, nextOrder }: { open: boolean; service?: Service | null; onClose: () => void; nextOrder: number }) {
  const [thumb, setThumb] = useState<string | null>(null)
  const [active, setActive] = useState(true)
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting, dirtyFields } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })
  useEffect(() => {
    if (!open) return
    reset({ title: str(service?.title), slug: str(service?.slug), description: str(service?.description), pricing_model: service?.pricing_model ?? 'starting_from', starting_price: str(service?.starting_price), delivery_estimate: str(service?.delivery_estimate) })
    setThumb(service?.thumbnail_url ?? null); setActive(service?.is_active ?? true)
  }, [open, service, reset])
  const model = watch('pricing_model')
  const submit = handleSubmit(async (v) => {
    const payload = { title: v.title.trim(), slug: v.slug, description: toText(v.description), pricing_model: v.pricing_model as Service['pricing_model'], starting_price: v.pricing_model === 'custom_quote' ? null : toMoney(v.starting_price), delivery_estimate: toText(v.delivery_estimate), thumbnail_url: thumb, is_active: active, ...(service ? {} : { sort_order: nextOrder }) }
    try { await mutate(() => (service ? db.update('services', service.id, payload) : db.insert('services', payload)), 'services'); toast.success(service ? 'Service saved' : 'Service added'); onClose() } catch (e) { toast.error((e as Error).message) }
  })
  return (
    <Dialog open={open} onClose={onClose} size="lg" title={service ? 'Edit service' : 'New service'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={isSubmitting} onClick={submit}>Save</Button></>}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input label="Title" required autoFocus {...register('title', { onChange: (e) => { if (!service && !dirtyFields.slug) setValue('slug', slugify(e.target.value)) } })} error={errors.title?.message} />
        <Input label="URL slug" required {...register('slug')} error={errors.slug?.message} help="Used by the website enquiry form, e.g. instagram-reels" />
        <Select label="Pricing model" options={enumOptions(PRICING_MODEL)} {...register('pricing_model')} />
        <Input label="Starting price (₹)" inputMode="decimal" disabled={model === 'custom_quote'} {...register('starting_price')} error={errors.starting_price?.message} />
        <Input label="Estimated delivery" placeholder="5–7 days" {...register('delivery_estimate')} />
        <div className="flex items-end pb-2"><Switch checked={active} onChange={setActive} label="Active" description="Shown on the website and in forms" /></div>
        <Textarea label="Description" rows={3} {...register('description')} wrapClassName="sm:col-span-2" />
        <ImageUpload label="Thumbnail" bucket="portfolio" folder="services" value={thumb} onChange={setThumb} className="sm:col-span-2" aspect="aspect-[16/6]" />
        <button type="submit" hidden />
      </form>
    </Dialog>
  )
}
