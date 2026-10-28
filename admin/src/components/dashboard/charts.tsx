import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatINRCompact } from '@/lib/domain/money'

export const SERIES = { red: '#FF1744', white: '#F4F4F4', pink: '#FF8FA3', rose: '#FFC2CE', gray: '#6B6B6B', amber: '#F59E0B', blue: '#60A5FA' }

export function ChartTooltip({ active, payload, label, money }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; money?: boolean }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-line-strong bg-[#171717]/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      {label && <p className="mb-1 font-semibold text-fg">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-fg-soft"><span className="size-2 rounded-full" style={{ background: p.color }} />{p.name}: <span className="font-semibold text-fg tabular">{money ? formatINRCompact(p.value) : p.value}</span></p>
      ))}
    </div>
  )
}

/** Two-series smooth area chart: red (primary) and white (secondary), dots on each point like the reference. */
export function DualAreaChart({ data, a, b, height = 240, money }: {
  data: Record<string, number | string>[]; a: { key: string; name: string }; b?: { key: string; name: string }; height?: number; money?: boolean
}) {
  const many = data.length > 16
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={SERIES.red} stopOpacity={0.55} /><stop offset="1" stopColor={SERIES.red} stopOpacity={0.02} /></linearGradient>
          <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={SERIES.white} stopOpacity={0.14} /><stop offset="1" stopColor={SERIES.white} stopOpacity={0} /></linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: '#D4D4D4', fontSize: 12 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={18} />
        <YAxis tick={{ fill: '#D4D4D4', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} width={money ? 56 : 36} tickFormatter={money ? (v: number) => formatINRCompact(v) : undefined} />
        <Tooltip content={<ChartTooltip money={money} />} cursor={{ stroke: 'rgba(255,255,255,0.15)' }} />
        {b && <Area type="monotone" dataKey={b.key} name={b.name} stroke={SERIES.white} strokeWidth={2} fill="url(#gB)" dot={many ? false : { r: 4, fill: SERIES.white, stroke: SERIES.white }} activeDot={{ r: 5 }} />}
        <Area type="monotone" dataKey={a.key} name={a.name} stroke={SERIES.red} strokeWidth={2.5} fill="url(#gA)" dot={many ? false : { r: 4.5, fill: '#fff', stroke: SERIES.red, strokeWidth: 2.5 }} activeDot={{ r: 6 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function Donut({ data, total, centerLabel, size = 190 }: { data: { label: string; value: number; color: string }[]; total: number; centerLabel: string; size?: number }) {
  const has = data.some((d) => d.value > 0)
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={has ? data : [{ label: 'none', value: 1, color: '#2a2a2a' }]} dataKey="value" nameKey="label" innerRadius="66%" outerRadius="100%" startAngle={90} endAngle={-270} paddingAngle={has ? 2 : 0} stroke="none" isAnimationActive={false}>
            {(has ? data : [{ color: '#2a2a2a' }]).map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          {has && <Tooltip content={<ChartTooltip />} />}
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
        <p className="font-display text-4xl font-bold tabular">{total}</p>
        <p className="text-sm text-fg-soft">{centerLabel}</p>
      </div>
    </div>
  )
}
