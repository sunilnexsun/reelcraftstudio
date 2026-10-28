import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, CalendarDays, MessagesSquare, ReceiptIndianRupee, Search, UsersRound } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { useTable } from '@/hooks/useData'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { matches } from '@/lib/utils'
import { fmtDate } from '@/lib/domain/dates'

type Hit = { key: string; icon: typeof Search; title: string; sub: string; to: string; group: string }

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { role } = useAuth()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const enquiries = useTable('enquiries', open && can(role, 'enquiries'))
  const clients = useTable('clients', open && can(role, 'clients'))
  const projects = useTable('projects', open && can(role, 'projects'))
  const invoices = useTable('invoices', open && can(role, 'finance'))
  const bookings = useTable('bookings', open && can(role, 'bookings'))

  useEffect(() => { if (open) { setQ(''); setActive(0); setTimeout(() => input.current?.focus(), 30) } }, [open])

  const hits = useMemo<Hit[]>(() => {
    if (q.trim().length < 2) return []
    const out: Hit[] = []
    for (const e of enquiries.data) if (matches(q, e.code, e.client_name, e.business_name, e.phone, e.email)) out.push({ key: e.id, icon: MessagesSquare, title: `${e.client_name}${e.business_name ? ' · ' + e.business_name : ''}`, sub: `${e.code} · ${e.service_label ?? ''}`, to: `/enquiries?open=${e.id}`, group: 'Enquiries' })
    for (const c of clients.data) if (matches(q, c.name, c.business_name, c.phone, c.email, c.city)) out.push({ key: c.id, icon: UsersRound, title: c.business_name ?? c.name, sub: [c.name, c.city].filter(Boolean).join(' · '), to: `/clients/${c.id}`, group: 'Clients' })
    for (const p of projects.data) if (matches(q, p.code, p.name, p.service_label)) out.push({ key: p.id, icon: Briefcase, title: p.name, sub: `${p.code} · due ${fmtDate(p.delivery_date)}`, to: `/projects/${p.id}`, group: 'Projects' })
    for (const i of invoices.data) if (matches(q, i.invoice_number)) out.push({ key: i.id, icon: ReceiptIndianRupee, title: i.invoice_number, sub: `Issued ${fmtDate(i.issue_date)}`, to: `/finance/invoices/${i.id}`, group: 'Invoices' })
    for (const b of bookings.data) if (matches(q, b.code, b.title, b.location, b.contact_name)) out.push({ key: b.id, icon: CalendarDays, title: b.title, sub: `${b.code} · ${fmtDate(b.start_at)}`, to: `/bookings?open=${b.id}`, group: 'Bookings' })
    return out.slice(0, 30)
  }, [q, enquiries.data, clients.data, projects.data, invoices.data, bookings.data])

  const go = (h: Hit) => { onClose(); nav(h.to) }

  return (
    <Dialog open={open} onClose={onClose} title="Search" description="Enquiries, clients, projects, invoices and bookings" size="md">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
        <input
          ref={input}
          value={q}
          onChange={(e) => { setQ(e.target.value); setActive(0) }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
            if (e.key === 'Enter' && hits[active]) go(hits[active])
          }}
          placeholder="Type a name, phone, code or invoice number…"
          className="input h-11 pl-9"
          role="combobox"
          aria-expanded={hits.length > 0}
          aria-controls="search-results"
          aria-activedescendant={hits[active] ? `hit-${hits[active].key}` : undefined}
        />
      </div>
      <ul id="search-results" role="listbox" className="mt-3 max-h-[50dvh] overflow-y-auto">
        {hits.map((h, i) => (
          <li key={h.group + h.key} id={`hit-${h.key}`} role="option" aria-selected={i === active}>
            <button type="button" onClick={() => go(h)} onMouseEnter={() => setActive(i)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${i === active ? 'bg-white/8' : ''}`}>
              <h.icon className="size-4 shrink-0 text-accent" />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{h.title}</span><span className="block truncate text-xs text-muted">{h.sub}</span></span>
              <span className="text-[11px] text-faint">{h.group}</span>
            </button>
          </li>
        ))}
        {q.trim().length >= 2 && !hits.length && <li className="px-3 py-6 text-center text-sm text-muted">No matches for “{q}”</li>}
        {q.trim().length < 2 && <li className="px-3 py-6 text-center text-sm text-muted">Start typing to search · <kbd className="rounded border border-line-strong px-1 text-xs">Ctrl</kbd> + <kbd className="rounded border border-line-strong px-1 text-xs">K</kbd> opens this anywhere</li>}
      </ul>
    </Dialog>
  )
}
