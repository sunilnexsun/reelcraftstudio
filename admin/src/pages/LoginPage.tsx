import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, Briefcase, Camera, Clapperboard, FlaskConical, Pencil, ReceiptIndianRupee, ShieldCheck } from 'lucide-react'
import type { AppRole } from '@/types/db'
import { useAuth } from '@/lib/auth'
import { liveMisconfigured } from '@/lib/data'
import { ROLE_LABEL } from '@/lib/labels'
import { Logo } from '@/components/layout/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'

const schema = z.object({ email: z.string().trim().email('Enter your email'), password: z.string().min(1, 'Enter your password') })

export function AuthShell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: React.ReactNode }) {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgb(255_23_68/0.28),transparent_70%),radial-gradient(40%_40%_at_100%_100%,rgb(255_23_68/0.12),transparent_70%)]" aria-hidden />
      <main className="relative w-full max-w-md">
        <Logo className="mb-8 justify-center" />
        <div className="card p-6 sm:p-8">
          <h1 className="font-display text-2xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  )
}

const DEMO_ROLES: { role: AppRole; icon: typeof ShieldCheck; blurb: string }[] = [
  { role: 'owner', icon: ShieldCheck, blurb: 'Everything, including settings & users' },
  { role: 'manager', icon: Briefcase, blurb: 'Leads, projects, bookings; reads finance' },
  { role: 'editor', icon: Pencil, blurb: 'Assigned projects, portfolio, content' },
  { role: 'videographer', icon: Camera, blurb: 'Shoot schedule, assigned projects' },
  { role: 'accounts', icon: ReceiptIndianRupee, blurb: 'Invoices, payments, expenses' },
]

export default function LoginPage() {
  const { status, mode, signIn, signInDemo } = useAuth()
  const loc = useLocation()
  const [err, setErr] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })
  const from = (loc.state as { from?: string } | null)?.from ?? '/'
  if (status === 'ready') return <Navigate to={from} replace />

  if (mode === 'demo') {
    return (
      <AuthShell title="Explore the demo" subtitle={<>Pick a role to see what each team member can access. <span className="text-amber-200">All data is sample data stored in this browser.</span></>}>
        <ul className="space-y-2">
          {DEMO_ROLES.map((r) => (
            <li key={r.role}>
              <button type="button" onClick={() => signInDemo(r.role)} className="group flex w-full items-center gap-3 rounded-xl border border-line-strong bg-white/[0.02] px-4 py-3 text-left transition-colors hover:border-accent/60 hover:bg-accent/[0.06]">
                <span className="grid size-9 place-items-center rounded-lg bg-accent-soft text-accent"><r.icon className="size-5" /></span>
                <span className="min-w-0 flex-1"><span className="block font-semibold">{ROLE_LABEL[r.role]}</span><span className="block text-xs text-muted">{r.blurb}</span></span>
                <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-5 flex items-start gap-2 text-xs text-muted"><FlaskConical className="mt-0.5 size-3.5 shrink-0" />To use real data, set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY and redeploy. See README.</p>
        <p className="mt-3 text-center text-xs"><Link to="/site" className="text-accent hover:underline">Preview the public website forms →</Link></p>
      </AuthShell>
    )
  }

  if (liveMisconfigured) {
    return <AuthShell title="Supabase isn't configured" subtitle="VITE_DATA_MODE is set to live, but VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY is missing. Add them to your environment and redeploy."><Clapperboard className="mx-auto size-10 text-accent" /></AuthShell>
  }

  const submit = handleSubmit(async (v) => {
    setErr(null)
    try { await signIn(v.email, v.password) } catch (e) { setErr((e as Error).message) }
  })

  return (
    <AuthShell title="Sign in" subtitle="ReelCraft Studio admin">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input label="Email" type="email" autoComplete="email" autoFocus {...register('email')} error={errors.email?.message} />
        <Input label="Password" type="password" autoComplete="current-password" {...register('password')} error={errors.password?.message} />
        {err && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{err}</p>}
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={isSubmitting}>Sign in</Button>
        <p className="text-center text-sm"><Link to="/forgot-password" className="text-muted hover:text-white">Forgot password?</Link></p>
      </form>
    </AuthShell>
  )
}
