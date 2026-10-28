/**
 * Reference implementation of the public website integration. It uses only what an anonymous
 * visitor is allowed: reading active services / published portfolio / approved testimonials,
 * and calling submit_enquiry / submit_booking_request. Port these pieces into the existing site,
 * or use public/embed/reelcraft-forms.js for a no-build drop-in.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CalendarCheck, CheckCircle2, Clock, MessageCircle, Play, Send, Star } from 'lucide-react'
import { Logo } from '@/components/layout/Logo'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/field'
import { Dialog } from '@/components/ui/dialog'
import { db } from '@/lib/data'
import { useTable } from '@/hooks/useData'
import { useAuth } from '@/lib/auth'
import { parseVideoUrl } from '@/lib/domain/video'
import { istInputToISO, todayIST } from '@/lib/domain/dates'
import { email, money, opt, phone, req, toMoney, toText } from '@/lib/validation'
import { placeholderArt } from '@/lib/art'
import { whatsappLink } from '@/lib/utils'
import { priceLabel } from '@/features/services/ServicesPage'
import { SHOOT_TYPES } from '@/lib/labels'
import type { PortfolioItem } from '@/types/db'

export default function PublicSitePage() {
  const { mode } = useAuth()
  const services = useTable('services')
  const portfolio = useTable('portfolio_items')
  const testimonials = useTable('testimonials')
  const [playing, setPlaying] = useState<PortfolioItem | null>(null)
  const active = services.data.filter((s) => s.is_active).sort((a, b) => a.sort_order - b.sort_order)
  const work = portfolio.data.filter((p) => p.is_published).sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || a.sort_order - b.sort_order)
  const quotes = testimonials.data.filter((t) => t.status === 'approved').sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || a.sort_order - b.sort_order)
  const wa = whatsappLink('+91 98400 12345', 'Hi ReelCraft Studio! I would like to discuss a video project.')

  return (
    <div className="min-h-dvh bg-bg">
      <div className="border-b border-amber-400/20 bg-amber-400/[0.07] px-4 py-2 text-center text-xs text-amber-200">
        Website integration preview — this page shows what visitors see and submits through the public API{mode === 'demo' ? ' (demo data)' : ''}. <Link to="/" className="font-semibold underline">Back to admin</Link>
      </div>
      <header className="hero-glow relative">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5"><Logo /><a href="#book" className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover">Book a Shoot</a></nav>
        <div className="mx-auto max-w-6xl px-5 pt-10 pb-16">
          <h1 className="max-w-3xl font-display text-4xl leading-tight font-bold sm:text-6xl">Reels, brand films & commercials that <span className="text-accent">stop the scroll.</span></h1>
          <p className="mt-4 max-w-xl text-lg text-fg-soft">Video production for brands across Tamil Nadu — concept to delivery.</p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-20 px-5 pb-24">
        <section aria-labelledby="svc"><h2 id="svc" className="mb-6 font-display text-3xl font-bold">Services</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{active.map((s) => (
            <li key={s.id} className="card overflow-hidden"><img src={s.thumbnail_url ?? placeholderArt(s.slug)} alt="" className="aspect-[16/9] w-full object-cover" /><div className="p-4"><p className="font-semibold">{s.title}</p><p className="mt-1 line-clamp-2 text-sm text-muted">{s.description}</p><p className="mt-2 text-sm font-semibold text-accent">{priceLabel(s)}</p>{s.delivery_estimate && <p className="mt-1 flex items-center gap-1 text-xs text-muted"><Clock className="size-3" />{s.delivery_estimate}</p>}</div></li>
          ))}</ul>
        </section>

        <section aria-labelledby="pf"><h2 id="pf" className="mb-6 font-display text-3xl font-bold">Portfolio</h2>
          {work.length ? <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{work.map((p) => (
            <li key={p.id}><button type="button" onClick={() => setPlaying(p)} className="group relative block aspect-video w-full overflow-hidden rounded-2xl ring-1 ring-white/10" aria-label={`Play ${p.title}`}>
              <img src={p.thumbnail_url ?? parseVideoUrl(p.video_url)?.thumbnailUrl ?? placeholderArt(p.title, p.category.toUpperCase())} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
              <span className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" /><span className="absolute inset-0 grid place-items-center"><span className="grid size-12 place-items-center rounded-full border-2 border-white bg-black/40"><Play className="size-5 fill-white" /></span></span>
              <span className="absolute bottom-3 left-3 text-left"><span className="block font-semibold">{p.title}</span><span className="text-xs text-fg-soft">{p.category}</span></span>
              {p.is_featured && <span className="absolute top-3 left-3 rounded-md bg-accent px-2 py-0.5 text-[11px] font-bold">Featured</span>}
            </button></li>
          ))}</ul> : <p className="text-muted">Portfolio coming soon.</p>}
        </section>

        {quotes.length > 0 && <section aria-labelledby="tm"><h2 id="tm" className="mb-6 font-display text-3xl font-bold">What clients say</h2>
          <ul className="grid gap-4 md:grid-cols-3">{quotes.slice(0, 6).map((t) => <li key={t.id} className="card p-5"><div className="flex gap-0.5">{Array.from({ length: t.rating }, (_, i) => <Star key={i} className="size-4 fill-amber-400 text-amber-400" />)}</div><p className="mt-3 text-sm text-fg-soft">“{t.content}”</p><p className="mt-4 text-sm font-semibold">{t.client_name}</p><p className="text-xs text-muted">{t.company}</p></li>)}</ul>
        </section>}

        <div className="grid gap-6 lg:grid-cols-2">
          <section id="contact" aria-labelledby="eq" className="card p-6"><h2 id="eq" className="mb-1 font-display text-2xl font-bold">Get a quote</h2><p className="mb-5 text-sm text-muted">Tell us about your project — we reply within a working day.</p><EnquiryWidget services={active.map((s) => ({ value: s.slug, label: s.title }))} /></section>
          <section id="book" aria-labelledby="bk" className="card p-6"><h2 id="bk" className="mb-1 font-display text-2xl font-bold">Book a shoot</h2><p className="mb-5 text-sm text-muted">Request a date. We'll confirm crew and availability by phone.</p><BookingWidget /></section>
        </div>
      </main>

      {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="fixed right-5 bottom-5 grid size-14 place-items-center rounded-full bg-[#25D366] text-white shadow-xl hover:scale-105" aria-label="Chat on WhatsApp"><MessageCircle className="size-7" /></a>}
      <Dialog open={!!playing} onClose={() => setPlaying(null)} size="lg" title={playing?.title}>
        {playing && (() => { const v = parseVideoUrl(playing.video_url); return <div className="aspect-video overflow-hidden rounded-xl bg-black">{v?.embedUrl ? <iframe src={v.embedUrl} title={playing.title} className="h-full w-full" allow="encrypted-media; fullscreen; picture-in-picture" /> : playing.media_url ? <video src={playing.media_url} controls className="h-full w-full" /> : <img src={playing.thumbnail_url ?? placeholderArt(playing.title)} alt="" className="h-full w-full object-cover" />}</div> })()}
      </Dialog>
    </div>
  )
}

function Done({ title, body, onAgain }: { title: string; body: string; onAgain: () => void }) {
  return <div role="status" className="py-8 text-center"><CheckCircle2 className="mx-auto size-12 text-emerald-400" /><p className="mt-3 font-display text-xl font-semibold">{title}</p><p className="mt-1 text-sm text-muted">{body}</p><Button className="mt-5" size="sm" variant="ghost" onClick={onAgain}>Send another</Button></div>
}

const enquirySchema = z.object({ name: req('Name', 2, 120), phone, email, business: opt(120), service: z.string(), budget: money, message: opt(2000), website: z.string() })
  .refine((v) => v.phone.trim() || v.email.trim(), { message: 'Add a phone number or email', path: ['phone'] })

function EnquiryWidget({ services }: { services: { value: string; label: string }[] }) {
  const [state, setState] = useState<'idle' | 'done' | 'duplicate'>('idle')
  const [err, setErr] = useState<string | null>(null)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<z.infer<typeof enquirySchema>>({ resolver: zodResolver(enquirySchema), defaultValues: { name: '', phone: '', email: '', business: '', service: '', budget: '', message: '', website: '' } })
  if (state !== 'idle') return <Done title={state === 'duplicate' ? 'We already have your enquiry' : 'Thanks — enquiry received!'} body={state === 'duplicate' ? 'You sent this recently, so we didn’t create a duplicate. We’ll be in touch soon.' : 'Our team will call or WhatsApp you shortly.'} onAgain={() => { reset(); setState('idle') }} />
  return (
    <form noValidate className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(async (v) => {
      setErr(null)
      try {
        const r = await db.rpc('submit_enquiry', { p_name: v.name, p_phone: toText(v.phone), p_email: toText(v.email), p_business: toText(v.business), p_service_slug: v.service || null, p_budget: toMoney(v.budget), p_message: toText(v.message), p_website: v.website || null })
        setState(r.duplicate ? 'duplicate' : 'done')
      } catch (e) { setErr((e as Error).message) }
    })}>
      <Input label="Your name" required autoComplete="name" {...register('name')} error={errors.name?.message} />
      <Input label="Business name" autoComplete="organization" {...register('business')} />
      <Input label="Phone / WhatsApp" type="tel" autoComplete="tel" {...register('phone')} error={errors.phone?.message} />
      <Input label="Email" type="email" autoComplete="email" {...register('email')} error={errors.email?.message} />
      <Select label="Service" options={services} placeholder="Not sure yet" {...register('service')} />
      <Input label="Budget (₹, optional)" inputMode="decimal" {...register('budget')} error={errors.budget?.message} />
      <Textarea label="Tell us about the project" rows={3} {...register('message')} wrapClassName="sm:col-span-2" />
      {/* honeypot: hidden from people, filled by bots */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden"><label>Website<input tabIndex={-1} autoComplete="off" {...register('website')} /></label></div>
      {err && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 sm:col-span-2">{err}</p>}
      <Button type="submit" variant="primary" size="lg" icon={<Send />} loading={isSubmitting} className="sm:col-span-2">Send enquiry</Button>
    </form>
  )
}

const bookingSchema = z.object({ name: req('Name', 2, 120), phone: phone.refine((v) => v.trim() !== '', 'Phone is required'), email, type: z.string(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'), time: z.string().regex(/^\d{2}:\d{2}$/, 'Pick a time'), hours: z.string(), location: opt(300), message: opt(2000), website: z.string() })
  .refine((v) => !v.date || v.date > todayIST(), { message: 'Choose a date from tomorrow onwards', path: ['date'] })

function BookingWidget() {
  const [state, setState] = useState<'idle' | 'done' | 'duplicate'>('idle')
  const [err, setErr] = useState<string | null>(null)
  const tomorrow = useMemo(() => { const d = new Date(todayIST() + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10) }, [])
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<z.infer<typeof bookingSchema>>({ resolver: zodResolver(bookingSchema), defaultValues: { name: '', phone: '', email: '', type: SHOOT_TYPES[0], date: '', time: '10:00', hours: '2', location: '', message: '', website: '' } })
  if (state !== 'idle') return <Done title={state === 'duplicate' ? 'Request already received' : 'Shoot request sent!'} body="This is a request — we’ll confirm the date, crew and advance with you before it’s booked." onAgain={() => { reset(); setState('idle') }} />
  return (
    <form noValidate className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(async (v) => {
      setErr(null)
      try {
        const r = await db.rpc('submit_booking_request', { p_name: v.name, p_phone: toText(v.phone), p_email: toText(v.email), p_shoot_type: v.type, p_preferred_start: istInputToISO(`${v.date}T${v.time}`), p_duration_hours: Number(v.hours), p_location: toText(v.location), p_message: toText(v.message), p_website: v.website || null })
        setState(r.duplicate ? 'duplicate' : 'done')
      } catch (e) { setErr((e as Error).message) }
    })}>
      <Input label="Your name" required autoComplete="name" {...register('name')} error={errors.name?.message} />
      <Input label="Phone / WhatsApp" required type="tel" autoComplete="tel" {...register('phone')} error={errors.phone?.message} />
      <Input label="Email" type="email" autoComplete="email" {...register('email')} error={errors.email?.message} />
      <Select label="Shoot type" options={SHOOT_TYPES.map((s) => ({ value: s, label: s }))} {...register('type')} />
      <Input label="Preferred date" type="date" required min={tomorrow} {...register('date')} error={errors.date?.message} />
      <div className="grid grid-cols-2 gap-3"><Input label="Start time" type="time" required {...register('time')} error={errors.time?.message} /><Select label="Hours" options={['1', '2', '3', '4', '6', '8', '10'].map((h) => ({ value: h, label: `${h} h` }))} {...register('hours')} /></div>
      <Input label="Location" {...register('location')} wrapClassName="sm:col-span-2" placeholder="City / venue" />
      <Textarea label="Anything we should know?" rows={2} {...register('message')} wrapClassName="sm:col-span-2" />
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden"><label>Website<input tabIndex={-1} autoComplete="off" {...register('website')} /></label></div>
      {err && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 sm:col-span-2">{err}</p>}
      <Button type="submit" variant="primary" size="lg" icon={<CalendarCheck />} loading={isSubmitting} className="sm:col-span-2">Request this date</Button>
    </form>
  )
}
