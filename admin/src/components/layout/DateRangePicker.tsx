import { useState } from 'react'
import { CalendarDays, ChevronDown } from 'lucide-react'
import { PRESET_LABEL, useDateRange } from '@/hooks/useDateRange'
import { rangeLabel, type RangePreset } from '@/lib/domain/dates'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const PRESETS: Exclude<RangePreset, 'custom'>[] = ['7d', '30d', 'month', '90d', 'year']

export function DateRangePicker({ className }: { className?: string }) {
  const { range, preset, setPreset, setCustom } = useDateRange()
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState(range.from)
  const [to, setTo] = useState(range.to)
  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => { setFrom(range.from); setTo(range.to); setOpen((o) => !o) }}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex h-11 items-center gap-2.5 rounded-xl border border-line-strong bg-black/40 px-3.5 text-sm text-fg-soft backdrop-blur hover:border-white/30"
      >
        <CalendarDays className="size-4.5 text-fg-soft" aria-hidden />
        <span className="tabular whitespace-nowrap">{rangeLabel(range)}</span>
        <ChevronDown className="size-4 text-muted" aria-hidden />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div role="dialog" aria-label="Choose date range" className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-line-strong bg-[#171717] p-2 shadow-2xl"
            onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}>
            {PRESETS.map((p) => (
              <button key={p} type="button" onClick={() => { setPreset(p); setOpen(false) }}
                className={cn('flex w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/6', preset === p ? 'font-semibold text-accent' : 'text-fg-soft')}>
                {PRESET_LABEL[p]}
              </button>
            ))}
            <div className="mt-2 border-t border-line px-1 pt-3">
              <p className="mb-2 px-2 text-xs font-medium text-muted">Custom range</p>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" aria-label="From" className="input h-9 px-2 text-xs" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
                <input type="date" aria-label="To" className="input h-9 px-2 text-xs" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
              </div>
              <Button size="sm" variant="primary" className="mt-2 w-full" disabled={!from || !to} onClick={() => { setCustom({ from, to }); setOpen(false) }}>Apply</Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
