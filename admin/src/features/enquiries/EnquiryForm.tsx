import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import type { Enquiry } from '@/types/db'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/field'
import { db } from '@/lib/data'
import { mutate } from '@/hooks/useData'
import { useLookups } from '@/hooks/useLookups'
import { ENQUIRY_STATUS, LEAD_SOURCE, enumOptions } from '@/lib/labels'
import { date, dateReq, email, money, opt, phone, req, str, toDate, toMoney, toText } from '@/lib/validation'
import { todayIST } from '@/lib/domain/dates'

const schema = z.object({
  client_name: req('Name', 2, 120),
  business_name: opt(120),
  phone, email,
  service_id: z.string(),
  budget: money,
  lead_source: z.string().min(1),
  enquiry_date: dateReq,
  follow_up_date: date,
  assigned_to: z.string(),
  status: z.string().min(1),
  notes: opt(4000),
}).refine((v) => v.phone.trim() || v.email.trim(), { message: 'Add a phone number or an email', path: ['phone'] })
  .refine((v) => !v.follow_up_date || v.follow_up_date >= v.enquiry_date, { message: 'Follow-up must be on or after the enquiry date', path: ['follow_up_date'] })
type Values = z.infer<typeof schema>

export function EnquiryForm({ open, onClose, enquiry, onSaved }: { open: boolean; onClose: () => void; enquiry?: Enquiry | null; onSaved?: (e: Enquiry) => void }) {
  const { serviceOptions, teamOptions, serviceById } = useLookups()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!open) return
    reset({
      client_name: str(enquiry?.client_name), business_name: str(enquiry?.business_name), phone: str(enquiry?.phone), email: str(enquiry?.email),
      service_id: str(enquiry?.service_id), budget: str(enquiry?.budget), lead_source: enquiry?.lead_source ?? 'phone',
      enquiry_date: enquiry?.enquiry_date ?? todayIST(), follow_up_date: str(enquiry?.follow_up_date), assigned_to: str(enquiry?.assigned_to),
      status: enquiry?.status ?? 'new', notes: str(enquiry?.notes),
    })
  }, [open, enquiry, reset])

  const submit = handleSubmit(async (v) => {
    const payload = {
      client_name: v.client_name.trim(), business_name: toText(v.business_name), phone: toText(v.phone), email: toText(v.email)?.toLowerCase() ?? null,
      service_id: v.service_id || null, service_label: v.service_id ? serviceById.get(v.service_id)?.title ?? null : enquiry?.service_label ?? null,
      budget: toMoney(v.budget), lead_source: v.lead_source as Enquiry['lead_source'], enquiry_date: v.enquiry_date,
      follow_up_date: toDate(v.follow_up_date), assigned_to: v.assigned_to || null, status: v.status as Enquiry['status'], notes: toText(v.notes),
    }
    try {
      const saved = await mutate(() => (enquiry ? db.update('enquiries', enquiry.id, payload) : db.insert('enquiries', payload)), 'enquiries')
      toast.success(enquiry ? 'Enquiry updated' : `Enquiry ${saved.code} added`)
      onSaved?.(saved)
      onClose()
    } catch (e) { toast.error((e as Error).message) }
  })

  return (
    <Dialog open={open} onClose={onClose} size="lg" title={enquiry ? `Edit ${enquiry.code}` : 'New enquiry'} description="Capture a lead from a call, WhatsApp, walk-in or social DM."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={isSubmitting} onClick={submit}>{enquiry ? 'Save changes' : 'Add enquiry'}</Button></>}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input label="Client name" required autoFocus {...register('client_name')} error={errors.client_name?.message} />
        <Input label="Business name" {...register('business_name')} error={errors.business_name?.message} />
        <Input label="Phone" type="tel" inputMode="tel" placeholder="+91 98765 43210" {...register('phone')} error={errors.phone?.message} />
        <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
        <Select label="Service required" options={serviceOptions} placeholder="Not sure yet" {...register('service_id')} />
        <Input label="Budget (₹)" inputMode="decimal" placeholder="25000" {...register('budget')} error={errors.budget?.message} />
        <Select label="Lead source" options={enumOptions(LEAD_SOURCE)} {...register('lead_source')} />
        <Select label="Assigned to" options={teamOptions} placeholder="Unassigned" {...register('assigned_to')} />
        <Input label="Enquiry date" type="date" required {...register('enquiry_date')} error={errors.enquiry_date?.message} />
        <Input label="Follow-up date" type="date" {...register('follow_up_date')} error={errors.follow_up_date?.message} />
        <Select label="Status" options={enumOptions(ENQUIRY_STATUS)} {...register('status')} wrapClassName="sm:col-span-2" />
        <Textarea label="Notes" rows={4} placeholder="What do they need, timelines, references…" {...register('notes')} error={errors.notes?.message} wrapClassName="sm:col-span-2" />
        <button type="submit" hidden />
      </form>
    </Dialog>
  )
}
