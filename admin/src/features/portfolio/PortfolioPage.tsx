import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, Clapperboard, ExternalLink, Eye, EyeOff, Pencil, Plus, Star, Trash, Play } from 'lucide-react'
import type { PortfolioItem } from '@/types/db'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Input, Select, Switch, Textarea } from '@/components/ui/field'
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/states'
import { useConfirm } from '@/components/ui/confirm'
import { ImageUpload } from '@/components/forms/FileUpload'
import { FilterSelect, SearchInput, Toolbar } from '@/components/tables/DataTable'
import { usePageHeader } from '@/components/layout/PageMeta'
import { db } from '@/lib/data'
import { mutate, useTable } from '@/hooks/useData'
import { useLookups } from '@/hooks/useLookups'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { PORTFOLIO_CATEGORIES } from '@/lib/labels'
import { formatDuration, parseDuration, parseVideoUrl } from '@/lib/domain/video'
import { opt, req, str, toText, url } from '@/lib/validation'
import { placeholderArt } from '@/lib/art'
import { cn, matches } from '@/lib/utils'

export default function PortfolioPage() {
  usePageHeader({ subtitle: 'Videos shown on the public website. Only published items are visible to visitors.', showDateRange: false })
  const { role } = useAuth()
  const confirm = useConfirm()
  const [params, setParams] = useSearchParams()
  const { data, loading, error, refetch } = useTable('portfolio_items')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [vis, setVis] = useState('')
  const [editing, setEditing] = useState<PortfolioItem | null | undefined>(params.get('new') ? null : undefined)
  const [preview, setPreview] = useState<PortfolioItem | null>(null)
  const canEdit = can(role, 'portfolio', 'edit')
  const sorted = useMemo(() => [...data].sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)), [data])
  const rows = sorted.filter((p) => (!cat || p.category === cat) && (!vis || (vis === 'published' ? p.is_published : vis === 'draft' ? !p.is_published : p.is_featured)) && matches(q, p.title, p.client_name, p.category))
  const categories = [...new Set([...PORTFOLIO_CATEGORIES, ...data.map((d) => d.category)])].map((c) => ({ value: c, label: c }))
  const filtering = !!(q || cat || vis)

  const patch = async (p: PortfolioItem, change: Partial<PortfolioItem>, ok: string) => {
    try { await mutate(() => db.update('portfolio_items', p.id, change), 'portfolio_items'); toast.success(ok) } catch (e) { toast.error((e as Error).message) }
  }
  /** Rewrite sort_order 0..n with `p` moved one place; only rows whose order changed are written. */
  const move = async (p: PortfolioItem, dir: -1 | 1) => {
    const list = [...sorted]
    const i = list.findIndex((x) => x.id === p.id)
    const j = i + dir
    if (j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    const changes = list.map((x, k) => ({ x, k })).filter(({ x, k }) => x.sort_order !== k)
    try { await mutate(() => Promise.all(changes.map(({ x, k }) => db.update('portfolio_items', x.id, { sort_order: k }))), 'portfolio_items') } catch (e) { toast.error((e as Error).message) }
  }
  const remove = async (p: PortfolioItem) => {
    if (!(await confirm({ title: `Delete “${p.title}”?`, description: 'It will be removed from the website immediately.' }))) return
    try { await mutate(() => db.remove('portfolio_items', p.id), 'portfolio_items'); toast.success('Deleted') } catch (e) { toast.error((e as Error).message) }
  }
  const closeForm = () => { setEditing(undefined); if (params.get('new')) setParams({}, { replace: true }) }

  return (
    <div className="space-y-4">
      <Card>
        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder="Search titles, clients…" />
          <FilterSelect label="Category" value={cat} onChange={setCat} options={categories} />
          <FilterSelect label="Show" value={vis} onChange={setVis} options={[{ value: 'published', label: 'Published' }, { value: 'draft', label: 'Unpublished' }, { value: 'featured', label: 'Featured' }]} />
          <span className="ml-auto text-xs text-muted">{data.filter((d) => d.is_published).length} published · {data.filter((d) => d.is_featured).length} featured</span>
          {can(role, 'portfolio', 'create') && <Button variant="primary" icon={<Plus />} onClick={() => setEditing(null)}>Add video</Button>}
        </Toolbar>
        {error ? <ErrorState message={error.message} onRetry={refetch} /> : loading && !data.length ? <LoadingBlock /> : !rows.length ? (
          <EmptyState icon={<Clapperboard />} title={data.length ? 'Nothing matches' : 'No portfolio videos yet'} description={data.length ? 'Clear the filters to see everything.' : 'Add YouTube or Vimeo links, or upload a showreel, to show work on the website.'} />
        ) : (
          <ul className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3 2xl:grid-cols-4">
            {rows.map((p) => {
              const idx = sorted.findIndex((x) => x.id === p.id)
              const thumb = p.thumbnail_url ?? parseVideoUrl(p.video_url)?.thumbnailUrl ?? placeholderArt(p.title, p.category.toUpperCase())
              return (
                <li key={p.id} className={cn('overflow-hidden rounded-2xl border bg-[#151515] transition-colors', p.is_published ? 'border-line' : 'border-dashed border-white/15')}>
                  <button type="button" onClick={() => setPreview(p)} className="group relative block aspect-video w-full overflow-hidden" aria-label={`Preview ${p.title}`}>
                    <img src={thumb} alt="" className={cn('h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]', !p.is_published && 'opacity-60 grayscale-[40%]')} loading="lazy" />
                    <span className="absolute inset-0 grid place-items-center bg-black/0 transition-colors group-hover:bg-black/30"><span className="grid size-12 place-items-center rounded-full border-2 border-white/90 bg-black/40"><Play className="size-5 fill-white text-white" /></span></span>
                    <span className="absolute top-2 left-2 flex gap-1.5">{p.is_featured && <Badge tone="pink"><Star className="size-3 fill-current" />Featured</Badge>}{!p.is_published && <Badge>Unpublished</Badge>}</span>
                    {p.duration_seconds && <span className="absolute right-2 bottom-2 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold tabular">{formatDuration(p.duration_seconds)}</span>}
                  </button>
                  <div className="p-4">
                    <p className="line-clamp-1 font-semibold">{p.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted">{[p.category, p.client_name].filter(Boolean).join(' · ')}</p>
                    {canEdit && (
                      <div className="mt-3 flex flex-wrap items-center gap-1">
                        <Button size="icon-sm" variant="ghost" aria-label="Move earlier" disabled={filtering || idx === 0} onClick={() => move(p, -1)} title={filtering ? 'Clear filters to reorder' : 'Move earlier'}><ArrowUp /></Button>
                        <Button size="icon-sm" variant="ghost" aria-label="Move later" disabled={filtering || idx === sorted.length - 1} onClick={() => move(p, 1)} title={filtering ? 'Clear filters to reorder' : 'Move later'}><ArrowDown /></Button>
                        <Button size="icon-sm" variant="ghost" aria-label={p.is_featured ? 'Unfeature' : 'Feature'} aria-pressed={p.is_featured} onClick={() => patch(p, { is_featured: !p.is_featured }, p.is_featured ? 'Removed from featured' : 'Featured on website')}><Star className={p.is_featured ? 'fill-accent text-accent' : ''} /></Button>
                        <Button size="icon-sm" variant="ghost" aria-label={p.is_published ? 'Unpublish' : 'Publish'} onClick={() => patch(p, { is_published: !p.is_published }, p.is_published ? 'Unpublished' : 'Published to website')}>{p.is_published ? <Eye /> : <EyeOff />}</Button>
                        <span className="flex-1" />
                        <Button size="icon-sm" variant="ghost" aria-label="Edit" onClick={() => setEditing(p)}><Pencil /></Button>
                        <Button size="icon-sm" variant="ghost" aria-label="Delete" className="hover:text-red-400" onClick={() => remove(p)}><Trash /></Button>
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
      <PortfolioForm open={editing !== undefined} item={editing} nextOrder={sorted.length} onClose={closeForm} />
      <Dialog open={!!preview} onClose={() => setPreview(null)} size="lg" title={preview?.title} description={[preview?.category, preview?.client_name].filter(Boolean).join(' · ')}>
        {preview && <VideoPreview item={preview} />}
      </Dialog>
    </div>
  )
}

function VideoPreview({ item }: { item: Pick<PortfolioItem, 'video_url' | 'media_url' | 'thumbnail_url' | 'title' | 'description'> }) {
  const v = parseVideoUrl(item.video_url)
  return (
    <div className="space-y-3">
      <div className="aspect-video overflow-hidden rounded-xl bg-black">
        {v?.embedUrl ? <iframe src={v.embedUrl} title={item.title} className="h-full w-full" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" />
          : item.media_url ? <video src={item.media_url} controls className="h-full w-full" />
          : <div className="grid h-full place-items-center text-sm text-muted">{item.video_url ? <a href={item.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-accent">Open video <ExternalLink className="size-4" /></a> : 'No video attached yet'}</div>}
      </div>
      {item.description && <p className="text-sm text-fg-soft">{item.description}</p>}
    </div>
  )
}

const schema = z.object({
  title: req('Title', 2, 160), description: opt(2000), category: req('Category', 2, 60), client_name: opt(120), service_id: z.string(),
  duration: z.string().refine((v) => !v.trim() || (Number.isFinite(parseDuration(v)) && (parseDuration(v) ?? 0) > 0), 'Use m:ss (e.g. 1:30) or seconds'),
  video_url: url.refine((v) => !v || parseVideoUrl(v) !== null, 'Not a valid video link'),
})

function PortfolioForm({ open, item, onClose, nextOrder }: { open: boolean; item?: PortfolioItem | null; onClose: () => void; nextOrder: number }) {
  const { serviceOptions } = useLookups()
  const [thumb, setThumb] = useState<string | null>(null)
  const [media, setMedia] = useState<string | null>(null)
  const [featured, setFeatured] = useState(false)
  const [published, setPublished] = useState(false)
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })
  useEffect(() => {
    if (!open) return
    reset({ title: str(item?.title), description: str(item?.description), category: item?.category ?? 'Brand Film', client_name: str(item?.client_name), service_id: str(item?.service_id), duration: item?.duration_seconds ? formatDuration(item.duration_seconds) : '', video_url: str(item?.video_url) })
    setThumb(item?.thumbnail_url ?? null); setMedia(item?.media_url ?? null); setFeatured(item?.is_featured ?? false); setPublished(item?.is_published ?? false)
  }, [open, item, reset])
  const videoUrl = watch('video_url')
  const parsed = parseVideoUrl(videoUrl)

  const submit = handleSubmit(async (v) => {
    const payload = {
      title: v.title.trim(), description: toText(v.description), category: v.category.trim(), client_name: toText(v.client_name), service_id: v.service_id || null,
      duration_seconds: parseDuration(v.duration), video_url: toText(v.video_url), video_provider: media && !v.video_url ? 'upload' as const : parsed?.provider ?? null,
      thumbnail_url: thumb ?? parsed?.thumbnailUrl ?? null, media_url: media, is_featured: featured, is_published: published,
      ...(item ? {} : { sort_order: nextOrder }),
    }
    try {
      await mutate(() => (item ? db.update('portfolio_items', item.id, payload) : db.insert('portfolio_items', payload)), 'portfolio_items')
      toast.success(item ? 'Saved' : published ? 'Added and published' : 'Added as unpublished')
      onClose()
    } catch (e) { toast.error((e as Error).message) }
  })

  return (
    <Dialog open={open} onClose={onClose} size="lg" title={item ? 'Edit portfolio video' : 'Add portfolio video'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={isSubmitting} onClick={submit}>Save</Button></>}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input label="Title" required autoFocus {...register('title')} error={errors.title?.message} wrapClassName="sm:col-span-2" />
        <Input label="Video link" placeholder="https://youtu.be/… or https://vimeo.com/…" {...register('video_url')} error={errors.video_url?.message} wrapClassName="sm:col-span-2"
          help={parsed ? (parsed.provider === 'other' ? 'Not YouTube/Vimeo — it will be shown as a link.' : `${parsed.provider === 'youtube' ? 'YouTube' : 'Vimeo'} video detected${parsed.thumbnailUrl ? ' — thumbnail will be used automatically' : ''}.`) : 'YouTube and Vimeo links embed on the website.'} />
        <Input label="Category" list="pf-cats" required {...register('category')} error={errors.category?.message} />
        <datalist id="pf-cats">{PORTFOLIO_CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
        <Input label="Client / brand" {...register('client_name')} />
        <Select label="Service" options={serviceOptions} placeholder="—" {...register('service_id')} />
        <Input label="Duration" placeholder="1:30" {...register('duration')} error={errors.duration?.message} />
        <Textarea label="Description" rows={3} {...register('description')} wrapClassName="sm:col-span-2" />
        <ImageUpload label="Thumbnail" bucket="portfolio" folder="thumbnails" value={thumb} onChange={setThumb} maxMB={5} help={!thumb && parsed?.thumbnailUrl ? 'Optional — the YouTube thumbnail is used if empty' : 'JPG, PNG or WebP, 16:9 recommended'} />
        <ImageUpload label="Or upload the video file" bucket="portfolio" folder="media" value={media} onChange={setMedia} maxMB={50} accept={['video/mp4', 'video/webm', 'video/quicktime']} help="MP4/WebM up to 50 MB. For longer films, use YouTube or Vimeo." />
        <div className="space-y-3 rounded-xl border border-line p-4 sm:col-span-2">
          <Switch checked={published} onChange={setPublished} label="Published" description="Visible on the public website portfolio" />
          <Switch checked={featured} onChange={setFeatured} label="Featured" description="Highlighted at the top of the portfolio and on the homepage" />
        </div>
        <button type="submit" hidden />
      </form>
    </Dialog>
  )
}
