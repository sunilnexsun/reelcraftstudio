/** Round half away from zero to 2 decimals, matching Postgres numeric round(). */
export function round2(n: number): number {
  const s = Math.sign(n) || 1
  return (s * Math.round((Math.abs(n) + Number.EPSILON) * 100)) / 100
}

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 0 })
const inrWhole = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export function formatINR(n: number | null | undefined, opts: { whole?: boolean } = {}): string {
  if (n == null || Number.isNaN(n)) return '—'
  return (opts.whole ? inrWhole : inr).format(n)
}

/** ₹2.45L, ₹1.2Cr — Indian compact notation for KPI tiles and chart axes. */
export function formatINRCompact(n: number): string {
  const a = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (a >= 1e7) return `${sign}₹${trim(a / 1e7)}Cr`
  if (a >= 1e5) return `${sign}₹${trim(a / 1e5)}L`
  if (a >= 1e3) return `${sign}₹${trim(a / 1e3)}K`
  return `${sign}₹${Math.round(a)}`
}
const trim = (x: number) => (Math.round(x * 100) / 100).toString()

export function sum<T>(rows: T[], pick: (r: T) => number | null | undefined): number {
  return round2(rows.reduce((acc, r) => acc + (Number(pick(r)) || 0), 0))
}
