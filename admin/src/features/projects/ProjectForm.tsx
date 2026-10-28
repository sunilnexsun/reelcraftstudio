import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import type { Project } from '@/types/db'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/field'
import { MemberPicker } from '@/components/forms/MemberPicker'
import { db } from '@/lib/data'
import { mutate, useTable } from '@/hooks/useData'
import { useLookups } from '@/hooks/useLookups'
import { useAuth } from '@/lib/auth'
import { can, canEditFinancials } from '@/lib/permissions'
import { APPROVAL, PRIORITY, PROJECT_STATUS, enumOptions } from '@/lib/labels'
import { date, money, opt, req, str, toDate, toMoney, toText } from '@/lib/validation'

const schema = z.object({
  name: req('Project name', 2, 160), client_id: z.string(), service_id: z.string(), description: opt(4000),
  start_date: date, delivery_date: date, priority: z.string(), status: z.string(), approval_status: z.string(),
  budget: money, internal_notes: opt(4000),
}).refine((v) => !v.start_date || !v.delivery_date || v.delivery_date >= v.start_date, { message: 'Delivery must be on or after the start date', path: ['delivery_date'] })
type Values = z.infer<typeof schema>

export const DEFAULT_DELIVERABLES = ['Creative brief & moodboard', 'Script / shot list approved', 'Shoot completed', 'First cut delivered', 'Final masters exported']

export function ProjectForm({ open, onClose, project, onSaved, defaults }: {
  open: boolean; onClose: () => void; project?: Project | null; onSaved?: (p: Project) => void; defaults?: Partial<Pick<Project, 'client_id'>>
}) {
  const { role } = useAuth()
  const { clientOptions, serviceOptions, team, serviceById, finByProject } = useLookups()
  const ptm = useTable('project_team_members', open)
  const [members, setMembers] = useState<string[]>([])
  const membersHydrated = useRef(false)
  const fin = canEditFinancials(role)
  const isOps = can(role, 'projects', 'create')
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!open) return
    reset({
      name: str(project?.name), client_id: str(project?.client_id ?? defaults?.client_id), service_id: str(project?.service_id), description: str(project?.description),
      start_date: str(project?.start_date), delivery_date: str(project?.delivery_date), priority: project?.priority ?? 'medium', status: project?.status ?? 'planning',
      approval_status: project?.approval_status ?? 'pending', budget: project ? str(finByProject.get(project.id)?.budget || '') : '', internal_notes: str(project?.internal_notes),
    })
    setMembers([])
    membersHydrated.current = !project
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project?.id, reset])

  useEffect(() => {
    if (!open || !project || membersHydrated.current || !ptm.ready) return
    setMembers(ptm.data.filter((m) => m.project_id === project.id).map((m) => m.team_member_id))
    membersHydrated.current = true
  }, [open, project, ptm.ready, ptm.data])

  const submit = handleSubmit(async (v) => {
    const payload = {
      name: v.name.trim(), client_id: v.client_id || null, service_id: v.service_id || null,
      service_label: v.service_id ? serviceById.get(v.service_id)?.title ?? null : project?.service_label ?? null,
      description: toText(v.description), start_date: toDate(v.start_date), delivery_date: toDate(v.delivery_date),
      priority: v.priority as Project['priority'], status: v.status as Project['status'], approval_status: v.approval_status as Project['approval_status'],
      internal_notes: toText(v.internal_notes),
    }
    try {
      const saved = await mutate(async () => {
        const p = project ? await db.update('projects', project.id, payload) : await db.insert('projects', payload)
        if (fin) {
          const budget = toMoney(v.budget) ?? 0
          if (!project || budget !== (finByProject.get(p.id)?.budget ?? 0)) await db.update('project_financials', p.id, { budget }, 'project_id')
        }
        if (isOps) await db.rpc('set_project_team', { p_project: p.id, p_members: members })
        if (!project) await db.insertMany('project_tasks', DEFAULT_DELIVERABLES.map((title, i) => ({ project_id: p.id, title, kind: 'deliverable' as const, sort_order: i })))
        return p
      }, 'projects', 'project_financials', 'project_team_members', 'project_tasks')
      toast.success(project ? 'Project updated' : `Project ${saved.code} created`)
      onSaved?.(saved)
      onClose()
    } catch (e) { toast.error((e as Error).message) }
  })

  return (
    <Dialog open={open} onClose={onClose} size="lg" title={project ? `Edit ${project.code}` : 'Create project'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={isSubmitting} onClick={submit}>{project ? 'Save changes' : 'Create project'}</Button></>}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input label="Project name" required autoFocus {...register('name')} error={errors.name?.message} wrapClassName="sm:col-span-2" placeholder="FitZone Gym — Promo Shoot" />
        <Select label="Client" options={clientOptions} placeholder="Select client" {...register('client_id')} />
        <Select label="Service type" options={serviceOptions} placeholder="Select service" {...register('service_id')} />
        <Input label="Start date" type="date" {...register('start_date')} error={errors.start_date?.message} />
        <Input label="Delivery date" type="date" {...register('delivery_date')} error={errors.delivery_date?.message} />
        <Select label="Status" options={enumOptions(PROJECT_STATUS)} {...register('status')} />
        <Select label="Priority" options={enumOptions(PRIORITY)} {...register('priority')} />
        <Select label="Client approval" options={enumOptions(APPROVAL)} {...register('approval_status')} />
        {fin ? <Input label="Budget (₹)" inputMode="decimal" {...register('budget')} error={errors.budget?.message} help="Advance and amount due are calculated from recorded payments" /> : <div />}
        <Textarea label="Description / deliverables" rows={3} {...register('description')} wrapClassName="sm:col-span-2" />
        {isOps && <div className="sm:col-span-2"><MemberPicker team={team} value={members} onChange={setMembers} label="Assigned team" /></div>}
        <Textarea label="Internal notes" rows={2} help="Only visible to staff" {...register('internal_notes')} wrapClassName="sm:col-span-2" />
        <button type="submit" hidden />
      </form>
    </Dialog>
  )
}
