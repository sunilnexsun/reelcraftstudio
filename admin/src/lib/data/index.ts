import type { TableName } from '@/types/db'
import { DemoSource } from './demo'
import { SupabaseSource, supabaseConfigured } from './supabase'
import type { DataSource } from './types'

export type { DataSource } from './types'
export { DataError } from './types'

/**
 * VITE_DATA_MODE=demo forces sample data; VITE_DATA_MODE=live forces Supabase.
 * Unset: live when VITE_SUPABASE_URL + key are present, otherwise demo.
 */
const requested = (import.meta.env.VITE_DATA_MODE as string | undefined)?.toLowerCase()
export const DATA_MODE: 'demo' | 'live' = requested === 'demo' ? 'demo' : requested === 'live' ? 'live' : supabaseConfigured ? 'live' : 'demo'
export const liveMisconfigured = DATA_MODE === 'live' && !supabaseConfigured

export const demo = DATA_MODE === 'demo' ? new DemoSource() : null
export const db: DataSource = demo ?? new SupabaseSource()

/** Tables whose rows the database changes as a side effect of writing another table. */
export const SIDE_EFFECTS: Partial<Record<TableName, TableName[]>> = {
  payments: ['invoices', 'project_financials', 'activity_logs'],
  invoice_items: ['invoices'],
  invoices: ['invoice_items', 'payments', 'activity_logs', 'studio_settings'],
  projects: ['project_financials', 'project_team_members', 'project_tasks', 'activity_logs', 'enquiries', 'bookings'],
  enquiries: ['enquiry_followups', 'activity_logs'],
  clients: ['activity_logs', 'enquiries', 'projects', 'bookings'],
  bookings: ['booking_crew', 'activity_logs'],
  expenses: ['activity_logs'],
  portfolio_items: ['activity_logs'],
  team_members: ['project_team_members', 'booking_crew'],
}
