import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface MenuItem { label: ReactNode; icon?: ReactNode; onSelect: () => void; danger?: boolean; disabled?: boolean; hidden?: boolean }

/** Accessible dropdown: arrow keys move, Escape/outside click closes, focus returns to the trigger. */
export function Menu({ trigger, items, align = 'end', label, className, header }: {
  trigger: (props: { onClick: () => void; 'aria-expanded': boolean; 'aria-haspopup': 'menu'; 'aria-controls': string; ref: React.Ref<HTMLButtonElement> }) => ReactNode
  items: (MenuItem | 'divider')[]; align?: 'start' | 'end'; label?: string; className?: string; header?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const btn = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const visible = items.filter((i) => i === 'divider' || !i.hidden)

  useEffect(() => {
    if (!open) return
    const first = panel.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')
    first?.focus()
    const onDoc = (e: MouseEvent) => {
      if (!panel.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const onKey = (e: React.KeyboardEvent) => {
    const els = [...(panel.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [])]
    const i = els.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown') { e.preventDefault(); els[(i + 1) % els.length]?.focus() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); els[(i - 1 + els.length) % els.length]?.focus() }
    else if (e.key === 'Escape' || e.key === 'Tab') { setOpen(false); btn.current?.focus() }
  }

  return (
    <div className={cn('relative inline-block', className)}>
      {trigger({ onClick: () => setOpen((o) => !o), 'aria-expanded': open, 'aria-haspopup': 'menu', 'aria-controls': id, ref: btn })}
      {open && (
        <div
          ref={panel}
          id={id}
          role="menu"
          aria-label={label}
          onKeyDown={onKey}
          className={cn('absolute z-50 mt-2 min-w-48 overflow-hidden rounded-xl border border-line-strong bg-[#171717] py-1 shadow-2xl', align === 'end' ? 'right-0' : 'left-0')}
        >
          {header}
          {visible.map((it, i) => it === 'divider'
            ? <div key={i} className="my-1 h-px bg-line" role="separator" />
            : (
              <button
                key={i}
                type="button"
                role="menuitem"
                disabled={it.disabled}
                onClick={() => { setOpen(false); it.onSelect() }}
                className={cn('flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm outline-none hover:bg-white/6 focus:bg-white/8 disabled:opacity-40 [&_svg]:size-4 [&_svg]:text-muted',
                  it.danger ? 'text-red-400 [&_svg]:text-red-400' : 'text-fg-soft')}
              >
                {it.icon}{it.label}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
