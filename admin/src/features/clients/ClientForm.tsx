import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import type { Client } from '@/types/db'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/field'
import { db } from '@/lib/data'
import { mutate } from '@/hooks/useData'
import { CLIENT_TYPE, enumOptions } from '@/lib/labels'
import { email, opt, phone, req, str, toText } from '@/lib/validation'

const schema = z.object({
  name: req('Contact name', 2, 120), business_name: opt(120), email, phone, whatsapp: phone, client_type: z.string(),
  city: opt(80), address: opt(300), gstin: z.string().trim().refine((v) => v === '' || /^[0-9A-Z]{15}$/i.test(v), 'GSTIN is 15 letters/digits'), notes: opt(4000),
})
type Values = z.infer<typeof schema>

export function ClientForm({ open, onClose, client, onSaved }: { open: boolean; onClose: () => void; client?: Client | null; onSaved?: (c: Client) => void }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) })
  useEffect(() => {
    if (open) reset({
      name: str(client?.name), business_name: str(client?.business_name), email: str(client?.email), phone: str(client?.phone), whatsapp: str(client?.whatsapp),
      client_type: client?.client_type ?? 'business', city: str(client?.city), address: str(client?.address), gstin: str(client?.gstin), notes: str(client?.notes),
    })
  }, [open, client, reset])

  const submit = handleSubmit(async (v) => {
    const payload = {
      name: v.name.trim(), business_name: toText(v.business_name), email: toText(v.email)?.toLowerCase() ?? null, phone: toText(v.phone),
      whatsapp: toText(v.whatsapp) ?? toText(v.phone), client_type: v.client_type as Client['client_type'], city: toText(v.city),
      address: toText(v.address), gstin: toText(v.gstin)?.toUpperCase() ?? null, notes: toText(v.notes),
    }
    try {
      const saved = await mutate(() => (client ? db.update('clients', client.id, payload) : db.insert('clients', payload)), 'clients')
      toast.success(client ? 'Client updated' : 'Client added')
      onSaved?.(saved)
      onClose()
    } catch (e) { toast.error((e as Error).message) }
  })

  return (
    <Dialog open={open} onClose={onClose} size="lg" title={client ? 'Edit client' : 'New client'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={isSubmitting} onClick={submit}>{client ? 'Save changes' : 'Add client'}</Button></>}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input label="Contact name" required autoFocus {...register('name')} error={errors.name?.message} />
        <Input label="Business name" {...register('business_name')} error={errors.business_name?.message} />
        <Input label="Phone" type="tel" {...register('phone')} error={errors.phone?.message} />
        <Input label="WhatsApp" type="tel" help="Leave empty to use the phone number" {...register('whatsapp')} error={errors.whatsapp?.message} />
        <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
        <Select label="Client type" options={enumOptions(CLIENT_TYPE)} {...register('client_type')} />
        <Input label="City" {...register('city')} />
        <Input label="GSTIN" placeholder="33ABCDE1234F1Z5" {...register('gstin')} error={errors.gstin?.message} />
        <Textarea label="Billing address" rows={2} {...register('address')} wrapClassName="sm:col-span-2" />
        <Textarea label="Notes" rows={3} placeholder="Preferences, decision makers, past feedback…" {...register('notes')} wrapClassName="sm:col-span-2" />
        <button type="submit" hidden />
      </form>
    </Dialog>
  )
}
