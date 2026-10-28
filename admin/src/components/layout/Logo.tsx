import { cn } from '@/lib/utils'

/** ReelCraft wordmark: camera-frame mark with a play glyph, "Reel" white, "Craft" red. */
export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 48 40" className="h-9 w-11 shrink-0" aria-hidden>
        <path d="M8 12h22a6 6 0 0 1 6 6v12a6 6 0 0 1-6 6H10a6 6 0 0 1-6-6V16" fill="none" stroke="#FF1744" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M36 21l8-4.5v15L36 27" fill="none" stroke="#FF1744" strokeWidth="3.4" strokeLinejoin="round" />
        <path d="M17 18.5v11l9-5.5z" fill="#fff" />
        <circle cx="10" cy="7" r="4" fill="none" stroke="#FF1744" strokeWidth="3" />
        <circle cx="22" cy="6" r="4.6" fill="none" stroke="#FF1744" strokeWidth="3" />
      </svg>
      {!compact && (
        <div className="leading-none">
          <div className="font-display text-[22px] font-bold tracking-tight">Reel<span className="text-accent">Craft</span></div>
          <div className="mt-1 pl-0.5 text-[10px] font-semibold tracking-[0.45em] text-fg-soft">STUDIO</div>
        </div>
      )}
    </div>
  )
}
