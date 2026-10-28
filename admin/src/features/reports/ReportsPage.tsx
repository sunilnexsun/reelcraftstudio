import { useMemo, type ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download, Info } from 'lucide-react'
import { Card, CardHeader, Stat } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState, LoadingBlock } from '@/components/ui/states'
import { ChartTooltip, Donut, SERIES } from '@/components/dashboard/charts'
import { usePageHeader } from '@/components/layout/PageMeta'
import { useTable } from '@/hooks/useData'
import { useDateRange } from '@/hooks/useDateRange'
import { ENQUIRY_STATUS, LEAD_SOURCE, ROLE_LABEL } from '@/lib/labels'
import { rangeLabel } from '@/lib/domain/dates'
import { formatINR, formatINRCompact } from '@/lib/domain/money'
import { bookingTrend, completionRate, conversionRate, expensesByCategory, financeSummary, revenueByService, revenueSeries, teamWorkload } from '@/lib/domain/reports'
import { downloadCSV } from '@/lib/domain/csv'
import { inRange } from '@/lib/domain/dates'

const PALETTE = ['#FF1744', '#FF6B86', '#FFB3C1', '#F4F4F4', '#A0A0A0', '#6B6B6B', '#F59E0B', '#60A5FA', '#34D399', '#A78BFA', '#F472B6']
const axis = { tick: { fill: '#BDBDBD', fontSize: 12 }, axisLine: false, tickLine: false } as const

export default function ReportsPage() {
  usePageHeader({ subtitle: 'Revenue, pipeline and workload for the selected period.' })
  const { range } = useDateRange()
  const payments = useTable('payments')
  const invoices = useTable('invoices')
  const expenses = useTable('expenses')
  const enquiries = useTable('enquiries')
  const projects = useTable('projects')
  const bookings = useTable('bookings')
  const team = useTable('team_members')
  const ptm = useTable('project_team_members')
  const crew = useTable('booking_crew')
  const ready = payments.ready && invoices.ready && expenses.ready && projects.ready && bookings.ready

  const r = useMemo(() => ({
    fin: financeSummary(payments.data, invoices.data, expenses.data, range),
    series: revenueSeries(payments.data, invoices.data, expenses.data, range),
    byService: revenueByService(payments.data, projects.data, invoices.data, range),
    byCategory: expensesByCategory(expenses.data, range),
    conv: conversionRate(enquiries.data, range),
    done: completionRate(projects.data, range),
    workload: teamWorkload(team.data, projects.data, ptm.data, bookings.data, crew.data, range),
    trend: bookingTrend(bookings.data, range),
    funnel: (Object.keys(ENQUIRY_STATUS) as (keyof typeof ENQUIRY_STATUS)[]).map((s) => ({ status: ENQUIRY_STATUS[s].label, count: enquiries.data.filter((e) => e.status === s && inRange(e.enquiry_date, range)).length })),
    sources: (Object.keys(LEAD_SOURCE) as (keyof typeof LEAD_SOURCE)[]).map((s) => {
      const all = enquiries.data.filter((e) => e.lead_source === s && inRange(e.enquiry_date, range))
      return { source: LEAD_SOURCE[s], leads: all.length, converted: all.filter((e) => e.status === 'converted').length }
    }).filter((x) => x.leads > 0).sort((a, b) => b.leads - a.leads),
  }), [payments.data, invoices.data, expenses.data, enquiries.data, projects.data, bookings.data, team.data, ptm.data, crew.data, range])

  if (!ready) return <LoadingBlock rows={8} />
  const pct = (x: number | null) => (x == null ? '—' : `${Math.round(x * 100)}%`)
  const file = (name: string) => `${name}-${range.from}-to-${range.to}`

  return (
    <div className="space-y-5">
      <p className="flex items-start gap-2 text-xs text-muted"><Info className="mt-0.5 size-3.5 shrink-0" /><span><strong className="text-fg-soft">Collected</strong> = payments received (cash basis). <strong className="text-fg-soft">Invoiced</strong> = invoices issued, excluding drafts and voids. <strong className="text-fg-soft">Estimated profit</strong> = collected − expenses recorded; it excludes tax liabilities and unrecorded costs. Period: {rangeLabel(range)}.</span></p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <Stat label="Collected revenue" value={formatINR(r.fin.collected, { whole: true })} tone="green" />
        <Stat label="Invoiced revenue" value={formatINR(r.fin.invoiced, { whole: true })} />
        <Stat label="Expenses" value={formatINR(r.fin.expenses, { whole: true })} />
        <Stat label="Estimated profit" value={formatINR(r.fin.profit, { whole: true })} tone={r.fin.profit >= 0 ? 'accent' : 'red'} />
        <Stat label="Outstanding (today)" value={formatINR(r.fin.outstanding, { whole: true })} tone="amber" hint={`${formatINR(r.fin.overdue, { whole: true })} overdue`} />
        <Stat label="Enquiry conversion" value={pct(r.conv.rate)} hint={`${r.conv.converted} of ${r.conv.total} leads`} />
        <Stat label="Project completion" value={pct(r.done.rate)} hint={`${r.done.delivered} of ${r.done.due} due were delivered`} />
      </div>

      <Section title="Revenue over time" subtitle="Collected vs invoiced, with expenses" onExport={() => downloadCSV(file('revenue'), r.series, [
        { header: 'Period', value: (x) => x.key }, { header: 'Collected (INR)', value: (x) => x.collected }, { header: 'Invoiced (INR)', value: (x) => x.invoiced }, { header: 'Expenses (INR)', value: (x) => x.expenses }, { header: 'Estimated profit (INR)', value: (x) => x.profit },
      ])}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={r.series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="label" {...axis} minTickGap={12} />
            <YAxis {...axis} width={60} tickFormatter={(v: number) => formatINRCompact(v)} />
            <Tooltip content={<ChartTooltip money />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#ccc' }} />
            <Bar dataKey="collected" name="Collected" fill={SERIES.red} radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="invoiced" name="Invoiced" fill={SERIES.white} radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="expenses" name="Expenses" fill={SERIES.gray} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </Section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Revenue by service" subtitle="Collected payments, by the project's service" onExport={() => downloadCSV(file('revenue-by-service'), r.byService, [{ header: 'Service', value: (x) => x.service }, { header: 'Collected (INR)', value: (x) => x.amount }])}>
          {r.byService.length ? (
            <ResponsiveContainer width="100%" height={Math.max(180, r.byService.length * 40)}>
              <BarChart data={r.byService} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                <XAxis type="number" {...axis} tickFormatter={(v: number) => formatINRCompact(v)} />
                <YAxis type="category" dataKey="service" {...axis} width={150} />
                <Tooltip content={<ChartTooltip money />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="amount" name="Collected" radius={[0, 4, 4, 0]} maxBarSize={22}>{r.byService.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No payments in this period" />}
        </Section>

        <Section title="Expense breakdown" onExport={() => downloadCSV(file('expenses-by-category'), r.byCategory, [{ header: 'Category', value: (x) => x.category }, { header: 'Amount (INR)', value: (x) => x.amount }])}>
          {r.byCategory.length ? (
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <Donut size={180} total={r.byCategory.length} centerLabel="categories" data={r.byCategory.map((c, i) => ({ label: c.category, value: c.amount, color: PALETTE[i % PALETTE.length] }))} />
              <ul className="w-full space-y-2 text-sm">{r.byCategory.map((c, i) => <li key={c.category} className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} /><span className="flex-1 text-fg-soft">{c.category}</span><span className="font-semibold tabular">{formatINR(c.amount, { whole: true })}</span></li>)}</ul>
            </div>
          ) : <EmptyState title="No expenses in this period" />}
        </Section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Enquiry pipeline" subtitle="Enquiries received in the period, by current status" onExport={() => downloadCSV(file('enquiry-pipeline'), r.sources, [{ header: 'Source', value: (x) => x.source }, { header: 'Leads', value: (x) => x.leads }, { header: 'Converted', value: (x) => x.converted }, { header: 'Conversion %', value: (x) => (x.leads ? Math.round((x.converted / x.leads) * 100) : 0) }])}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={r.funnel} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="status" {...axis} interval={0} tick={{ fill: '#BDBDBD', fontSize: 11 }} />
              <YAxis {...axis} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="count" name="Enquiries" radius={[4, 4, 0, 0]} maxBarSize={40}>{r.funnel.map((f, i) => <Cell key={i} fill={f.status === 'Converted' ? '#34D399' : f.status === 'Lost' ? SERIES.gray : SERIES.red} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
          {r.sources.length > 0 && (
            <table className="mt-4 w-full text-sm"><thead><tr className="border-b border-line text-left text-xs text-muted"><th className="py-2 font-medium">Lead source</th><th className="py-2 text-right font-medium">Leads</th><th className="py-2 text-right font-medium">Converted</th><th className="py-2 text-right font-medium">Rate</th></tr></thead>
              <tbody>{r.sources.map((s) => <tr key={s.source} className="border-b border-line last:border-0"><td className="py-2">{s.source}</td><td className="py-2 text-right tabular">{s.leads}</td><td className="py-2 text-right tabular">{s.converted}</td><td className="py-2 text-right tabular">{Math.round((s.converted / s.leads) * 100)}%</td></tr>)}</tbody></table>
          )}
        </Section>

        <Section title="Booking trends" subtitle="Shoots by date, stacked by status" onExport={() => downloadCSV(file('bookings'), r.trend, [{ header: 'Period', value: (x) => x.key }, { header: 'Confirmed', value: (x) => x.confirmed }, { header: 'Requested', value: (x) => x.requested }, { header: 'Completed', value: (x) => x.completed }, { header: 'Cancelled', value: (x) => x.cancelled }])}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={r.trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" {...axis} minTickGap={12} />
              <YAxis {...axis} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="completed" name="Completed" stackId="a" fill="#60A5FA" maxBarSize={28} />
              <Bar dataKey="confirmed" name="Confirmed" stackId="a" fill={SERIES.red} maxBarSize={28} />
              <Bar dataKey="requested" name="Requested" stackId="a" fill="#F59E0B" maxBarSize={28} />
              <Bar dataKey="cancelled" name="Cancelled" stackId="a" fill={SERIES.gray} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      <Section title="Team workload" subtitle="Active projects (now) and shoots in the selected period" onExport={() => downloadCSV(file('team-workload'), r.workload, [{ header: 'Name', value: (x) => x.name }, { header: 'Role', value: (x) => ROLE_LABEL[x.role] }, { header: 'Active projects', value: (x) => x.projects }, { header: 'Shoots', value: (x) => x.shoots }, { header: 'Shoot hours', value: (x) => x.hours }])}>
        <div className="scroll-x"><table className="w-full min-w-[520px] text-sm">
          <thead><tr className="border-b border-line text-left text-xs text-muted"><th className="py-2 font-medium">Team member</th><th className="py-2 font-medium">Role</th><th className="py-2 text-right font-medium">Active projects</th><th className="py-2 text-right font-medium">Shoots</th><th className="py-2 text-right font-medium">Shoot hours</th><th className="w-1/3 py-2 pl-4 font-medium">Load</th></tr></thead>
          <tbody>{r.workload.map((w) => {
            const max = Math.max(...r.workload.map((x) => x.projects + x.shoots), 1)
            return <tr key={w.id} className="border-b border-line last:border-0"><td className="py-2.5 font-medium">{w.name}</td><td className="py-2.5 text-muted">{ROLE_LABEL[w.role]}</td><td className="py-2.5 text-right tabular">{w.projects}</td><td className="py-2.5 text-right tabular">{w.shoots}</td><td className="py-2.5 text-right tabular">{w.hours}</td>
              <td className="py-2.5 pl-4"><div className="h-2 rounded-full bg-white/8"><div className="h-2 rounded-full bg-gradient-to-r from-accent to-[#ff8fa3]" style={{ width: `${((w.projects + w.shoots) / max) * 100}%` }} /></div></td></tr>
          })}</tbody>
        </table></div>
      </Section>
    </div>
  )
}

function Section({ title, subtitle, onExport, children }: { title: string; subtitle?: string; onExport?: () => void; children: ReactNode }) {
  return (
    <Card className="min-w-0">
      <CardHeader title={title} subtitle={subtitle} action={onExport && <Button size="sm" variant="ghost" icon={<Download />} onClick={onExport}>CSV</Button>} />
      <div className="px-4 pb-5 sm:px-6">{children}</div>
    </Card>
  )
}
