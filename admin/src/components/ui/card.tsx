import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Card({ children, className, as: As = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' }) {
  return <As className={cn('card', className)}>{children}</As>
}

export function CardHeader({ title, icon, action, className, subtitle }: { title: ReactNode; icon?: ReactNode; action?: ReactNode; className?: string; subtitle?: ReactNode }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3 px-5 pt-5 pb-3 sm:px-6', className)}>
      {icon && <span className="text-accent [&_svg]:size-5">{icon}</span>}
      <div className="min-w-[12rem] flex-1">
        <h2 className="font-display text-lg font-semibold leading-tight sm:text-xl">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Stat({ label, value, hint, tone }: { label: ReactNode; value: ReactNode; hint?: ReactNode; tone?: 'accent' | 'green' | 'amber' | 'red' }) {
  const toneCls = tone === 'accent' ? 'text-accent' : tone === 'green' ? 'text-emerald-400' : tone === 'amber' ? 'text-amber-300' : tone === 'red' ? 'text-red-400' : 'text-fg'
  return (
    <div className="card px-4 py-3.5">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={cn('mt-1 font-display text-xl font-semibold tabular', toneCls)}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  )
}

export function DetailRow({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 py-2 text-sm sm:grid-cols-[150px_1fr]">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-fg-soft">{children ?? '—'}</dd>
    </div>
  )
}
