import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** 'sheet' slides in from the right; good for record details. */
  variant?: 'modal' | 'sheet'
  dismissable?: boolean
}

const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }

/** Native <dialog>: focus is trapped, Escape closes, the page behind is inert. */
export function Dialog({ open, onClose, title, description, children, footer, size = 'md', variant = 'modal', dismissable = true }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  return (
    <dialog
      ref={ref}
      onCancel={(e) => { e.preventDefault(); if (dismissable) onClose() }}
      onClick={(e) => { if (dismissable && e.target === ref.current) onClose() }}
      aria-labelledby={titleId}
      className={cn(
        'm-0 max-h-none max-w-none bg-transparent p-0 text-fg backdrop:bg-black/70 backdrop:backdrop-blur-[2px]',
        variant === 'modal' ? 'fixed inset-0 flex h-full w-full items-end justify-center sm:items-center sm:p-6' : 'fixed inset-0 h-full w-full',
        !open && 'hidden',
      )}
    >
      {open && (
        <div
          className={cn(
            'flex flex-col overflow-hidden border border-line-strong bg-[#141414] shadow-2xl',
            variant === 'modal'
              ? cn('max-h-[92dvh] w-full rounded-t-2xl sm:rounded-2xl', widths[size])
              : cn('ml-auto h-full w-full sm:rounded-l-2xl', widths[size === 'sm' ? 'md' : size]),
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-start gap-3 border-b border-line px-5 py-4 sm:px-6">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="font-display text-lg font-semibold leading-tight">{title}</h2>
              {description && <p className="mt-1 text-sm text-muted">{description}</p>}
            </div>
            <button type="button" onClick={onClose} className="-mr-1 rounded-lg p-1.5 text-muted hover:bg-white/8 hover:text-fg" aria-label="Close">
              <X className="size-5" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
          {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-black/20 px-5 py-3 sm:px-6">{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}
