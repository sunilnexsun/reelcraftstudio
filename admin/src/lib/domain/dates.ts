import { addDays, differenceInCalendarDays, format, parseISO, startOfMonth, endOfMonth, subDays } from 'date-fns'

/** India Standard Time is a fixed UTC+05:30 offset (no daylight saving), so conversions are exact. */
export const STUDIO_TZ = 'Asia/Kolkata'
const IST_OFFSET = '+05:30'

const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: STUDIO_TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
const hm = new Intl.DateTimeFormat('en-GB', { timeZone: STUDIO_TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const dateFmt = new Intl.DateTimeFormat('en-US', { timeZone: STUDIO_TZ, month: 'short', day: 'numeric', year: 'numeric' })
const timeFmt = new Intl.DateTimeFormat('en-US', { timeZone: STUDIO_TZ, hour: '2-digit', minute: '2-digit', hour12: true })

/** 'YYYY-MM-DD' for an instant, as seen in IST. */
export function dayKey(d: Date | string): string {
  return ymd.format(typeof d === 'string' ? new Date(d) : d)
}
export function todayIST(): string { return dayKey(new Date()) }

/** Oct 26, 2026 — accepts a date ('YYYY-MM-DD') or an ISO timestamp. */
export function fmtDate(v: string | null | undefined): string {
  if (!v) return '—'
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return format(parseISO(v), 'MMM d, yyyy')
  return dateFmt.format(new Date(v))
}
export function fmtTime(iso: string | null | undefined): string { return iso ? timeFmt.format(new Date(iso)) : '—' }
export function fmtDateTime(iso: string | null | undefined): string { return iso ? `${fmtDate(iso)}, ${fmtTime(iso)}` : '—' }

/** '2026-10-27T09:00' (IST wall clock from <input type="datetime-local">) → ISO instant. */
export function istInputToISO(local: string): string {
  return new Date(`${local.length === 16 ? local + ':00' : local}${IST_OFFSET}`).toISOString()
}
/** ISO instant → '2026-10-27T09:00' in IST, for datetime-local inputs. */
export function isoToISTInput(iso: string): string { return `${dayKey(iso)}T${hm.format(new Date(iso))}` }
/** Minutes since IST midnight, for positioning in day/week calendars. */
export function istMinutes(iso: string): number {
  const [h, m] = hm.format(new Date(iso)).split(':').map(Number)
  return h * 60 + m
}

export interface DateRange { from: string; to: string }
export type RangePreset = '7d' | '30d' | 'month' | '90d' | 'year' | 'custom'

export function presetRange(p: Exclude<RangePreset, 'custom'>, today = todayIST()): DateRange {
  const t = parseISO(today)
  switch (p) {
    case '7d': return { from: format(subDays(t, 6), 'yyyy-MM-dd'), to: today }
    case '30d': return { from: format(subDays(t, 29), 'yyyy-MM-dd'), to: today }
    case '90d': return { from: format(subDays(t, 89), 'yyyy-MM-dd'), to: today }
    case 'month': return { from: format(startOfMonth(t), 'yyyy-MM-dd'), to: format(endOfMonth(t), 'yyyy-MM-dd') }
    case 'year': {
      // Indian financial year: 1 April – 31 March
      const y = t.getMonth() >= 3 ? t.getFullYear() : t.getFullYear() - 1
      return { from: `${y}-04-01`, to: `${y + 1}-03-31` }
    }
  }
}

/** The same-length window immediately before `r`, for "vs previous period" comparisons. */
export function previousRange(r: DateRange): DateRange {
  const len = differenceInCalendarDays(parseISO(r.to), parseISO(r.from)) + 1
  return { from: format(subDays(parseISO(r.from), len), 'yyyy-MM-dd'), to: format(subDays(parseISO(r.from), 1), 'yyyy-MM-dd') }
}

export function inRange(day: string | null | undefined, r: DateRange): boolean {
  if (!day) return false
  const d = day.length > 10 ? dayKey(day) : day
  return d >= r.from && d <= r.to
}

export function eachDay(r: DateRange): string[] {
  const out: string[] = []
  for (let d = parseISO(r.from); format(d, 'yyyy-MM-dd') <= r.to; d = addDays(d, 1)) out.push(format(d, 'yyyy-MM-dd'))
  return out
}

export function rangeLabel(r: DateRange): string {
  return `${format(parseISO(r.from), 'MMM d, yyyy')} – ${format(parseISO(r.to), 'MMM d, yyyy')}`
}

export function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null
  return ((curr - prev) / Math.abs(prev)) * 100
}
