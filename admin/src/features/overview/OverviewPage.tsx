import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Briefcase, CalendarDays, CalendarPlus, Clapperboard, Database, EllipsisVertical, Eye, Mail, MapPin, MessageSquarePlus, ReceiptIndianRupee, UserPlus, Wallet, Play, Activity, Truck } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Menu } from '@/components/ui/menu'
import { Segmented } from '@/components/ui/segmented'
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/states'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { Donut, DualAreaChart, SERIES } from '@/components/dashboard/charts'
import { useQuickCreate } from '@/components/layout/QuickCreate'
import { usePageHeader } from '@/components/layout/PageMeta'
import { useTable } from '@/hooks/useData'
import { useDateRange } from '@/hooks/useDateRange'
import { useLookups } from '@/hooks/useLookups'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { ENQUIRY_STATUS, PROJECT_STATUS } from '@/lib/labels'
import { fmtDate, fmtTime, inRange, pctChange, previousRange, rangeLabel, todayIST, fmtDateTime } from '@/lib/domain/dates'
import { formatINR, sum } from '@/lib/domain/money'
import { enquiryBookingSeries, projectStatusBreakdown, sparkline } from '@/lib/domain/reports'
import { placeholderArt } from '@/lib/art'
import type { RangePreset } from '@/lib/domain/dates'

export default function OverviewPage() {
  usePageHeader({})
  const { role } = useAuth()
  const nav = useNavigate()
  const quick = useQuickCreate()
  const { range, preset, setPreset } = useDateRange()
  const prev = previousRange(range)
  const seesEnquiries = can(role, 'enquiries')
  const seesFinance = can(role, 'finance')
  const projects = useTable('projects')
  const enquiries = useTable('enquiries', seesEnquiries)
  const bookings = useTable('bookings')
  const payments = useTable('payments', seesFinance)
  const activity = useTable('activity_logs', role === 'owner' || role === 'manager')
  const { clientName, team } = useLookups()
  const actorName = (profileId: string | null) => (profileId ? team.find((t) => t.profile_id === profileId)?.full_name ?? 'A team member' : 'Website')
  const now = new Date().toISOString()
  const today = todayIST()

  const k = useMemo(() => {
    const live = projects.data.filter((p) => p.status !== 'cancelled')
    const createdIn = (r: typeof range) => live.filter((p) => inRange(p.created_at, r)).length
    const enqIn = (r: typeof range) => enquiries.data.filter((e) => inRange(e.enquiry_date, r)).length
    const revIn = (r: typeof range) => sum(payments.data.filter((p) => inRange(p.paid_on, r)), (p) => p.amount)
    const activeBk = bookings.data.filter((b) => ['confirmed', 'requested'].includes(b.status) && b.end_at >= now)
    return {
      projects: live.length, projectsNew: createdIn(range), projectsDelta: pctChange(createdIn(range), createdIn(prev)),
      enquiries: enqIn(range), enquiriesDelta: pctChange(enqIn(range), enqIn(prev)),
      bookings: activeBk.length, bookingsRequested: activeBk.filter((b) => b.status === 'requested').length,
      revenue: revIn(range), revenueDelta: pctChange(revIn(range), revIn(prev)),
      dueThisWeek: live.filter((p) => p.delivery_date && p.delivery_date >= today && p.delivery_date <= addDaysStr(today, 7) && p.status !== 'delivered').length,
      inProduction: live.filter((p) => !['delivered', 'on_hold', 'enquiry_received'].includes(p.status)).length,
      spark: {
        projects: sparkline(live, (p) => p.created_at, () => 1, range),
        enquiries: sparkline(enquiries.data, (e) => e.enquiry_date, () => 1, range),
        bookings: sparkline(bookings.data.filter((b) => b.status !== 'cancelled'), (b) => b.start_at, () => 1, range),
        revenue: sparkline(payments.data, (p) => p.paid_on, (p) => p.amount, range),
      },
    }
  }, [projects.data, enquiries.data, bookings.data, payments.data, range, prev, now, today])

  const series = useMemo(() => enquiryBookingSeries(enquiries.data, bookings.data, range), [enquiries.data, bookings.data, range])
  const status = useMemo(() => projectStatusBreakdown(projects.data), [projects.data])
  const STATUS_COLORS = [SERIES.red, SERIES.pink, SERIES.rose, SERIES.gray]
  const recent = [...enquiries.data].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5)
  const upcoming = bookings.data.filter((b) => b.status !== 'cancelled' && b.status !== 'completed' && b.end_at >= now).sort((a, b) => a.start_at.localeCompare(b.start_at)).slice(0, 3)
  const deadlines = projects.data.filter((p) => p.delivery_date && !['delivered', 'cancelled'].includes(p.status)).sort((a, b) => a.delivery_date!.localeCompare(b.delivery_date!)).slice(0, 5)
  const log = [...activity.data].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6)
  const loading = projects.loading && !projects.ready
  const rangeHint = `vs previous ${rangeLabel(prev)}`

  if (projects.error) return <Card><ErrorState message={projects.error.message} onRetry={projects.refetch} /></Card>

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard loading={loading} icon={<Clapperboard />} label="Total Projects" value={k.projects} delta={k.projectsDelta} deltaLabel={`new projects ${rangeHint}`} spark={k.spark.projects} hint={`${k.projectsNew} new · ${k.inProduction} in production`} />
        {seesEnquiries
          ? <KpiCard loading={enquiries.loading && !enquiries.ready} icon={<Mail />} label="New Enquiries" value={k.enquiries} delta={k.enquiriesDelta} deltaLabel={rangeHint} spark={k.spark.enquiries} hint="Received in selected period" />
          : <KpiCard loading={loading} icon={<Truck />} label="Due in 7 days" value={k.dueThisWeek} hint="Projects with delivery this week" />}
        <KpiCard loading={bookings.loading && !bookings.ready} icon={<CalendarDays />} label="Active Bookings" value={k.bookings} spark={k.spark.bookings} hint={k.bookingsRequested ? `${k.bookingsRequested} awaiting confirmation` : 'Upcoming confirmed shoots'} />
        {seesFinance
          ? <KpiCard loading={payments.loading && !payments.ready} icon={<Database />} label="Revenue" value={formatINR(k.revenue, { whole: true })} delta={k.revenueDelta} deltaLabel={rangeHint} spark={k.spark.revenue} hint="Collected in selected period" />
          : <KpiCard loading={loading} icon={<Activity />} label="In Production" value={k.inProduction} hint="Projects being worked on" />}
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_440px]">
        <Card className="min-w-0">
          <CardHeader title={seesEnquiries ? 'Enquiries & Bookings Overview' : 'Bookings Overview'} action={
            <Segmented<RangePreset> value={preset} onChange={(p) => p !== 'custom' && setPreset(p)} label="Chart period"
              options={[{ value: '7d', label: 'Last 7 Days' }, { value: '30d', label: 'Last 30 Days' }, { value: 'month', label: 'This Month' }]} />
          } />
          <div className="flex gap-6 px-6 pb-1 text-sm text-fg-soft">
            {seesEnquiries && <span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-accent" />Enquiries</span>}
            <span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-white" />Bookings</span>
          </div>
          <div className="px-2 pb-4 sm:px-4">
            {loading ? <LoadingBlock rows={4} /> : seesEnquiries
              ? <DualAreaChart data={series} a={{ key: 'enquiries', name: 'Enquiries' }} b={{ key: 'bookings', name: 'Bookings' }} />
              : <DualAreaChart data={series} a={{ key: 'bookings', name: 'Bookings' }} />}
          </div>
        </Card>

        <Card>
          <CardHeader title="Project Status" />
          <div className="flex flex-col items-center gap-6 px-6 pt-2 pb-6 sm:flex-row sm:justify-between">
            <Donut total={status.total} centerLabel="Projects" data={status.groups.map((g, i) => ({ label: g.label, value: g.value, color: STATUS_COLORS[i] }))} />
            <ul className="w-full max-w-[220px] space-y-4">
              {status.groups.map((g, i) => (
                <li key={g.key} className="flex items-center gap-3 text-[15px]">
                  <span className="size-3 rounded-full" style={{ background: STATUS_COLORS[i] }} aria-hidden />
                  <span className="flex-1 text-fg-soft">{g.label}</span>
                  <span className="font-semibold tabular">{g.value} <span className="font-normal text-fg-soft">({g.pct}%)</span></span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_440px]">
        {seesEnquiries ? (
          <Card className="min-w-0">
            <CardHeader title="Recent Enquiries" action={<Link to="/enquiries" className="flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">View All Enquiries <ArrowRight className="size-4" /></Link>} />
            <div className="scroll-x border-t border-line">
              {enquiries.loading && !enquiries.ready ? <LoadingBlock /> : recent.length ? (
                <table className="w-full min-w-[640px]">
                  <thead><tr className="border-b border-line"><th className="th w-14">#</th><th className="th">Name</th><th className="th">Service</th><th className="th">Date</th><th className="th">Status</th><th className="th text-right">Actions</th></tr></thead>
                  <tbody>
                    {recent.map((e) => (
                      <tr key={e.id} className="border-b border-line last:border-0">
                        <td className="td tabular text-muted">{e.code.slice(-3)}</td>
                        <td className="td"><span className="flex items-center gap-3"><Avatar name={e.client_name} size={34} /><span className="font-semibold text-fg">{e.client_name}</span></span></td>
                        <td className="td">{e.service_label ?? '—'}</td>
                        <td className="td tabular whitespace-nowrap">{fmtDate(e.enquiry_date)}</td>
                        <td className="td"><StatusBadge value={e.status} map={ENQUIRY_STATUS} /></td>
                        <td className="td">
                          <div className="flex justify-end gap-1">
                            <Button size="icon-sm" variant="ghost" aria-label={`View ${e.client_name}`} onClick={() => nav(`/enquiries?open=${e.id}`)}><Eye /></Button>
                            <Menu label="Enquiry actions" items={[
                              { label: 'Open', icon: <Eye />, onSelect: () => nav(`/enquiries?open=${e.id}`) },
                              { label: 'All enquiries', icon: <ArrowRight />, onSelect: () => nav('/enquiries') },
                            ]} trigger={(p) => <Button {...p} size="icon-sm" variant="ghost" aria-label={`More for ${e.client_name}`}><EllipsisVertical /></Button>} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <EmptyState title="No enquiries yet" description="Website and manual enquiries will appear here." />}
            </div>
          </Card>
        ) : (
          <Card className="min-w-0">
            <CardHeader title="Upcoming Deliveries" action={<Link to="/projects" className="flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">All projects <ArrowRight className="size-4" /></Link>} />
            <ul className="divide-y divide-line border-t border-line">
              {deadlines.map((p) => (
                <li key={p.id}><Link to={`/projects/${p.id}`} className="flex flex-wrap items-center gap-3 px-6 py-3 hover:bg-white/[0.03]">
                  <Briefcase className="size-4 text-accent" /><span className="min-w-0 flex-1"><span className="block truncate font-medium">{p.name}</span><span className="text-xs text-muted">{clientName(p.client_id)} · due {fmtDate(p.delivery_date)}</span></span>
                  <StatusBadge value={p.status} map={PROJECT_STATUS} />
                </Link></li>
              ))}
              {!deadlines.length && <li><EmptyState title="Nothing due" /></li>}
            </ul>
          </Card>
        )}

        <Card>
          <CardHeader icon={<CalendarDays />} title="Upcoming Shoots" action={<Link to="/bookings" className="flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">View Schedule <ArrowRight className="size-4" /></Link>} />
          <ul className="space-y-1 px-3 pb-4 sm:px-4">
            {upcoming.map((b) => (
              <li key={b.id} className="flex items-center gap-4 rounded-xl border-b border-line p-2 last:border-0">
                <button type="button" onClick={() => nav(`/bookings?open=${b.id}`)} className="relative h-[72px] w-32 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10" aria-label={`Open ${b.title}`}>
                  <img src={placeholderArt(b.title)} alt="" className="h-full w-full object-cover" />
                  <span className="absolute inset-0 grid place-items-center"><span className="grid size-9 place-items-center rounded-full border-2 border-white/90 bg-black/40"><Play className="size-4 fill-white text-white" /></span></span>
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{b.title}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[13px] text-fg-soft"><CalendarDays className="size-3.5" />{fmtDate(b.start_at)}<span className="text-faint">|</span>{fmtTime(b.start_at)}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-[13px] text-fg-soft"><MapPin className="size-3.5 text-accent" />{b.location ?? 'Location TBC'}</p>
                </div>
                <Menu label="Shoot actions" items={[
                  { label: 'Open booking', icon: <Eye />, onSelect: () => nav(`/bookings?open=${b.id}`) },
                  { label: 'Open project', icon: <Briefcase />, onSelect: () => nav(`/projects/${b.project_id}`), hidden: !b.project_id },
                ]} trigger={(p) => <Button {...p} size="icon-sm" variant="ghost" aria-label={`More for ${b.title}`}><EllipsisVertical /></Button>} />
              </li>
            ))}
            {!upcoming.length && <li><EmptyState title="No shoots scheduled" action={can(role, 'bookings', 'create') && <Button size="sm" variant="primary" onClick={() => quick.setOpen('booking')}>Book a shoot</Button>} /></li>}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_440px]">
        {log.length > 0 ? (
          <Card className="min-w-0">
            <CardHeader icon={<Activity />} title="Recent Project Activity" />
            <ol className="divide-y divide-line border-t border-line">
              {log.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-6 py-3 text-sm">
                  <Avatar name={actorName(a.actor_id)} size={28} />
                  <span className="min-w-0 flex-1"><span className="font-medium text-fg">{actorName(a.actor_id)}</span> <span className="text-muted">{verb(a.action)} {a.entity_type.replace(/_/g, ' ').replace(/s$/, '')}</span> <span className="text-fg-soft">{a.summary}</span></span>
                  <span className="shrink-0 text-xs text-faint">{fmtDateTime(a.created_at)}</span>
                </li>
              ))}
            </ol>
          </Card>
        ) : (
          <Card className="min-w-0">
            <CardHeader icon={<Briefcase />} title="Upcoming Deliveries" />
            <ul className="divide-y divide-line border-t border-line">
              {deadlines.map((p) => <li key={p.id}><Link to={`/projects/${p.id}`} className="flex items-center gap-3 px-6 py-3 hover:bg-white/[0.03]"><span className="min-w-0 flex-1 truncate">{p.name}</span><span className="text-xs text-muted">{fmtDate(p.delivery_date)}</span></Link></li>)}
            </ul>
          </Card>
        )}
        <Card>
          <CardHeader title="Quick Create" subtitle={`Period: ${rangeLabel(range)}`} />
          <div className="grid grid-cols-2 gap-2 px-5 pb-5">
            {[
              { show: can(role, 'enquiries', 'create'), label: 'Enquiry', icon: MessageSquarePlus, on: () => quick.setOpen('enquiry') },
              { show: can(role, 'projects', 'create'), label: 'Project', icon: Briefcase, on: () => quick.setOpen('project') },
              { show: can(role, 'bookings', 'create'), label: 'Shoot booking', icon: CalendarPlus, on: () => quick.setOpen('booking') },
              { show: can(role, 'clients', 'create'), label: 'Client', icon: UserPlus, on: () => quick.setOpen('client') },
              { show: can(role, 'finance', 'create'), label: 'Invoice', icon: ReceiptIndianRupee, on: () => nav('/finance/invoices/new') },
              { show: can(role, 'finance', 'create'), label: 'Expense', icon: Wallet, on: () => quick.setOpen('expense') },
              { show: can(role, 'content', 'create'), label: 'Content post', icon: CalendarDays, on: () => nav('/content?new=1') },
              { show: can(role, 'portfolio', 'create'), label: 'Portfolio video', icon: Clapperboard, on: () => nav('/portfolio?new=1') },
            ].filter((x) => x.show).map((x) => (
              <button key={x.label} type="button" onClick={x.on} className="flex items-center gap-2.5 rounded-xl border border-line bg-white/[0.02] px-3 py-3 text-left text-sm font-medium transition-colors hover:border-accent/50 hover:bg-accent/[0.06]">
                <x.icon className="size-4.5 text-accent" />{x.label}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )

}

function verb(a: string) { return ({ created: 'created', updated: 'updated', deleted: 'deleted', status_changed: 'moved', converted: 'converted', submitted: 'received' } as Record<string, string>)[a] ?? a }
function addDaysStr(day: string, n: number) { const d = new Date(day + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
