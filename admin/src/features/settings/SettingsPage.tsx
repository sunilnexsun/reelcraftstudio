import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Database, ExternalLink, RotateCcw, ShieldCheck, Eraser } from 'lucide-react'
import type { AppRole, Profile, StudioSettings } from '@/types/db'
import { Card, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Input, Switch, Textarea } from '@/components/ui/field'
import { Tabs } from '@/components/ui/segmented'
import { ErrorState, LoadingBlock } from '@/components/ui/states'
import { useConfirm } from '@/components/ui/confirm'
import { ImageUpload } from '@/components/forms/FileUpload'
import { usePageHeader } from '@/components/layout/PageMeta'
import { db, demo, DATA_MODE } from '@/lib/data'
import { invalidateAll, mutate, resetCache, useTable } from '@/hooks/useData'
import { useAuth } from '@/lib/auth'
import { canManageUsers } from '@/lib/permissions'
import { ROLE_LABEL } from '@/lib/labels'
import { email, hex, opt, phone, req, str, toText, url } from '@/lib/validation'
import { passwordSchema } from '@/pages/AuthPages'

type Tab = 'studio' | 'invoicing' | 'users' | 'notifications' | 'security' | 'data'

export default function SettingsPage() {
  usePageHeader({ subtitle: 'Studio profile, invoicing, users and security.', showDateRange: false })
  const { role } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'studio'
  const { data, loading, error, refetch } = useTable('studio_settings')
  const s = data[0]
  const owner = role === 'owner'
  if (error) return <Card><ErrorState message={error.message} onRetry={refetch} /></Card>
  if (loading && !s) return <LoadingBlock rows={8} />
  return (
    <div className="space-y-5">
      <Tabs<Tab> value={tab} onChange={(t) => setParams({ tab: t }, { replace: true })} tabs={[
        { value: 'studio', label: 'Studio' }, { value: 'invoicing', label: 'Invoicing & tax' },
        ...(canManageUsers(role) ? [{ value: 'users' as Tab, label: 'Users & roles' }] : []),
        { value: 'notifications', label: 'Notifications' }, { value: 'security', label: 'Security' }, { value: 'data', label: 'Data & website' },
      ]} />
      {!owner && tab !== 'security' && tab !== 'data' && <p className="text-sm text-muted">Only an owner can change studio settings. You can view them here.</p>}
      {tab === 'studio' && s && <StudioForm s={s} readOnly={!owner} />}
      {tab === 'invoicing' && s && <InvoicingForm s={s} readOnly={!owner} />}
      {tab === 'users' && canManageUsers(role) && <UsersPanel />}
      {tab === 'notifications' && s && <NotificationsPanel s={s} readOnly={!owner} />}
      {tab === 'security' && s && <SecurityPanel s={s} readOnly={!owner} />}
      {tab === 'data' && <DataPanel />}
    </div>
  )
}

async function saveSettings(patch: Partial<StudioSettings>) {
  try { await mutate(() => db.update('studio_settings', '1', patch as never), 'studio_settings'); toast.success('Settings saved') } catch (e) { toast.error((e as Error).message) }
}

const studioSchema = z.object({ studio_name: req('Studio name', 2, 80), email, phone, whatsapp: phone, address: opt(300), website: url, primary_color: hex, accent_color: hex })
function StudioForm({ s, readOnly }: { s: StudioSettings; readOnly: boolean }) {
  const [logo, setLogo] = useState<string | null>(s.logo_url)
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<z.infer<typeof studioSchema>>({ resolver: zodResolver(studioSchema), defaultValues: { studio_name: s.studio_name, email: str(s.email), phone: str(s.phone), whatsapp: str(s.whatsapp), address: str(s.address), website: str(s.website), primary_color: s.primary_color, accent_color: s.accent_color } })
  const [pc, ac] = watch(['primary_color', 'accent_color'])
  return (
    <Card className="p-5 sm:p-6">
      <form onSubmit={handleSubmit((v) => saveSettings({ ...v, email: toText(v.email), phone: toText(v.phone), whatsapp: toText(v.whatsapp), address: toText(v.address), website: toText(v.website), logo_url: logo }))} className="grid gap-5 lg:grid-cols-[240px_1fr]" noValidate>
        <ImageUpload label="Logo" bucket="branding" folder="logo" value={logo} onChange={setLogo} aspect="aspect-[3/2]" maxMB={5} accept={['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']} help="Shown on invoices. PNG or SVG with transparent background works best." />
        <fieldset disabled={readOnly} className="grid content-start gap-4 sm:grid-cols-2">
          <Input label="Studio name" required {...register('studio_name')} error={errors.studio_name?.message} />
          <Input label="Website" {...register('website')} error={errors.website?.message} placeholder="https://reelcraft.studio" />
          <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
          <Input label="Phone" type="tel" {...register('phone')} error={errors.phone?.message} />
          <Input label="WhatsApp" type="tel" {...register('whatsapp')} error={errors.whatsapp?.message} />
          <div />
          <Textarea label="Address" rows={2} {...register('address')} wrapClassName="sm:col-span-2" />
          <div className="flex items-end gap-3"><Input label="Primary colour" {...register('primary_color')} error={errors.primary_color?.message} wrapClassName="flex-1" /><span className="mb-1 size-8 rounded-lg ring-1 ring-white/20" style={{ background: /^#[0-9a-f]{6}$/i.test(pc) ? pc : '#000' }} aria-hidden /></div>
          <div className="flex items-end gap-3"><Input label="Accent colour" {...register('accent_color')} error={errors.accent_color?.message} wrapClassName="flex-1" /><span className="mb-1 size-8 rounded-lg ring-1 ring-white/20" style={{ background: /^#[0-9a-f]{6}$/i.test(ac) ? ac : '#000' }} aria-hidden /></div>
          <p className="text-xs text-muted sm:col-span-2">Brand colours are stored for invoices and the public website. The admin interface keeps the ReelCraft theme.</p>
          {!readOnly && <div className="sm:col-span-2"><Button type="submit" variant="primary" loading={isSubmitting}>Save studio details</Button></div>}
        </fieldset>
      </form>
    </Card>
  )
}

const invSchema = z.object({
  invoice_prefix: z.string().trim().min(1).max(12).regex(/^[A-Za-z0-9\-/]+$/, 'Letters, numbers, - and /'), next_invoice_number: z.string().regex(/^\d{1,7}$/, 'Whole number').refine((v) => Number(v) > 0, 'Must be at least 1'),
  default_tax_rate: z.string().refine((v) => /^\d{1,3}(\.\d{1,2})?$/.test(v) && Number(v) <= 100, '0–100'), tax_label: z.string().trim().min(1).max(20),
  gstin: z.string().trim().refine((v) => v === '' || /^[0-9A-Z]{15}$/i.test(v), '15 characters'), invoice_terms: opt(2000),
})
function InvoicingForm({ s, readOnly }: { s: StudioSettings; readOnly: boolean }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof invSchema>>({ resolver: zodResolver(invSchema), defaultValues: { invoice_prefix: s.invoice_prefix, next_invoice_number: String(s.next_invoice_number), default_tax_rate: String(s.default_tax_rate), tax_label: s.tax_label, gstin: str(s.gstin), invoice_terms: str(s.invoice_terms) } })
  return (
    <Card className="p-5 sm:p-6">
      <form onSubmit={handleSubmit((v) => saveSettings({ invoice_prefix: v.invoice_prefix, next_invoice_number: Number(v.next_invoice_number), default_tax_rate: Number(v.default_tax_rate), tax_label: v.tax_label, gstin: toText(v.gstin)?.toUpperCase() ?? null, invoice_terms: toText(v.invoice_terms) }))} noValidate>
        <fieldset disabled={readOnly} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="Currency" value="INR (₹)" readOnly disabled help="Fixed for this studio" />
          <Input label="Time zone" value="Asia/Kolkata (IST)" readOnly disabled help="All dates and times use IST" />
          <Input label="Studio GSTIN" {...register('gstin')} error={errors.gstin?.message} />
          <Input label="Invoice prefix" {...register('invoice_prefix')} error={errors.invoice_prefix?.message} help={`Numbers look like ${s.invoice_prefix}26-0001`} />
          <Input label="Next invoice number" inputMode="numeric" {...register('next_invoice_number')} error={errors.next_invoice_number?.message} help="Only increase this; lowering it can create duplicates" />
          <div className="grid grid-cols-2 gap-3"><Input label="Tax label" {...register('tax_label')} error={errors.tax_label?.message} /><Input label="Default rate (%)" inputMode="decimal" {...register('default_tax_rate')} error={errors.default_tax_rate?.message} /></div>
          <Textarea label="Default payment terms" rows={3} {...register('invoice_terms')} wrapClassName="sm:col-span-2 lg:col-span-3" />
          {!readOnly && <div><Button type="submit" variant="primary" loading={isSubmitting}>Save invoicing settings</Button></div>}
        </fieldset>
      </form>
    </Card>
  )
}

function UsersPanel() {
  const { profile: me } = useAuth()
  const { data, loading } = useTable('profiles')
  const [busy, setBusy] = useState<string | null>(null)
  const update = async (p: Profile, patch: Partial<Profile>) => {
    setBusy(p.id)
    try { await mutate(() => db.update('profiles', p.id, patch), 'profiles'); toast.success('User updated') } catch (e) { toast.error((e as Error).message) } finally { setBusy(null) }
  }
  const pending = data.filter((p) => !p.is_active)
  return (
    <Card>
      <CardHeader title="Users & roles" subtitle="New sign-ups have no access until you assign a role and activate them. Turn off public sign-ups in Supabase (Auth → Providers → Email) and invite staff instead." />
      {loading && !data.length ? <LoadingBlock /> : (
        <ul className="divide-y divide-line border-t border-line">
          {[...pending, ...data.filter((p) => p.is_active)].map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 sm:px-6">
              <Avatar name={p.full_name || p.email} size={36} />
              <div className="min-w-0 flex-1"><p className="truncate font-medium">{p.full_name || '—'} {p.id === me?.id && <Badge tone="pink" className="ml-1">You</Badge>}</p><p className="truncate text-xs text-muted">{p.email}</p></div>
              {!p.is_active && <Badge tone="amber">Pending</Badge>}
              <select aria-label={`Role for ${p.email}`} className="input h-9 w-auto" value={p.role ?? ''} disabled={busy === p.id || p.id === me?.id}
                onChange={(e) => update(p, { role: (e.target.value || null) as AppRole | null })}>
                <option value="">No role</option>
                {(Object.keys(ROLE_LABEL) as AppRole[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
              <Switch checked={p.is_active} disabled={busy === p.id || p.id === me?.id || (!p.role && !p.is_active)} onChange={(v) => update(p, { is_active: v })} label={<span className="text-xs">{p.is_active ? 'Active' : 'Inactive'}</span>} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function NotificationsPanel({ s, readOnly }: { s: StudioSettings; readOnly: boolean }) {
  const [prefs, setPrefs] = useState(s.notification_prefs)
  useEffect(() => setPrefs(s.notification_prefs), [s.notification_prefs])
  const items: [keyof StudioSettings['notification_prefs'], string, string][] = [
    ['new_enquiry', 'New website enquiries', 'Alert owners and managers when the website form is submitted'],
    ['booking_request', 'Booking requests', 'Alert when someone requests a shoot from the website'],
    ['payment_received', 'Payments received', 'Show an alert when a payment is recorded'],
    ['invoice_overdue', 'Overdue invoices', 'Remind about invoices past their due date'],
  ]
  return (
    <Card className="p-5 sm:p-6">
      <div className="max-w-xl space-y-5">
        {items.map(([k, label, desc]) => <Switch key={k} checked={prefs[k]} disabled={readOnly} onChange={(v) => setPrefs({ ...prefs, [k]: v })} label={label} description={desc} />)}
        <p className="text-xs text-muted">These are in-app notifications (the bell). Email or WhatsApp alerts need an external integration, which isn't configured.</p>
        {!readOnly && <Button variant="primary" onClick={() => saveSettings({ notification_prefs: prefs })}>Save preferences</Button>}
      </div>
    </Card>
  )
}

function SecurityPanel({ s, readOnly }: { s: StudioSettings; readOnly: boolean }) {
  const { mode, updatePassword } = useAuth()
  const [timeout, setTimeoutMin] = useState(String(s.session_timeout_minutes))
  const pw = useForm<z.infer<typeof passwordSchema>>({ resolver: zodResolver(passwordSchema) })
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">Change your password</h2>
        {mode === 'demo' ? <p className="text-sm text-muted">Not available in demo mode.</p> : (
          <form className="space-y-4" noValidate onSubmit={pw.handleSubmit(async (v) => { try { await updatePassword(v.password); pw.reset(); toast.success('Password changed') } catch (e) { toast.error((e as Error).message) } })}>
            <Input label="New password" type="password" autoComplete="new-password" {...pw.register('password')} error={pw.formState.errors.password?.message} />
            <Input label="Confirm" type="password" autoComplete="new-password" {...pw.register('confirm')} error={pw.formState.errors.confirm?.message} />
            <Button type="submit" variant="primary" loading={pw.formState.isSubmitting}>Update password</Button>
          </form>
        )}
      </Card>
      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold"><ShieldCheck className="size-5 text-accent" />Session & access</h2>
        <div className="space-y-4">
          <Input label="Sign out after inactivity (minutes)" inputMode="numeric" value={timeout} disabled={readOnly} onChange={(e) => setTimeoutMin(e.target.value)} help="Between 15 and 10080 (7 days). Applies in live mode." />
          {!readOnly && <Button variant="primary" onClick={() => { const n = Number(timeout); if (!Number.isInteger(n) || n < 15 || n > 10080) { toast.error('Enter 15–10080 minutes'); return } void saveSettings({ session_timeout_minutes: n }) }}>Save</Button>}
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">
            <li>Every table is protected by Row Level Security; roles are checked in the database, not just the UI.</li>
            <li>The browser only ever holds the publishable key. Keep the service-role key out of this app.</li>
            <li>Enable leaked-password protection and MFA in your Supabase Auth settings.</li>
          </ul>
        </div>
      </Card>
    </div>
  )
}

function DataPanel() {
  const { role, refreshProfile } = useAuth()
  const confirm = useConfirm()
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const snippet = `<script src="${origin}/embed/reelcraft-forms.js" data-supabase-url="https://YOUR-PROJECT.supabase.co" data-supabase-key="YOUR_PUBLISHABLE_KEY" defer></script>\n<div data-reelcraft-form="enquiry"></div>\n<div data-reelcraft-form="booking"></div>`
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="p-5 sm:p-6">
        <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-semibold"><Database className="size-5 text-accent" />Data source</h2>
        <p className="text-sm text-fg-soft">Currently using <Badge tone={DATA_MODE === 'live' ? 'green' : 'amber'}>{DATA_MODE === 'live' ? 'Live — Supabase' : 'Demo — sample data in this browser'}</Badge></p>
        {DATA_MODE === 'demo' ? (
          <>
            <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-muted">
              <li>Create a Supabase project and run the SQL files in <code className="text-fg-soft">supabase/migrations</code>.</li>
              <li>Set <code className="text-fg-soft">VITE_SUPABASE_URL</code> and <code className="text-fg-soft">VITE_SUPABASE_PUBLISHABLE_KEY</code> in your hosting environment.</li>
              <li>Redeploy, then sign up — the first account becomes the Owner.</li>
            </ol>
            {role === 'owner' && (
              <div className="mt-5 flex flex-wrap gap-2">
                <Button icon={<RotateCcw />} onClick={async () => { if (await confirm({ title: 'Reset demo data?', description: 'All your demo changes in this browser are replaced with fresh sample data.', confirmLabel: 'Reset' })) { demo?.reset(); resetCache(); invalidateAll(); await refreshProfile(); toast.success('Demo data reset') } }}>Reset demo data</Button>
                <Button variant="ghost" icon={<Eraser />} onClick={async () => { if (await confirm({ title: 'Clear demo records?', description: 'Removes sample enquiries, projects, bookings and finance records so you can see empty states. Team, services and settings stay.', confirmLabel: 'Clear' })) { demo?.clearAll(); resetCache(); invalidateAll(); toast.success('Demo records cleared') } }}>Start empty</Button>
              </div>
            )}
          </>
        ) : <p className="mt-3 text-sm text-muted">Data is stored in your Supabase project and protected by Row Level Security.</p>}
      </Card>
      <Card className="p-5 sm:p-6">
        <h2 className="mb-2 font-display text-lg font-semibold">Website integration</h2>
        <p className="text-sm text-muted">Enquiry and booking forms on your website call secure database functions — visitors never get read access to your data. Paste this where the forms should appear:</p>
        <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-black/50 p-3 text-xs text-fg-soft"><code>{snippet}</code></pre>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => { void navigator.clipboard?.writeText(snippet).then(() => toast.success('Copied')) }}>Copy snippet</Button>
          <a href="/site" target="_blank" rel="noopener" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-accent hover:bg-white/5">Preview forms <ExternalLink className="size-3.5" /></a>
        </div>
        <p className="mt-3 text-xs text-muted">Published portfolio items, active services and approved testimonials can be read by the website with the publishable key. See README → Website integration.</p>
      </Card>
    </div>
  )
}
