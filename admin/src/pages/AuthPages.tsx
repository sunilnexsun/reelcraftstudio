import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Clock, MailCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { AuthShell } from './LoginPage'

export function ForgotPasswordPage() {
  const { requestPasswordReset, mode } = useAuth()
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ email: string }>({ resolver: zodResolver(z.object({ email: z.string().trim().email('Enter your email') })) })
  if (mode === 'demo') return <AuthShell title="Password reset" subtitle="Not available in demo mode."><Link to="/login" className="text-accent">Back</Link></AuthShell>
  if (sent) return <AuthShell title="Check your email" subtitle="If an account exists for that address, we've sent a link to reset your password."><MailCheck className="mx-auto size-10 text-accent" /><p className="mt-6 text-center text-sm"><Link to="/login" className="text-accent hover:underline">Back to sign in</Link></p></AuthShell>
  return (
    <AuthShell title="Reset password" subtitle="We'll email you a secure link.">
      <form noValidate className="space-y-4" onSubmit={handleSubmit(async (v) => { setErr(null); try { await requestPasswordReset(v.email); setSent(true) } catch (e) { setErr((e as Error).message) } })}>
        <Input label="Email" type="email" autoComplete="email" autoFocus {...register('email')} error={errors.email?.message} />
        {err && <p role="alert" className="text-sm text-red-300">{err}</p>}
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={isSubmitting}>Send reset link</Button>
        <p className="text-center text-sm"><Link to="/login" className="text-muted hover:text-white">Back to sign in</Link></p>
      </form>
    </AuthShell>
  )
}

export const passwordSchema = z.object({
  password: z.string().min(10, 'Use at least 10 characters').max(72).refine((v) => /[a-zA-Z]/.test(v) && /\d/.test(v), 'Include letters and numbers'),
  confirm: z.string(),
}).refine((v) => v.password === v.confirm, { message: "Passwords don't match", path: ['confirm'] })

/** Landing page for the email link (Supabase signs the user in from the URL, then they set a new password). */
export function UpdatePasswordPage() {
  const { updatePassword, status } = useAuth()
  const nav = useNavigate()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof passwordSchema>>({ resolver: zodResolver(passwordSchema) })
  if (status === 'signed_out') return <AuthShell title="Link expired" subtitle="This reset link is invalid or has expired."><Link to="/forgot-password" className="text-accent hover:underline">Request a new link</Link></AuthShell>
  return (
    <AuthShell title="Choose a new password">
      <form noValidate className="space-y-4" onSubmit={handleSubmit(async (v) => { try { await updatePassword(v.password); toast.success('Password updated'); nav('/') } catch (e) { toast.error((e as Error).message) } })}>
        <Input label="New password" type="password" autoComplete="new-password" autoFocus {...register('password')} error={errors.password?.message} />
        <Input label="Confirm password" type="password" autoComplete="new-password" {...register('confirm')} error={errors.confirm?.message} />
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={isSubmitting}>Update password</Button>
      </form>
    </AuthShell>
  )
}

export function PendingApprovalPage() {
  const { signOut, profile, refreshProfile } = useAuth()
  return (
    <AuthShell title="Waiting for approval" subtitle={<>You're signed in as <strong className="text-fg">{profile?.email}</strong>, but an owner hasn't given your account a role yet.</>}>
      <Clock className="mx-auto size-10 text-accent" />
      <p className="mt-4 text-center text-sm text-muted">Ask the studio owner to approve you under Settings → Users. Then refresh.</p>
      <div className="mt-6 flex justify-center gap-2"><Button variant="primary" onClick={() => void refreshProfile()}>Check again</Button><Button variant="ghost" onClick={() => void signOut()}>Sign out</Button></div>
    </AuthShell>
  )
}

export function NotFoundPage() {
  return <AuthShell title="Page not found" subtitle="That page doesn't exist."><Link to="/" className="text-accent hover:underline">Go to dashboard</Link></AuthShell>
}
