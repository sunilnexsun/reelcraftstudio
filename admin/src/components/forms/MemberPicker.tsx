import { Check } from 'lucide-react'
import type { TeamMember } from '@/types/db'
import { Avatar } from '@/components/ui/avatar'
import { AVAILABILITY, ROLE_LABEL } from '@/lib/labels'
import { cn } from '@/lib/utils'

/** Multi-select of team members as toggle chips (keyboard: Tab + Space). */
export function MemberPicker({ team, value, onChange, label = 'Team', busyIds }: {
  team: TeamMember[]; value: string[]; onChange: (ids: string[]) => void; label?: string; busyIds?: Set<string>
}) {
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  return (
    <fieldset>
      <legend className="label mb-2">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {team.filter((t) => t.is_active || value.includes(t.id)).map((t) => {
          const on = value.includes(t.id)
          const busy = busyIds?.has(t.id)
          return (
            <button key={t.id} type="button" role="checkbox" aria-checked={on} onClick={() => toggle(t.id)}
              title={`${ROLE_LABEL[t.role]} · ${AVAILABILITY[t.availability].label}${busy ? ' · already booked at this time' : ''}`}
              className={cn('flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm transition-colors',
                on ? 'border-accent bg-accent-soft text-white' : 'border-line-strong text-fg-soft hover:border-white/30',
                busy && 'border-red-500/60')}>
              <Avatar name={t.full_name} size={24} />
              <span>{t.full_name}</span>
              {t.availability !== 'available' && <span className="text-[10px] text-amber-300">{AVAILABILITY[t.availability].label}</span>}
              {busy && <span className="text-[10px] font-semibold text-red-400">clash</span>}
              {on && <Check className="size-3.5 text-accent" aria-hidden />}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export function TagInput({ value, onChange, suggestions = [], placeholder, label, help }: {
  value: string[]; onChange: (v: string[]) => void; suggestions?: string[]; placeholder?: string; label: string; help?: string
}) {
  const add = (raw: string) => {
    const v = raw.trim()
    if (v && !value.includes(v)) onChange([...value, v])
  }
  return (
    <div>
      <label className="label mb-1.5 block">{label}</label>
      <div className="input flex h-auto min-h-10 flex-wrap items-center gap-1.5 py-1.5">
        {value.map((t) => (
          <span key={t} className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-xs">
            {t}<button type="button" aria-label={`Remove ${t}`} className="text-muted hover:text-white" onClick={() => onChange(value.filter((x) => x !== t))}>×</button>
          </span>
        ))}
        <input
          className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
          placeholder={placeholder}
          list={suggestions.length ? `${label}-suggest` : undefined}
          onKeyDown={(e) => {
            const el = e.currentTarget
            if ((e.key === 'Enter' || e.key === ',') && el.value.trim()) { e.preventDefault(); add(el.value); el.value = '' }
            if (e.key === 'Backspace' && !el.value && value.length) onChange(value.slice(0, -1))
          }}
          onBlur={(e) => { if (e.currentTarget.value.trim()) { add(e.currentTarget.value); e.currentTarget.value = '' } }}
        />
        {suggestions.length > 0 && <datalist id={`${label}-suggest`}>{suggestions.filter((s) => !value.includes(s)).map((s) => <option key={s} value={s} />)}</datalist>}
      </div>
      {help && <p className="help mt-1">{help}</p>}
    </div>
  )
}
