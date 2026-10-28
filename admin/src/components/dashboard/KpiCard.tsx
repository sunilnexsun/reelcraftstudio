import { useId, type ReactNode } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/states'

export function KpiCard({ icon, label, value, delta, deltaLabel, spark, hint, loading }: {
  icon: ReactNode; label: string; value: ReactNode; delta?: number | null; deltaLabel?: string; spark?: { v: number }[]; hint?: ReactNode; loading?: boolean
}) {
  const gid = useId().replace(/:/g, '')
  const up = (delta ?? 0) >= 0
  // running total across the period: a calm trend line instead of daily 0/1 spikes
  const trend = (spark ?? []).reduce<{ v: number }[]>((acc, p) => [...acc, { v: (acc.at(-1)?.v ?? 0) + p.v }], [])
  return (
    <div className="card-glow relative overflow-hidden px-5 pt-5 pb-4 sm:px-6">
      <div className="relative z-10 flex items-start gap-4">
        <span className="mt-1 text-accent [&_svg]:size-10 [&_svg]:stroke-[1.6] sm:[&_svg]:size-11" aria-hidden>{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-fg-soft sm:text-base">{label}</p>
          {loading ? <Skeleton className="mt-2 h-9 w-28" /> : (
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="font-display text-3xl leading-none font-bold tracking-tight tabular sm:text-[34px]">{value}</p>
              {delta != null && (
                <span className={cn('inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-xs font-bold tabular', up ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400')}
                  title={deltaLabel} aria-label={`${up ? 'Up' : 'Down'} ${Math.abs(delta).toFixed(1)} percent ${deltaLabel ?? ''}`}>
                  {up ? <ArrowUp className="size-3" strokeWidth={3} /> : <ArrowDown className="size-3" strokeWidth={3} />}
                  {up ? '+' : '−'}{Math.abs(delta) >= 100 ? Math.round(Math.abs(delta)) : Math.abs(delta).toFixed(1).replace(/\.0$/, '')}%
                </span>
              )}
            </div>
          )}
          {hint && <p className="mt-1.5 max-w-[60%] text-xs text-muted">{hint}</p>}
        </div>
      </div>
      {trend.length > 1 && trend.at(-1)!.v > 0 && (
        <div className="pointer-events-none absolute right-0 bottom-0 h-14 w-[42%]" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FF1744" stopOpacity={0.45} /><stop offset="1" stopColor="#FF1744" stopOpacity={0} /></linearGradient></defs>
              <YAxis hide domain={[0, 'dataMax']} />
              <Area type="monotone" dataKey="v" stroke="#FF1744" strokeWidth={2.2} fill={`url(#${gid})`} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
