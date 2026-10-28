import { useMemo } from 'react'
import { useTable } from './useData'
import { useAuth } from '@/lib/auth'
import { can, canSeeFinancials } from '@/lib/permissions'

/** Id → record maps for the tables most screens join against. */
export function useLookups() {
  const { role } = useAuth()
  const team = useTable('team_members')
  const clients = useTable('clients', can(role, 'clients'))
  const services = useTable('services')
  const projects = useTable('projects', can(role, 'projects'))
  const fin = useTable('project_financials', canSeeFinancials(role))
  return useMemo(() => {
    const teamById = new Map(team.data.map((t) => [t.id, t]))
    const clientById = new Map(clients.data.map((c) => [c.id, c]))
    const serviceById = new Map(services.data.map((s) => [s.id, s]))
    const projectById = new Map(projects.data.map((p) => [p.id, p]))
    const finByProject = new Map(fin.data.map((f) => [f.project_id, f]))
    return {
      team: team.data, clients: clients.data, services: services.data, projects: projects.data,
      teamById, clientById, serviceById, projectById, finByProject,
      clientName: (id: string | null | undefined) => (id ? (clientById.get(id)?.business_name ?? clientById.get(id)?.name ?? 'Unknown client') : '—'),
      memberName: (id: string | null | undefined) => (id ? (teamById.get(id)?.full_name ?? 'Unknown') : 'Unassigned'),
      teamOptions: team.data.filter((t) => t.is_active).map((t) => ({ value: t.id, label: t.full_name })),
      clientOptions: [...clients.data].sort((a, b) => (a.business_name ?? a.name).localeCompare(b.business_name ?? b.name)).map((c) => ({ value: c.id, label: c.business_name ? `${c.business_name} (${c.name})` : c.name })),
      serviceOptions: services.data.filter((s) => s.is_active).sort((a, b) => a.sort_order - b.sort_order).map((s) => ({ value: s.id, label: s.title })),
      projectOptions: [...projects.data].sort((a, b) => b.created_at.localeCompare(a.created_at)).map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` })),
      loading: team.loading || services.loading,
    }
  }, [team.data, clients.data, services.data, projects.data, fin.data, team.loading, services.loading])
}
