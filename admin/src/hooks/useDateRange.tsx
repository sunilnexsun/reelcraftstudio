import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { presetRange, type DateRange, type RangePreset } from '@/lib/domain/dates'

interface Ctx { range: DateRange; preset: RangePreset; setPreset: (p: Exclude<RangePreset, 'custom'>) => void; setCustom: (r: DateRange) => void }
const DateRangeContext = createContext<Ctx | null>(null)

export const PRESET_LABEL: Record<RangePreset, string> = { '7d': 'Last 7 days', '30d': 'Last 30 days', month: 'This month', '90d': 'Last 90 days', year: 'This financial year', custom: 'Custom range' }

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [preset, setP] = useState<RangePreset>('7d')
  const [custom, setC] = useState<DateRange>(presetRange('30d'))
  const value = useMemo<Ctx>(() => ({
    preset,
    range: preset === 'custom' ? custom : presetRange(preset),
    setPreset: (p) => setP(p),
    setCustom: (r) => { setC(r.from <= r.to ? r : { from: r.to, to: r.from }); setP('custom') },
  }), [preset, custom])
  return <DateRangeContext.Provider value={value}>{children}</DateRangeContext.Provider>
}

export function useDateRange() {
  const c = useContext(DateRangeContext)
  if (!c) throw new Error('useDateRange needs DateRangeProvider')
  return c
}
