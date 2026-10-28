import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Insert, Row, TableName } from '@/types/db'
import { friendlyError } from './errors'
import type { Bucket, DataSource, RpcArgs, RpcName, RpcResult } from './types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined

export const supabaseConfigured = Boolean(url && key)

let client: SupabaseClient | null = null
export function getSupabase(): SupabaseClient {
  if (!client) {
    if (!url || !key) throw new Error('Supabase is not configured')
    client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  }
  return client
}

const PAGE = 1000

/** Live data source: every call goes through the publishable key + the user's session, so RLS applies. */
export class SupabaseSource implements DataSource {
  readonly mode = 'live' as const
  private get sb() { return getSupabase() }

  async list<T extends TableName>(table: T): Promise<Row<T>[]> {
    const out: Row<T>[] = []
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await this.sb.from(table).select('*').range(from, from + PAGE - 1)
      if (error) throw friendlyError(error)
      out.push(...(data as Row<T>[]))
      if (!data || data.length < PAGE) break
    }
    return out
  }
  async insert<T extends TableName>(table: T, values: Insert<T>): Promise<Row<T>> {
    const { data, error } = await this.sb.from(table).insert(values as never).select('*').single()
    if (error) throw friendlyError(error)
    return data as Row<T>
  }
  async insertMany<T extends TableName>(table: T, values: Insert<T>[]): Promise<Row<T>[]> {
    if (!values.length) return []
    const { data, error } = await this.sb.from(table).insert(values as never).select('*')
    if (error) throw friendlyError(error)
    return data as Row<T>[]
  }
  async update<T extends TableName>(table: T, id: string, patch: Insert<T>, key = 'id'): Promise<Row<T>> {
    const { data, error } = await this.sb.from(table).update(patch as never).eq(key, id).select('*').maybeSingle()
    if (error) throw friendlyError(error)
    if (!data) throw friendlyError({ code: '42501', message: 'row-level security' })
    return data as Row<T>
  }
  async remove(table: TableName, id: string, key = 'id'): Promise<void> {
    const { data, error } = await this.sb.from(table).delete().eq(key, id).select(key)
    if (error) throw friendlyError(error)
    if (!data?.length) throw friendlyError({ code: '42501', message: 'row-level security' })
  }
  async rpc<N extends RpcName>(fn: N, args: RpcArgs[N]): Promise<RpcResult[N]> {
    const { data, error } = await this.sb.rpc(fn, args)
    if (error) throw friendlyError(error)
    return data as RpcResult[N]
  }
  async upload(bucket: Bucket, path: string, file: File) {
    const { error } = await this.sb.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type, cacheControl: '3600' })
    if (error) throw friendlyError(error)
    return { path, url: await this.fileUrl(bucket, path) }
  }
  async fileUrl(bucket: Bucket, path: string) {
    if (bucket === 'receipts') {
      const { data, error } = await this.sb.storage.from(bucket).createSignedUrl(path, 300)
      if (error) throw friendlyError(error)
      return data.signedUrl
    }
    return this.sb.storage.from(bucket).getPublicUrl(path).data.publicUrl
  }
}
