import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, LoaderCircle, Mail, MessageCircle, Send } from 'lucide-react'
import { serviceOptions } from '../data/services'
import { formEndpoint } from '../data/site'
import { SELECT_SERVICE_EVENT, mailtoLink, peekPendingService, takePendingService, whatsappLink } from '../lib/links'
import { ButtonLink } from './Button'

type Fields = {
  fullName: string
  phone: string
  email: string
  business: string
  service: string
  shootDate: string
  details: string
}
type Errors = Partial<Record<keyof Fields, string>>
type Status =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error'; message: string }
  | { kind: 'not-configured' }

const empty: Fields = { fullName: '', phone: '', email: '', business: '', service: '', shootDate: '', details: '' }
const MIN_FILL_MS = 3000 // submissions faster than this are treated as bots

function today() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

function validate(v: Fields): Errors {
  const e: Errors = {}
  if (v.fullName.trim().length < 2) e.fullName = 'Please enter your full name.'
  const digits = v.phone.replace(/\D/g, '')
  if (!digits) e.phone = 'Please enter your phone number.'
  else if (digits.length < 7 || digits.length > 15) e.phone = 'Enter a valid phone number, including country code if outside India.'
  if (v.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) e.email = 'Enter a valid email address.'
  if (!v.service) e.service = 'Please choose the service you’re interested in.'
  if (v.shootDate && v.shootDate < today()) e.shootDate = 'Preferred date can’t be in the past.'
  if (v.details.trim().length < 10) e.details = 'Tell us a little about your project (at least 10 characters).'
  return e
}

function summarise(v: Fields) {
  return [
    'New enquiry — Reel Craft Studio',
    `Name: ${v.fullName}`,
    `Phone: ${v.phone}`,
    v.email && `Email: ${v.email}`,
    v.business && `Business: ${v.business}`,
    `Service: ${v.service}`,
    v.shootDate && `Preferred shoot date: ${v.shootDate}`,
    `Project details: ${v.details}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function ContactForm() {
  const [values, setValues] = useState<Fields>(() => {
    const pre = peekPendingService()
    return { ...empty, service: pre && serviceOptions.includes(pre) ? pre : '' }
  })
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const startedAt = useRef(Date.now())
  const formRef = useRef<HTMLFormElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)
  const uid = useId()

  // "Book this service" on a service page preselects that service.
  useEffect(() => {
    takePendingService() // consumed by the initial state above

    const onSelect = (e: Event) => {
      const title = (e as CustomEvent<string>).detail
      if (serviceOptions.includes(title)) {
        takePendingService()
        setValues((v) => ({ ...v, service: title }))
      }
    }
    window.addEventListener(SELECT_SERVICE_EVENT, onSelect)
    return () => window.removeEventListener(SELECT_SERVICE_EVENT, onSelect)
  }, [])

  const set = (key: keyof Fields) => (value: string) => {
    setValues((v) => ({ ...v, [key]: value }))
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }))
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const errs = validate(values)
    setErrors(errs)
    const firstInvalid = (Object.keys(errs) as (keyof Fields)[])[0]
    if (firstInvalid) {
      form.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus()
      return
    }

    // Spam protection (client side): honeypot + minimum fill time.
    // Pair with server-side checks (e.g. Cloudflare Turnstile) in production — see README.
    const honeypot = (form.elements.namedItem('company_website') as HTMLInputElement | null)?.value
    if (honeypot || Date.now() - startedAt.current < MIN_FILL_MS) {
      setStatus({ kind: 'error', message: 'Something looked off with that submission. Please wait a moment and try again.' })
      return
    }

    if (!formEndpoint) {
      // No backend connected: be honest and offer working alternatives.
      setStatus({ kind: 'not-configured' })
      requestAnimationFrame(() => statusRef.current?.focus())
      return
    }

    setStatus({ kind: 'submitting' })
    try {
      const res = await fetch(formEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          'Full name': values.fullName,
          Phone: values.phone,
          Email: values.email || '—',
          Business: values.business || '—',
          Service: values.service,
          'Preferred shoot date': values.shootDate || '—',
          'Project details': values.details,
          // FormSubmit options (ignored by other services)
          _subject: `New shoot booking: ${values.service} — ${values.fullName}`,
          _template: 'table',
          _captcha: 'false',
          ...(values.email ? { _replyto: values.email } : {}),
        }),
      })
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      // FormSubmit answers 200 with { success: "false" } until the inbox owner activates the form.
      const data = (await res.json().catch(() => ({}))) as { success?: string | boolean }
      if (data.success === false || data.success === 'false') throw new Error('Delivery not confirmed')
      setStatus({ kind: 'success' })
      setValues(empty)
      startedAt.current = Date.now()
    } catch {
      setStatus({
        kind: 'error',
        message: 'We couldn’t send your enquiry just now. Please try again, or reach us on WhatsApp.',
      })
    }
    requestAnimationFrame(() => statusRef.current?.focus())
  }

  const wa = whatsappLink(summarise(values))
  const mail = mailtoLink(`Enquiry from ${values.fullName || 'website'}`, summarise(values))
  const submitting = status.kind === 'submitting'

  return (
    <form
      ref={formRef}
      id="enquiry-form"
      noValidate
      onSubmit={onSubmit}
      aria-labelledby={`${uid}-title`}
      className="relative rounded-[16px] border border-white/10 bg-charcoal/85 p-5 shadow-2xl backdrop-blur-md sm:p-7"
    >
      <h3 id={`${uid}-title`} className="font-display text-lg font-bold text-white">
        Book a Shoot
      </h3>
      <p className="mt-1 text-xs text-white/55">
        Share a few details and we’ll get back to you to plan your shoot. Fields marked{' '}
        <span className="text-brand">*</span> are required.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field id="fullName" label="Full Name" required error={errors.fullName}>
          {(p) => <input {...p} type="text" autoComplete="name" value={values.fullName} onChange={(e) => set('fullName')(e.target.value)} />}
        </Field>
        <Field id="phone" label="Phone Number" required error={errors.phone}>
          {(p) => <input {...p} type="tel" inputMode="tel" autoComplete="tel" value={values.phone} onChange={(e) => set('phone')(e.target.value)} />}
        </Field>
        <Field id="email" label="Email Address" error={errors.email}>
          {(p) => <input {...p} type="email" autoComplete="email" value={values.email} onChange={(e) => set('email')(e.target.value)} />}
        </Field>
        <Field id="business" label="Business Name" error={errors.business}>
          {(p) => <input {...p} type="text" autoComplete="organization" value={values.business} onChange={(e) => set('business')(e.target.value)} />}
        </Field>
        <Field id="service" label="Service Interested In" required error={errors.service}>
          {(p) => (
            <select {...p} value={values.service} onChange={(e) => set('service')(e.target.value)}>
              <option value="" disabled>
                Select a service
              </option>
              {serviceOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field id="shootDate" label="Preferred Shoot Date" hint="(optional)" error={errors.shootDate}>
          {(p) => <input {...p} type="date" min={today()} value={values.shootDate} onChange={(e) => set('shootDate')(e.target.value)} className={`${p.className} [color-scheme:dark]`} />}
        </Field>
        <div className="sm:col-span-2">
          <Field id="details" label="Project Details" required error={errors.details}>
            {(p) => (
              <textarea
                {...p}
                rows={4}
                placeholder="Tell us about your business, the video you have in mind, and any deadlines…"
                value={values.details}
                onChange={(e) => set('details')(e.target.value)}
              />
            )}
          </Field>
        </div>
      </div>

      {/* Honeypot: hidden from people, tempting for bots */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${uid}-hp`}>Company website</label>
        <input id={`${uid}-hp`} type="text" name="company_website" tabIndex={-1} autoComplete="off" />
      </div>

      <button
        type="submit"
        disabled={submitting}
        aria-busy={submitting}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-[10px] bg-brand font-display text-[0.9rem] font-bold text-white transition-colors hover:bg-brand-deep disabled:cursor-wait disabled:opacity-70"
      >
        {submitting ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> Sending…
          </>
        ) : (
          <>
            Submit Enquiry <Send className="h-4 w-4" aria-hidden />
          </>
        )}
      </button>
      {wa && (
        <p className="mt-3 text-center text-xs text-white/55">
          Prefer WhatsApp?{' '}
          <a href={wa} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#3ddc84] underline-offset-2 hover:underline">
            Send these details on WhatsApp
          </a>
        </p>
      )}

      {/* Status messages — announced to screen readers */}
      <div ref={statusRef} tabIndex={-1} role="status" aria-live="polite" className="outline-none">
        {status.kind === 'success' && (
          <Notice tone="success" icon={<CheckCircle2 className="h-5 w-5" />}>
            Thank you! Your booking request has been sent. We’ll call or WhatsApp you soon to plan the shoot.
          </Notice>
        )}
        {status.kind === 'error' && (
          <Notice tone="error" icon={<AlertCircle className="h-5 w-5" />}>
            <span className="block">{status.message}</span>
            {wa && (
              <span className="mt-3 flex flex-wrap gap-2">
                <ButtonLink href={wa} target="_blank" rel="noopener noreferrer" variant="whatsapp" icon={<MessageCircle className="h-4 w-4" aria-hidden />}>
                  Send via WhatsApp
                </ButtonLink>
              </span>
            )}
          </Notice>
        )}
        {status.kind === 'not-configured' && (
          <Notice tone="info" icon={<AlertCircle className="h-5 w-5" />}>
            <span className="block">
              Our online form isn’t connected yet, so your enquiry has <strong>not</strong> been sent.
              {wa || mail ? ' Send the same details in one tap instead:' : ' Please contact us directly using the details on this page.'}
            </span>
            {(wa || mail) && (
              <span className="mt-3 flex flex-wrap gap-2">
                {wa && (
                  <ButtonLink href={wa} target="_blank" rel="noopener noreferrer" variant="whatsapp" icon={<MessageCircle className="h-4 w-4" aria-hidden />}>
                    Send via WhatsApp
                  </ButtonLink>
                )}
                {mail && (
                  <ButtonLink href={mail} variant="outline" icon={<Mail className="h-4 w-4" aria-hidden />}>
                    Send via Email
                  </ButtonLink>
                )}
              </span>
            )}
          </Notice>
        )}
      </div>
    </form>
  )
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

interface FieldControlProps {
  id: string
  name: string
  className: string
  required?: boolean
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  'aria-required'?: boolean
}

function Field({
  id, label, required, hint, error, children,
}: {
  id: keyof Fields
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: (props: FieldControlProps) => ReactNode
}) {
  const inputId = `f-${id}`
  const errId = `${inputId}-error`
  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-[0.78rem] font-medium text-white/80">
        {label}
        {required && <span className="ml-0.5 text-brand" aria-hidden> *</span>}
        {hint && <span className="ml-1 text-white/40">{hint}</span>}
      </label>
      {children({
        id: inputId,
        name: id,
        'aria-required': required || undefined,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error ? errId : undefined,
        className: `w-full rounded-[9px] border bg-ink/70 px-3.5 py-3 text-[0.92rem] text-white placeholder:text-white/30 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30 ${
          error ? 'border-brand' : 'border-white/12 hover:border-white/25'
        }`,
      })}
      {error && (
        <p id={errId} className="mt-1.5 flex items-center gap-1.5 text-[0.76rem] text-[#ff6b86]">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  )
}

function Notice({ tone, icon, children }: { tone: 'success' | 'error' | 'info'; icon: ReactNode; children: ReactNode }) {
  const styles = {
    success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
    error: 'border-brand/50 bg-brand/10 text-[#ffb3c1]',
    info: 'border-white/15 bg-white/5 text-white/85',
  }[tone]
  return (
    <div className={`mt-4 flex gap-3 rounded-[10px] border p-4 text-sm leading-relaxed ${styles}`}>
      <span className="mt-0.5 shrink-0" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
