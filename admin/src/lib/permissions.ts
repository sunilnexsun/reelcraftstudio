import type { AppRole } from '@/types/db'

export type Module =
  | 'overview' | 'enquiries' | 'projects' | 'portfolio' | 'services' | 'bookings' | 'clients'
  | 'testimonials' | 'team' | 'content' | 'finance' | 'reports' | 'settings'
export type Action = 'view' | 'create' | 'edit' | 'delete'

const ALL: Action[] = ['view', 'create', 'edit', 'delete']
const RW: Action[] = ['view', 'create', 'edit']
const R: Action[] = ['view']

/**
 * Mirrors the Row Level Security policies in supabase/migrations/…_rls.sql.
 * The UI uses this to hide what a role can't do; the database is what actually enforces it.
 */
const MATRIX: Record<AppRole, Partial<Record<Module, Action[]>>> = {
  owner: {
    overview: R, enquiries: ALL, projects: ALL, portfolio: ALL, services: ALL, bookings: ALL, clients: ALL,
    testimonials: ALL, team: ALL, content: ALL, finance: ALL, reports: R, settings: ALL,
  },
  manager: {
    overview: R, enquiries: ALL, projects: ALL, portfolio: ALL, services: ALL, bookings: ALL, clients: RW,
    testimonials: ALL, team: ALL, content: ALL, finance: R, reports: R, settings: R,
  },
  accounts: {
    overview: R, enquiries: R, projects: R, bookings: R, clients: RW, team: R, finance: ALL, reports: R, settings: R,
  },
  editor: {
    overview: R, projects: ['view', 'edit'], portfolio: ALL, bookings: R, clients: R, testimonials: ALL, team: R, content: ALL, settings: R,
  },
  videographer: {
    overview: R, projects: ['view', 'edit'], bookings: R, clients: R, team: R, content: R, portfolio: R, settings: R,
  },
}

export function can(role: AppRole | null | undefined, module: Module, action: Action = 'view'): boolean {
  if (!role) return false
  return MATRIX[role][module]?.includes(action) ?? false
}

/** Budgets, advances and dues live in project_financials, readable by these roles only. */
export const canSeeFinancials = (role: AppRole | null | undefined) => role === 'owner' || role === 'manager' || role === 'accounts'
export const canEditFinancials = canSeeFinancials
export const canRecordPayments = (role: AppRole | null | undefined) => role === 'owner' || role === 'accounts'
export const canManageUsers = (role: AppRole | null | undefined) => role === 'owner'
