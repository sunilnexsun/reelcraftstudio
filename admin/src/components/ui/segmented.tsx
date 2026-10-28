import { cn } from '@/lib/utils'

/** Pill toggle group, like "Last 7 Days | Last 30 Days | This Month". */
export function Segmented<T extends string>({ value, onChange, options, className, size = 'md', label }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode }[]; className?: string; size?: 'sm' | 'md'; label?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-lg border border-line-strong bg-black/30 p-0.5', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn('rounded-md font-medium whitespace-nowrap transition-colors [&_svg]:size-4', size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-[13px]',
            value === o.value ? 'bg-accent text-white shadow-sm' : 'text-fg-soft hover:text-fg')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Tabs<T extends string>({ value, onChange, tabs, className }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: React.ReactNode; count?: number }[]; className?: string }) {
  return (
    <div role="tablist" className={cn('scroll-x flex gap-1 border-b border-line', className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          type="button"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn('-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
            value === t.value ? 'border-accent text-fg' : 'border-transparent text-muted hover:text-fg')}
        >
          {t.label}
          {t.count != null && <span className={cn('rounded-full px-1.5 text-[11px] tabular', value === t.value ? 'bg-accent text-white' : 'bg-white/10 text-muted')}>{t.count}</span>}
        </button>
      ))}
    </div>
  )
}
