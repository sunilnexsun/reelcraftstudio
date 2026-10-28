import type { AppRole, Insert, Row, TableName } from '@/types/db'

export type RpcArgs = {
  set_project_team: { p_project: string; p_members: string[] }
  set_booking_crew: { p_booking: string; p_members: string[] }
  booking_conflicts: { p_start: string; p_end: string; p_crew: string[]; p_equipment: string[]; p_exclude: string | null }
  convert_enquiry: { p_enquiry: string; p_project_name: string; p_budget: number | null; p_start: string | null; p_delivery: string | null }
  submit_enquiry: {
    p_name: string; p_phone: string | null; p_email: string | null; p_business: string | null
    p_service_slug: string | null; p_budget: number | null; p_message: string | null; p_website: string | null
  }
  submit_booking_request: {
    p_name: string; p_phone: string | null; p_email: string | null; p_shoot_type: string | null
    p_preferred_start: string; p_duration_hours: number; p_location: string | null; p_message: string | null; p_website: string | null
  }
  refresh_overdue_invoices: Record<string, never>
}
export type RpcResult = {
  set_project_team: null
  set_booking_crew: null
  booking_conflicts: { booking_id: string; code: string; title: string; start_at: string; end_at: string; reason: string }[]
  convert_enquiry: { client_id: string; project_id: string; already: boolean }
  submit_enquiry: { ok: boolean; duplicate?: boolean }
  submit_booking_request: { ok: boolean; duplicate?: boolean }
  refresh_overdue_invoices: number
}
export type RpcName = keyof RpcArgs

export type Bucket = 'portfolio' | 'branding' | 'avatars' | 'receipts'

export interface DataSource {
  readonly mode: 'demo' | 'live'
  list<T extends TableName>(table: T): Promise<Row<T>[]>
  insert<T extends TableName>(table: T, values: Insert<T>): Promise<Row<T>>
  insertMany<T extends TableName>(table: T, values: Insert<T>[]): Promise<Row<T>[]>
  update<T extends TableName>(table: T, id: string, patch: Insert<T>, key?: string): Promise<Row<T>>
  remove(table: TableName, id: string, key?: string): Promise<void>
  rpc<N extends RpcName>(fn: N, args: RpcArgs[N]): Promise<RpcResult[N]>
  upload(bucket: Bucket, path: string, file: File): Promise<{ path: string; url: string }>
  fileUrl(bucket: Bucket, path: string): Promise<string>
}

export interface Actor { profileId: string; role: AppRole | null; teamMemberId: string | null }

/** An error whose message is safe to show to the user. */
export class DataError extends Error {
  code?: string
  constructor(message: string, code?: string) { super(message); this.code = code; this.name = 'DataError' }
}
