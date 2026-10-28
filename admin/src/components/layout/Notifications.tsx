import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CalendarDays, CheckCheck, IndianRupee, MessagesSquare, ReceiptIndianRupee } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { db } from '@/lib/data'
import { mutate, useTable } from '@/hooks/useData'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const ICON: Record<string, typeof Bell> = { enquiry: MessagesSquare, booking: CalendarDays, payment: IndianRupee, invoice: ReceiptIndianRupee }

export function Notifications() {
  const { data } = useTable('notifications')
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const items = [...data].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 12)
  const unread = data.filter((n) => !n.read_at)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  const markRead = (ids: string[]) => mutate(() => Promise.all(ids.map((id) => db.update('notifications', id, { read_at: new Date().toISOString() }))), 'notifications')
    .catch((e) => toast.error(e.message))

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ''}`}
        className="relative grid size-11 place-items-center rounded-xl text-fg-soft hover:bg-white/6 hover:text-white">
        <Bell className="size-6" strokeWidth={1.75} />
        {unread.length > 0 && <span className="absolute top-2 right-2.5 size-2.5 rounded-full bg-accent ring-2 ring-bg" aria-hidden />}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-xl border border-line-strong bg-[#171717] shadow-2xl" role="dialog" aria-label="Notifications">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-semibold">Notifications</p>
            {unread.length > 0 && (
              <button type="button" onClick={() => markRead(unread.map((n) => n.id))} className="flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                <CheckCheck className="size-3.5" /> Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {items.map((n) => {
              const Icon = ICON[n.kind] ?? Bell
              return (
                <li key={n.id}>
                  <button type="button" className={cn('flex w-full gap-3 px-4 py-3 text-left hover:bg-white/5', !n.read_at && 'bg-accent/[0.06]')}
                    onClick={() => { if (!n.read_at) void markRead([n.id]); setOpen(false); if (n.link) nav(n.link) }}>
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent"><Icon className="size-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-medium">{n.title}{!n.read_at && <span className="size-1.5 rounded-full bg-accent" />}</span>
                      {n.body && <span className="block truncate text-xs text-muted">{n.body}</span>}
                      <span className="mt-0.5 block text-[11px] text-faint">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                    </span>
                  </button>
                </li>
              )
            })}
            {!items.length && <li className="px-4 py-10 text-center text-sm text-muted">You're all caught up.</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
