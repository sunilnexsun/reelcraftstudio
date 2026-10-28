import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Paperclip } from 'lucide-react'
import type { Expense } from '@/types/db'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/field'
import { db } from '@/lib/data'
import { mutate } from '@/hooks/useData'
import { useLookups } from '@/hooks/useLookups'
import { EXPENSE_CATEGORIES, PAYMENT_METHOD, enumOptions } from '@/lib/labels'
import { todayIST } from '@/lib/domain/dates'
import { dateReq, moneyReq, opt, req, str, toMoney, toText } from '@/lib/validation'

const schema = z.object({ category: req('Category', 2, 60), description: req('Description', 2, 500), amount: moneyReq, spent_on: dateReq, vendor: opt(120), project_id: z.string(), payment_method: z.string() })
type Values = z.infer<typeof schema>
const MAX_RECEIPT = 10 * 1024 * 1024

export function ExpenseForm({ open, onClose, expense }: { open: boolean; onClose: () => void; expense?: Expense | null }) {
  const { projectOptions } = useLookups()
  const [file, setFile] = useState<File | null>(null)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) })
  useEffect(() => {
    if (open) { reset({ category: expense?.category ?? 'Equipment', description: str(expense?.description), amount: str(expense?.amount), spent_on: expense?.spent_on ?? todayIST(), vendor: str(expense?.vendor), project_id: str(expense?.project_id), payment_method: expense?.payment_method ?? 'upi' }); setFile(null) }
  }, [open, expense, reset])

  const submit = handleSubmit(async (v) => {
    try {
      let receipt_path = expense?.receipt_path ?? null
      if (file) {
        if (file.size > MAX_RECEIPT) { toast.error('Receipts must be under 10 MB'); return }
        const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'pdf'
        receipt_path = (await db.upload('receipts', `${v.spent_on.slice(0, 7)}/${crypto.randomUUID()}.${ext}`, file)).path
      }
      const payload = { category: v.category.trim(), description: v.description.trim(), amount: toMoney(v.amount)!, spent_on: v.spent_on, vendor: toText(v.vendor), project_id: v.project_id || null, payment_method: v.payment_method as Expense['payment_method'], receipt_path }
      await mutate(() => (expense ? db.update('expenses', expense.id, payload) : db.insert('expenses', payload)), 'expenses')
      toast.success(expense ? 'Expense updated' : 'Expense recorded')
      onClose()
    } catch (e) { toast.error((e as Error).message) }
  })

  return (
    <Dialog open={open} onClose={onClose} title={expense ? 'Edit expense' : 'Record expense'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={isSubmitting} onClick={submit}>Save expense</Button></>}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input label="Description" required autoFocus {...register('description')} error={errors.description?.message} wrapClassName="sm:col-span-2" placeholder="Cine lens rental (2 days)" />
        <Input label="Amount (₹)" required inputMode="decimal" {...register('amount')} error={errors.amount?.message} />
        <Input label="Date" type="date" required max={todayIST()} {...register('spent_on')} error={errors.spent_on?.message} />
        <Input label="Category" list="expense-cats" required {...register('category')} error={errors.category?.message} />
        <datalist id="expense-cats">{EXPENSE_CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
        <Select label="Paid via" options={enumOptions(PAYMENT_METHOD)} {...register('payment_method')} />
        <Input label="Vendor" {...register('vendor')} />
        <Select label="Project (optional)" options={projectOptions} placeholder="General overhead" {...register('project_id')} />
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-line-strong px-3 py-3 text-sm text-fg-soft hover:border-white/30 sm:col-span-2">
          <Paperclip className="size-4 text-accent" />
          <span className="min-w-0 flex-1 truncate">{file ? file.name : expense?.receipt_path ? 'Receipt attached — choose a file to replace' : 'Attach receipt (image or PDF, max 10 MB)'}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <button type="submit" hidden />
      </form>
    </Dialog>
  )
}
