import { format, parseISO, startOfWeek } from 'date-fns'
import type { Booking, Enquiry, Expense, Invoice, Payment, Project, ProjectTeamMember, BookingCrew, TeamMember } from '@/types/db'
import { type DateRange, eachDay, inRange, dayKey } from './dates'
import { round2, sum } from './money'

export const ACTIVE_PROJECT: Project['status'][] = ['planning', 'script_concept', 'shoot_scheduled', 'shooting', 'editing', 'client_review', 'revisions', 'approved']

export function bucketFor(r: DateRange): 'day' | 'week' | 'month' {
  const days = eachDay(r).length
  return days <= 31 ? 'day' : days <= 120 ? 'week' : 'month'
}
function bucketKey(day: string, b: 'day' | 'week' | 'month'): string {
  if (b === 'day') return day
  if (b === 'week') return format(startOfWeek(parseISO(day), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  return day.slice(0, 7)
}
export function bucketLabel(key: string, b: 'day' | 'week' | 'month'): string {
  if (b === 'month') return format(parseISO(key + '-01'), 'MMM yy')
  return format(parseISO(key), 'MMM d')
}
function buckets(r: DateRange) {
  const b = bucketFor(r)
  const keys = [...new Set(eachDay(r).map((d) => bucketKey(d, b)))]
  return { b, keys, key: (day: string) => bucketKey(day.length > 10 ? dayKey(day) : day, b) }
}

/** Enquiries vs bookings per bucket — the Overview line chart. */
export function enquiryBookingSeries(enquiries: Enquiry[], bookings: Booking[], r: DateRange) {
  const { b, keys, key } = buckets(r)
  const rows = new Map(keys.map((k) => [k, { key: k, label: bucketLabel(k, b), enquiries: 0, bookings: 0 }]))
  for (const e of enquiries) if (inRange(e.enquiry_date, r)) rows.get(key(e.enquiry_date))!.enquiries++
  for (const bk of bookings) if (bk.status !== 'cancelled' && inRange(bk.created_at, r)) rows.get(key(bk.created_at))!.bookings++
  return [...rows.values()]
}

/** Collected (payments received), invoiced (non-draft, non-void invoices issued), expenses — per bucket. */
export function revenueSeries(payments: Payment[], invoices: Invoice[], expenses: Expense[], r: DateRange) {
  const { b, keys, key } = buckets(r)
  const rows = new Map(keys.map((k) => [k, { key: k, label: bucketLabel(k, b), collected: 0, invoiced: 0, expenses: 0, profit: 0 }]))
  for (const p of payments) if (inRange(p.paid_on, r)) rows.get(key(p.paid_on))!.collected += Number(p.amount)
  for (const i of invoices) if (isBillable(i) && inRange(i.issue_date, r)) rows.get(key(i.issue_date))!.invoiced += Number(i.total)
  for (const x of expenses) if (inRange(x.spent_on, r)) rows.get(key(x.spent_on))!.expenses += Number(x.amount)
  return [...rows.values()].map((row) => ({
    ...row, collected: round2(row.collected), invoiced: round2(row.invoiced), expenses: round2(row.expenses),
    profit: round2(row.collected - row.expenses),
  }))
}

export const isBillable = (i: Invoice) => i.status !== 'void' && i.status !== 'draft'

export function financeSummary(payments: Payment[], invoices: Invoice[], expenses: Expense[], r: DateRange) {
  const collected = sum(payments.filter((p) => inRange(p.paid_on, r)), (p) => p.amount)
  const invoiced = sum(invoices.filter((i) => isBillable(i) && inRange(i.issue_date, r)), (i) => i.total)
  const spent = sum(expenses.filter((x) => inRange(x.spent_on, r)), (x) => x.amount)
  // Outstanding is a point-in-time balance across all open invoices, not limited to the range.
  const outstanding = sum(invoices.filter((i) => ['sent', 'partially_paid', 'overdue'].includes(i.status)), (i) => i.balance_due)
  const overdue = sum(invoices.filter((i) => i.status === 'overdue'), (i) => i.balance_due)
  return { collected, invoiced, expenses: spent, profit: round2(collected - spent), outstanding, overdue }
}

/** Payments in range attributed to the service of the project they belong to. */
export function revenueByService(payments: Payment[], projects: Project[], invoices: Invoice[], r: DateRange) {
  const projById = new Map(projects.map((p) => [p.id, p]))
  const invById = new Map(invoices.map((i) => [i.id, i]))
  const totals = new Map<string, number>()
  for (const p of payments) {
    if (!inRange(p.paid_on, r)) continue
    const projectId = p.project_id ?? (p.invoice_id ? invById.get(p.invoice_id)?.project_id : null)
    const label = (projectId && projById.get(projectId)?.service_label) || 'Unassigned'
    totals.set(label, (totals.get(label) ?? 0) + Number(p.amount))
  }
  return [...totals.entries()].map(([service, amount]) => ({ service, amount: round2(amount) })).sort((a, b) => b.amount - a.amount)
}

export function expensesByCategory(expenses: Expense[], r: DateRange) {
  const totals = new Map<string, number>()
  for (const x of expenses) if (inRange(x.spent_on, r)) totals.set(x.category, (totals.get(x.category) ?? 0) + Number(x.amount))
  return [...totals.entries()].map(([category, amount]) => ({ category, amount: round2(amount) })).sort((a, b) => b.amount - a.amount)
}

/** Of enquiries received in the range, the share now converted. Lost and open leads stay in the denominator. */
export function conversionRate(enquiries: Enquiry[], r: DateRange) {
  const inR = enquiries.filter((e) => inRange(e.enquiry_date, r))
  const converted = inR.filter((e) => e.status === 'converted').length
  const lost = inR.filter((e) => e.status === 'lost').length
  return { total: inR.length, converted, lost, open: inR.length - converted - lost, rate: inR.length ? converted / inR.length : null }
}

/** Of projects due for delivery in the range (excluding cancelled), the share delivered. */
export function completionRate(projects: Project[], r: DateRange) {
  const due = projects.filter((p) => p.status !== 'cancelled' && inRange(p.delivery_date, r))
  const delivered = due.filter((p) => p.status === 'delivered').length
  return { due: due.length, delivered, rate: due.length ? delivered / due.length : null }
}

export function projectStatusBreakdown(projects: Project[]) {
  const groups = [
    { key: 'in_progress', label: 'In Progress', match: (s: Project['status']) => ['script_concept', 'shoot_scheduled', 'shooting', 'editing', 'client_review', 'revisions', 'approved'].includes(s) },
    { key: 'completed', label: 'Completed', match: (s: Project['status']) => s === 'delivered' },
    { key: 'planning', label: 'Planning', match: (s: Project['status']) => s === 'planning' || s === 'enquiry_received' },
    { key: 'on_hold', label: 'On Hold', match: (s: Project['status']) => s === 'on_hold' },
  ]
  const counted = projects.filter((p) => p.status !== 'cancelled')
  const total = counted.length
  return {
    total,
    groups: groups.map((g) => {
      const n = counted.filter((p) => g.match(p.status)).length
      return { key: g.key, label: g.label, value: n, pct: total ? Math.round((n / total) * 100) : 0 }
    }),
  }
}

export function teamWorkload(
  team: TeamMember[], projects: Project[], ptm: ProjectTeamMember[], bookings: Booking[], crew: BookingCrew[], r: DateRange,
) {
  const activeProjects = new Set(projects.filter((p) => ACTIVE_PROJECT.includes(p.status)).map((p) => p.id))
  const bookingById = new Map(bookings.map((b) => [b.id, b]))
  return team.filter((t) => t.is_active).map((t) => {
    const projectsN = ptm.filter((x) => x.team_member_id === t.id && activeProjects.has(x.project_id)).length
    const shoots = crew.map((c) => (c.team_member_id === t.id ? bookingById.get(c.booking_id) : undefined))
      .filter((b): b is Booking => !!b && b.status !== 'cancelled' && inRange(b.start_at, r))
    const hours = round2(shoots.reduce((h, b) => h + (new Date(b.end_at).getTime() - new Date(b.start_at).getTime()) / 36e5, 0))
    return { id: t.id, name: t.full_name, role: t.role, projects: projectsN, shoots: shoots.length, hours }
  }).sort((a, b) => b.projects + b.shoots - (a.projects + a.shoots))
}

export function bookingTrend(bookings: Booking[], r: DateRange) {
  const { b, keys, key } = buckets(r)
  const rows = new Map(keys.map((k) => [k, { key: k, label: bucketLabel(k, b), confirmed: 0, requested: 0, completed: 0, cancelled: 0 }]))
  for (const bk of bookings) if (inRange(bk.start_at, r)) rows.get(key(bk.start_at))![bk.status]++
  return [...rows.values()]
}

/** Seven-point sparkline of daily counts/amounts ending at r.to. */
export function sparkline<T>(rows: T[], day: (row: T) => string | null, value: (row: T) => number, r: DateRange, points = 7) {
  const days = eachDay(r)
  const step = Math.max(1, Math.ceil(days.length / points))
  const out: { v: number }[] = []
  for (let i = 0; i < days.length; i += step) {
    const slice = new Set(days.slice(i, i + step))
    out.push({ v: rows.reduce((acc, row) => { const d = day(row); return d && slice.has(d.length > 10 ? dayKey(d) : d) ? acc + value(row) : acc }, 0) })
  }
  return out
}
