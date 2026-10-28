import { useMemo, type ReactNode } from 'react'
import { addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format, isSameMonth, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/segmented'
import { dayKey, istMinutes, todayIST } from '@/lib/domain/dates'
import { cn } from '@/lib/utils'

export type CalView = 'month' | 'week' | 'day'
export interface CalEvent { id: string; start: string; end?: string | null; title: string; subtitle?: string; color: string; muted?: boolean }

const DAY_START = 6 * 60
const DAY_END = 23 * 60
const HOUR_PX = 48

/** Navigation bar: prev/next, today, title, view switcher. `cursor` is a 'YYYY-MM-DD' anchor day. */
export function CalendarHeader({ cursor, onCursor, view, onView, views = ['month', 'week', 'day'], extra }: {
  cursor: string; onCursor: (d: string) => void; view: CalView; onView: (v: CalView) => void; views?: CalView[]; extra?: ReactNode
}) {
  const d = parseISO(cursor)
  const step = (n: number) => onCursor(format(view === 'month' ? addMonths(d, n) : view === 'week' ? addWeeks(d, n) : addDays(d, n), 'yyyy-MM-dd'))
  const title = view === 'month' ? format(d, 'MMMM yyyy')
    : view === 'week' ? `${format(startOfWeek(d, { weekStartsOn: 1 }), 'MMM d')} – ${format(endOfWeek(d, { weekStartsOn: 1 }), 'MMM d, yyyy')}`
    : format(d, 'EEEE, MMM d, yyyy')
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3 sm:px-5">
      <div className="flex items-center gap-1">
        <Button size="icon-sm" variant="ghost" aria-label="Previous" onClick={() => step(-1)}><ChevronLeft /></Button>
        <Button size="icon-sm" variant="ghost" aria-label="Next" onClick={() => step(1)}><ChevronRight /></Button>
      </div>
      <h2 className="min-w-0 font-display text-base font-semibold sm:text-lg" aria-live="polite">{title}</h2>
      <Button size="sm" variant="outline" onClick={() => onCursor(todayIST())}>Today</Button>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {extra}
        <Segmented<CalView> size="sm" value={view} onChange={onView} label="Calendar view" options={views.map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }))} />
      </div>
    </div>
  )
}

export function MonthGrid({ cursor, events, onSelect, onDayClick }: { cursor: string; events: CalEvent[]; onSelect: (id: string) => void; onDayClick?: (day: string) => void }) {
  const d = parseISO(cursor)
  const today = todayIST()
  const days = useMemo(() => {
    const out: string[] = []
    for (let x = startOfWeek(startOfMonth(d), { weekStartsOn: 1 }); x <= endOfWeek(endOfMonth(d), { weekStartsOn: 1 }); x = addDays(x, 1)) out.push(format(x, 'yyyy-MM-dd'))
    return out
  }, [cursor]) // eslint-disable-line react-hooks/exhaustive-deps
  const byDay = useMemo(() => {
    const m = new Map<string, CalEvent[]>()
    for (const e of events) { const k = dayKey(e.start); m.set(k, [...(m.get(k) ?? []), e]) }
    for (const list of m.values()) list.sort((a, b) => a.start.localeCompare(b.start))
    return m
  }, [events])

  return (
    <div className="scroll-x">
      <div className="min-w-[680px]">
        <div className="grid grid-cols-7 border-b border-line text-xs font-semibold text-muted">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((w) => <div key={w} className="px-2 py-2">{w}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((k) => {
            const list = byDay.get(k) ?? []
            const inMonth = isSameMonth(parseISO(k), d)
            return (
              <div key={k} className={cn('min-h-28 border-r border-b border-line p-1.5 [&:nth-child(7n)]:border-r-0', !inMonth && 'bg-black/30')}>
                <button type="button" onClick={() => onDayClick?.(k)} aria-label={`${format(parseISO(k), 'EEEE MMM d')}${list.length ? `, ${list.length} items` : ''}`}
                  className={cn('mb-1 grid size-7 place-items-center rounded-full text-xs tabular', k === today ? 'bg-accent font-bold text-white' : inMonth ? 'text-fg-soft hover:bg-white/8' : 'text-faint')}>
                  {format(parseISO(k), 'd')}
                </button>
                <div className="space-y-1">
                  {list.slice(0, 3).map((e) => <EventChip key={e.id} e={e} onSelect={onSelect} />)}
                  {list.length > 3 && <button type="button" onClick={() => onDayClick?.(k)} className="px-1 text-[11px] font-medium text-muted hover:text-white">+{list.length - 3} more</button>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function EventChip({ e, onSelect }: { e: CalEvent; onSelect: (id: string) => void }) {
  return (
    <button type="button" onClick={() => onSelect(e.id)} title={`${e.title}${e.subtitle ? ' · ' + e.subtitle : ''}`}
      className={cn('flex w-full items-center gap-1.5 truncate rounded-md px-1.5 py-1 text-left text-[11px] font-medium hover:brightness-125', e.muted && 'opacity-50 line-through')}
      style={{ background: `${e.color}26`, color: '#fff', boxShadow: `inset 2px 0 0 ${e.color}` }}>
      <span className="truncate">{e.title}</span>
    </button>
  )
}

/** Week (7 columns) or day (1 column) time grid in IST. */
export function TimeGrid({ cursor, view, events, onSelect, onSlotClick }: { cursor: string; view: 'week' | 'day'; events: CalEvent[]; onSelect: (id: string) => void; onSlotClick?: (day: string, hour: number) => void }) {
  const d = parseISO(cursor)
  const days = view === 'day' ? [cursor] : Array.from({ length: 7 }, (_, i) => format(addDays(startOfWeek(d, { weekStartsOn: 1 }), i), 'yyyy-MM-dd'))
  const hours = Array.from({ length: (DAY_END - DAY_START) / 60 }, (_, i) => DAY_START / 60 + i)
  const today = todayIST()
  const height = ((DAY_END - DAY_START) / 60) * HOUR_PX

  return (
    <div className="scroll-x">
      <div style={{ minWidth: view === 'week' ? 760 : 320 }}>
        <div className="grid border-b border-line" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
          <div />
          {days.map((k) => (
            <div key={k} className={cn('px-2 py-2 text-center text-xs', k === today ? 'font-bold text-accent' : 'text-muted')}>
              {format(parseISO(k), view === 'day' ? 'EEEE d' : 'EEE d')}
            </div>
          ))}
        </div>
        <div className="relative grid max-h-[640px] overflow-y-auto" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
          <div className="relative" style={{ height }}>
            {hours.map((h) => <div key={h} className="absolute right-2 -translate-y-1/2 text-[10px] text-faint tabular" style={{ top: (h * 60 - DAY_START) / 60 * HOUR_PX }}>{h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}</div>)}
          </div>
          {days.map((k) => {
            const list = events.filter((e) => dayKey(e.start) === k)
            return (
              <div key={k} className={cn('relative border-l border-line', k === today && 'bg-accent/[0.03]')} style={{ height }}>
                {hours.map((h) => (
                  <button key={h} type="button" aria-label={`New at ${h}:00 on ${k}`} onClick={() => onSlotClick?.(k, h)}
                    className="absolute inset-x-0 border-t border-line/60 hover:bg-white/[0.03]" style={{ top: (h * 60 - DAY_START) / 60 * HOUR_PX, height: HOUR_PX }} tabIndex={-1} />
                ))}
                {layout(list).map(({ e, col, cols }) => {
                  const start = Math.max(istMinutes(e.start), DAY_START)
                  const endMin = e.end ? (dayKey(e.end) === k ? istMinutes(e.end) : DAY_END) : start + 45
                  const top = ((start - DAY_START) / 60) * HOUR_PX
                  const h = Math.max(((Math.min(endMin, DAY_END) - start) / 60) * HOUR_PX, 22)
                  return (
                    <button key={e.id} type="button" onClick={() => onSelect(e.id)} title={e.title}
                      className={cn('absolute overflow-hidden rounded-md px-1.5 py-1 text-left text-[11px] leading-tight hover:z-10 hover:brightness-125', e.muted && 'opacity-50')}
                      style={{ top, height: h, left: `calc(${(col / cols) * 100}% + 2px)`, width: `calc(${100 / cols}% - 4px)`, background: `${e.color}33`, boxShadow: `inset 3px 0 0 ${e.color}` }}>
                      <span className="block truncate font-semibold text-white">{e.title}</span>
                      {e.subtitle && h > 34 && <span className="block truncate text-fg-soft">{e.subtitle}</span>}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** Side-by-side columns for overlapping events within a day. */
function layout(events: CalEvent[]) {
  const sorted = [...events].sort((a, b) => a.start.localeCompare(b.start))
  const out: { e: CalEvent; col: number; cols: number }[] = []
  let group: typeof out = []
  let groupEnd = ''
  const flush = () => { const cols = Math.max(...group.map((g) => g.col)) + 1; group.forEach((g) => out.push({ ...g, cols })); group = [] }
  for (const e of sorted) {
    const end = e.end ?? e.start
    if (group.length && e.start >= groupEnd) { flush(); groupEnd = '' }
    const used = new Set(group.filter((g) => (g.e.end ?? g.e.start) > e.start).map((g) => g.col))
    let col = 0
    while (used.has(col)) col++
    group.push({ e, col, cols: 1 })
    if (end > groupEnd || !groupEnd) groupEnd = end
  }
  if (group.length) flush()
  return out
}
