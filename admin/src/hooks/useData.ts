import { useCallback, useEffect, useSyncExternalStore } from 'react'
import type { Row, TableName } from '@/types/db'
import { db, SIDE_EFFECTS } from '@/lib/data'
import { friendlyError } from '@/lib/data/errors'
import type { DataError } from '@/lib/data/types'

type Entry = { data?: unknown[]; error?: DataError; loading: boolean; promise?: Promise<void>; stale: boolean; version: number }
const entries = new Map<TableName, Entry>()
const subs = new Map<TableName, Set<() => void>>()

function entry(t: TableName): Entry {
  let e = entries.get(t)
  if (!e) { e = { loading: false, stale: true, version: 0 }; entries.set(t, e) }
  return e
}
function emit(t: TableName) { subs.get(t)?.forEach((fn) => fn()) }

function load(t: TableName): Promise<void> {
  const e = entry(t)
  if (e.promise) return e.promise
  e.loading = true
  e.version++
  emit(t)
  e.promise = db.list(t)
    .then((rows) => { e.data = rows; e.error = undefined })
    .catch((err) => { e.error = friendlyError(err) })
    .finally(() => { e.loading = false; e.stale = false; e.promise = undefined; e.version++; emit(t) })
  return e.promise
}

/** Mark tables (and the tables the database updates alongside them) stale and refetch any in use. */
export function invalidate(...tables: TableName[]) {
  const all = new Set<TableName>()
  for (const t of tables) { all.add(t); SIDE_EFFECTS[t]?.forEach((x) => all.add(x)) }
  all.add('notifications')
  for (const t of all) {
    const e = entry(t)
    e.stale = true
    if (subs.get(t)?.size) void load(t)
  }
}
export function invalidateAll() { invalidate(...([...entries.keys()] as TableName[])) }

export interface TableState<T> { data: T[]; loading: boolean; error: DataError | undefined; ready: boolean; refetch: () => Promise<void> }

/** Subscribe to every row of a table the current user may read. Cached and shared across components. */
export function useTable<T extends TableName>(t: T, enabled = true): TableState<Row<T>> {
  const subscribe = useCallback((fn: () => void) => {
    let set = subs.get(t)
    if (!set) { set = new Set(); subs.set(t, set) }
    set.add(fn)
    return () => { set!.delete(fn) }
  }, [t])
  const version = useSyncExternalStore(subscribe, () => entry(t).version)
  useEffect(() => { if (enabled && entry(t).stale && !entry(t).promise) void load(t) }, [t, enabled, version])
  const e = entry(t)
  void version
  return {
    data: (e.data as Row<T>[] | undefined) ?? EMPTY,
    loading: enabled && (e.loading || (e.stale && !e.data)),
    error: e.error,
    ready: !!e.data,
    refetch: () => load(t),
  }
}
const EMPTY: never[] = []

/** Run a write, then refresh the affected tables. Errors come back as user-safe messages. */
export async function mutate<R>(fn: () => Promise<R>, ...tables: TableName[]): Promise<R> {
  try {
    return await fn()
  } catch (e) {
    throw friendlyError(e)
  } finally {
    invalidate(...tables)
  }
}

/** Refresh visible data when the tab regains focus (live mode keeps multiple staff in sync). */
export function useRefreshOnFocus() {
  useEffect(() => {
    let last = Date.now()
    const onFocus = () => { if (Date.now() - last > 30_000) { last = Date.now(); invalidateAll() } }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])
}

export function resetCache() { entries.clear(); for (const t of subs.keys()) emit(t) }
