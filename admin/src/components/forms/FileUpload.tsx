import { useRef, useState } from 'react'
import { ImageUp, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { db } from '@/lib/data'
import type { Bucket } from '@/lib/data/types'
import { cn } from '@/lib/utils'

const IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

/** Uploads to Supabase Storage (or a data URL in demo mode) and reports the public URL. */
export function ImageUpload({ value, onChange, bucket, folder, label, maxMB = 5, accept = IMAGE, aspect = 'aspect-video', className, help }: {
  value: string | null; onChange: (url: string | null) => void; bucket: Bucket; folder: string; label: string
  maxMB?: number; accept?: string[]; aspect?: string; className?: string; help?: string
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const pick = async (file: File | undefined) => {
    if (!file) return
    if (!accept.includes(file.type)) { toast.error(`Unsupported file type. Use ${accept.map((a) => a.split('/')[1].toUpperCase()).join(', ')}.`); return }
    if (file.size > maxMB * 1024 * 1024) { toast.error(`File is too large (max ${maxMB} MB)`); return }
    setBusy(true)
    try {
      const ext = (file.name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
      const { url } = await db.upload(bucket, `${folder}/${crypto.randomUUID()}.${ext}`, file)
      onChange(url)
    } catch (e) { toast.error((e as Error).message) } finally { setBusy(false); if (input.current) input.current.value = '' }
  }
  const isVideo = value && /\.(mp4|webm|mov)(\?|$)|^data:video/i.test(value)
  return (
    <div className={className}>
      <p className="label mb-1.5">{label}</p>
      <div className={cn('group relative overflow-hidden rounded-xl border border-dashed border-line-strong bg-white/[0.02]', aspect)}
        onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void pick(e.dataTransfer.files[0]) }}>
        {value ? (isVideo ? <video src={value} className="h-full w-full object-cover" muted /> : <img src={value} alt="" className="h-full w-full object-cover" />) : (
          <button type="button" onClick={() => input.current?.click()} className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm text-muted hover:text-fg">
            <ImageUp className="size-7 text-accent" /><span>Click or drop a file</span><span className="text-xs text-faint">Max {maxMB} MB</span>
          </button>
        )}
        {busy && <div className="absolute inset-0 grid place-items-center bg-black/60"><Loader2 className="size-6 animate-spin text-accent" /></div>}
        {value && !busy && (
          <div className="absolute top-2 right-2 flex gap-1">
            <button type="button" onClick={() => input.current?.click()} className="rounded-md bg-black/70 px-2 py-1 text-xs font-medium hover:bg-black">Replace</button>
            <button type="button" onClick={() => onChange(null)} className="rounded-md bg-black/70 p-1 hover:bg-black" aria-label="Remove file"><X className="size-4" /></button>
          </div>
        )}
      </div>
      {help && <p className="help mt-1">{help}</p>}
      <input ref={input} type="file" accept={accept.join(',')} className="sr-only" onChange={(e) => void pick(e.target.files?.[0])} aria-label={label} />
    </div>
  )
}
