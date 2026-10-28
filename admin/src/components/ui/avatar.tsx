import { cn, initials } from '@/lib/utils'

const palette = ['from-rose-500 to-red-700', 'from-orange-400 to-rose-600', 'from-fuchsia-500 to-rose-600', 'from-red-400 to-pink-700', 'from-amber-400 to-red-600', 'from-pink-500 to-red-800']

export function Avatar({ name, src, size = 32, className }: { name: string | null | undefined; src?: string | null; size?: number; className?: string }) {
  let h = 0
  for (const c of name ?? '') h = (h * 31 + c.charCodeAt(0)) >>> 0
  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)) }
  if (src) return <img src={src} alt="" style={style} className={cn('shrink-0 rounded-full object-cover ring-1 ring-white/15', className)} />
  return (
    <span aria-hidden style={style} className={cn('grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-semibold text-white ring-1 ring-white/15', palette[h % palette.length], className)}>
      {initials(name)}
    </span>
  )
}
