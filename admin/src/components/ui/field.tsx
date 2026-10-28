import { useId, type InputHTMLAttributes, type ReactNode, type Ref, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Field({ label, error, help, children, className, required, htmlFor }: {
  label?: ReactNode; error?: string; help?: ReactNode; children: ReactNode; className?: string; required?: boolean; htmlFor?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && <label htmlFor={htmlFor} className="label">{label}{required && <span className="text-accent"> *</span>}</label>}
      {children}
      {error ? <p role="alert" className="text-xs font-medium text-red-400">{error}</p> : help ? <p className="help">{help}</p> : null}
    </div>
  )
}

type Common = { label?: ReactNode; error?: string; help?: ReactNode; wrapClassName?: string }

export function Input({ label, error, help, wrapClassName, className, id, required, ref, ...rest }: InputHTMLAttributes<HTMLInputElement> & Common & { ref?: Ref<HTMLInputElement> }) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <Field label={label} error={error} help={help} className={wrapClassName} required={required} htmlFor={fid}>
      <input ref={ref} id={fid} aria-invalid={!!error || undefined} required={required} className={cn('input', className)} {...rest} />
    </Field>
  )
}

export function Textarea({ label, error, help, wrapClassName, className, id, required, ref, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & Common & { ref?: Ref<HTMLTextAreaElement> }) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <Field label={label} error={error} help={help} className={wrapClassName} required={required} htmlFor={fid}>
      <textarea ref={ref} id={fid} aria-invalid={!!error || undefined} required={required} className={cn('input', className)} {...rest} />
    </Field>
  )
}

export function Select({ label, error, help, wrapClassName, className, id, options, placeholder, required, ref, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & Common & {
  options: { value: string; label: string }[]; placeholder?: string; ref?: Ref<HTMLSelectElement>
}) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <Field label={label} error={error} help={help} className={wrapClassName} required={required} htmlFor={fid}>
      <select ref={ref} id={fid} aria-invalid={!!error || undefined} required={required} className={cn('input', className)} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  )
}

export function Switch({ checked, onChange, label, description, disabled, id }: {
  checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; description?: ReactNode; disabled?: boolean; id?: string
}) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <div className="flex items-start justify-between gap-4">
      {(label || description) && (
        <label htmlFor={fid} className="min-w-0 cursor-pointer">
          {label && <span className="block text-sm font-medium text-fg">{label}</span>}
          {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
        </label>
      )}
      <button
        id={fid}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50', checked ? 'bg-accent' : 'bg-white/15')}
      >
        <span className={cn('inline-block size-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5.5' : 'translate-x-0.5')} />
      </button>
    </div>
  )
}

export function Checkbox({ checked, onChange, label, className, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; className?: string; disabled?: boolean }) {
  return (
    <label className={cn('flex cursor-pointer items-center gap-2.5 text-sm text-fg-soft', disabled && 'cursor-not-allowed opacity-60', className)}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="size-4 rounded border-line-strong accent-[#FF1744]" />
      <span className="min-w-0">{label}</span>
    </label>
  )
}
