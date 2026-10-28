import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Search, Download, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/states'
import { Button } from '@/components/ui/button'

export interface Column<T> {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  /** Provide to make the column sortable. */
  sort?: (row: T) => string | number | null | undefined
  className?: string
  headerClassName?: string
  /** Hide on narrow screens to keep the table readable. */
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl'
}

const hide = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell', xl: 'hidden xl:table-cell' }

export function DataTable<T>({
  rows, columns, rowKey, onRowClick, pageSize = 10, initialSort, loading, error, onRetry, empty, className, minWidth = 720, rowClassName,
}: {
  rows: T[]; columns: Column<T>[]; rowKey: (r: T) => string; onRowClick?: (r: T) => void; pageSize?: number
  initialSort?: { key: string; dir: 'asc' | 'desc' }; loading?: boolean; error?: string; onRetry?: () => void
  empty?: ReactNode; className?: string; minWidth?: number; rowClassName?: (r: T) => string | undefined
}) {
  const [sort, setSort] = useState(initialSort ?? null)
  const [page, setPage] = useState(0)

  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col?.sort) return rows
    const get = col.sort
    return [...rows].sort((a, b) => {
      const x = get(a), y = get(b)
      if (x == null && y == null) return 0
      if (x == null) return 1
      if (y == null) return -1
      const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'en', { numeric: true, sensitivity: 'base' })
      return sort.dir === 'asc' ? r : -r
    })
  }, [rows, columns, sort])

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize))
  useEffect(() => { if (page > pages - 1) setPage(0) }, [pages, page])
  const visible = sorted.slice(page * pageSize, page * pageSize + pageSize)

  if (error) return <ErrorState message={error} onRetry={onRetry} />
  if (loading && !rows.length) return <LoadingBlock />

  return (
    <div className={className}>
      <div className="scroll-x">
        <table className="w-full border-collapse" style={{ minWidth }}>
          <thead>
            <tr className="border-b border-line">
              {columns.map((c) => {
                const active = sort?.key === c.key
                return (
                  <th key={c.key} scope="col" className={cn('th', c.hideBelow && hide[c.hideBelow], c.headerClassName)}
                    aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                    {c.sort ? (
                      <button type="button" className="inline-flex items-center gap-1 hover:text-fg"
                        onClick={() => setSort(active && sort!.dir === 'desc' ? { key: c.key, dir: 'asc' } : { key: c.key, dir: active ? 'desc' : 'asc' })}>
                        {c.header}
                        {active ? (sort!.dir === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />) : <ChevronsUpDown className="size-3.5 opacity-40" />}
                      </button>
                    ) : c.header}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr
                key={rowKey(r)}
                onClick={onRowClick ? (e) => { if (!(e.target as HTMLElement).closest('button,a,input,select,[role="menu"]')) onRowClick(r) } : undefined}
                onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onRowClick(r) } : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                className={cn('border-b border-line last:border-0 transition-colors', onRowClick && 'cursor-pointer hover:bg-white/[0.03] focus-visible:bg-white/[0.05]', rowClassName?.(r))}
              >
                {columns.map((c) => <td key={c.key} className={cn('td', c.hideBelow && hide[c.hideBelow], c.className)}>{c.cell(r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (empty ?? <EmptyState title="Nothing here yet" />)}
      {sorted.length > pageSize && (
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-muted">
          <span className="tabular">{page * pageSize + 1}–{Math.min(sorted.length, (page + 1) * pageSize)} of {sorted.length}</span>
          <div className="flex items-center gap-1">
            <Button size="icon-sm" variant="ghost" aria-label="Previous page" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft /></Button>
            <span className="px-2 tabular">{page + 1} / {pages}</span>
            <Button size="icon-sm" variant="ghost" aria-label="Next page" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}><ChevronRight /></Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cn('relative min-w-48 flex-1 sm:max-w-xs', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" aria-hidden />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="input pr-8 pl-9" />
      {value && <button type="button" aria-label="Clear search" onClick={() => onChange('')} className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-faint hover:text-fg"><X className="size-3.5" /></button>}
    </div>
  )
}

export function FilterSelect({ value, onChange, options, label, className }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label: string; className?: string }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={cn('input h-10 w-auto max-w-52 min-w-36 shrink-0 truncate', className)}>
      <option value="">{label}: All</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-center gap-2 border-b border-line px-4 py-3 sm:px-5', className)}>{children}</div>
}

export function ExportButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return <Button size="md" variant="outline" icon={<Download />} onClick={onClick} disabled={disabled} className="ml-auto">Export CSV</Button>
}
