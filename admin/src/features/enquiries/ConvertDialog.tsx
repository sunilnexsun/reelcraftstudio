import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { ArrowRightLeft } from 'lucide-react'
import type { Enquiry } from '@/types/db'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { db } from '@/lib/data'
import { mutate } from '@/hooks/useData'
import { date, money, req, str, toDate, toMoney } from '@/lib/validation'

const schema = z.object({ name: req('Project name', 2, 160), budget: money, start: date, delivery: date })
  .refine((v) => !v.start || !v.delivery || v.delivery >= v.start, { message: 'Delivery must be after start', path: ['delivery'] })
type Values = z.infer<typeof schema>

/** Lead → client (matched by email/phone, or created) + project in Planning, in one database transaction. */
export function ConvertDialog({ enquiry, onClose }: { enquiry: Enquiry | null; onClose: () => void }) {
  const nav = useNavigate()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) })
  useEffect(() => {
    if (enquiry) reset({ name: `${enquiry.business_name ?? enquiry.client_name} — ${enquiry.service_label ?? 'Project'}`, budget: str(enquiry.budget), start: '', delivery: '' })
  }, [enquiry, reset])

  const submit = handleSubmit(async (v) => {
    if (!enquiry) return
    try {
      const res = await mutate(() => db.rpc('convert_enquiry', { p_enquiry: enquiry.id, p_project_name: v.name, p_budget: toMoney(v.budget), p_start: toDate(v.start), p_delivery: toDate(v.delivery) }),
        'enquiries', 'clients', 'projects', 'project_financials')
      toast.success(res.already ? 'This enquiry was already converted' : 'Converted — client and project created')
      onClose()
      nav(`/projects/${res.project_id}`)
    } catch (e) { toast.error((e as Error).message) }
  })

  return (
    <Dialog open={!!enquiry} onClose={onClose} title={<span className="flex items-center gap-2"><ArrowRightLeft className="size-5 text-accent" />Convert to client & project</span>}
      description="We'll reuse an existing client with the same email or phone, otherwise create one. The enquiry is marked Converted."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={isSubmitting} onClick={submit}>Convert</Button></>}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input label="Project name" required {...register('name')} error={errors.name?.message} wrapClassName="sm:col-span-2" />
        <Input label="Agreed budget (₹)" inputMode="decimal" {...register('budget')} error={errors.budget?.message} help="Visible to owner, manager and accounts only" wrapClassName="sm:col-span-2" />
        <Input label="Start date" type="date" {...register('start')} error={errors.start?.message} />
        <Input label="Delivery date" type="date" {...register('delivery')} error={errors.delivery?.message} />
        <button type="submit" hidden />
      </form>
    </Dialog>
  )
}
