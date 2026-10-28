import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { Tone } from '@/lib/labels'

const tones: Record<Tone, string> = {
  blue: 'bg-blue-500/15 text-blue-300 ring-blue-400/25',
  amber: 'bg-amber-500/15 text-amber-300 ring-amber-400/25',
  green: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/25',
  red: 'bg-red-500/15 text-red-300 ring-red-400/30',
  gray: 'bg-white/8 text-neutral-300 ring-white/12',
  violet: 'bg-violet-500/15 text-violet-300 ring-violet-400/25',
  pink: 'bg-accent-soft text-[#ff6b86] ring-accent/30',
  cyan: 'bg-cyan-500/15 text-cyan-300 ring-cyan-400/25',
}

export function Badge({ tone = 'gray', children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset', tones[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  )
}

export function StatusBadge<K extends string>({ value, map }: { value: K; map: Record<K, { label: string; tone: Tone }> }) {
  const m = map[value]
  return <Badge tone={m?.tone ?? 'gray'}>{m?.label ?? value}</Badge>
}
