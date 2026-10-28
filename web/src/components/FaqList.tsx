import { ChevronDown } from 'lucide-react'

/** Native <details> accordion: keyboard and screen-reader friendly with no script. */
export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-black/10 border-y border-black/10">
      {items.map((f) => (
        <details key={f.q} className="group py-1">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-[0.98rem] font-bold text-ink [&::-webkit-details-marker]:hidden">
            {f.q}
            <ChevronDown className="h-5 w-5 shrink-0 text-brand transition-transform duration-300 group-open:rotate-180" aria-hidden />
          </summary>
          <p className="pb-5 pr-8 text-[0.93rem] leading-relaxed text-slate">{f.a}</p>
        </details>
      ))}
    </div>
  )
}
