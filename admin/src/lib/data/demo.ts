/**
 * Demo data source — runs entirely in the browser (localStorage) so the admin panel can be
 * explored before Supabase is connected. It reproduces the database's triggers and RLS rules
 * (codes, invoice totals, payment guards, booking conflicts, cascades, activity log, role access)
 * using the same domain functions the UI uses. Every record it holds is sample data.
 */
import type { AppRole, Insert, Row, TableName, Tables, Invoice, Booking } from '@/types/db'
import { assertPaymentFits, computeInvoiceTotals, deriveInvoiceStatus } from '@/lib/domain/invoice'
import { findConflicts } from '@/lib/domain/bookings'
import { round2 } from '@/lib/domain/money'
import { todayIST, fmtDateTime } from '@/lib/domain/dates'
import { buildSeed } from './seed'
import { DataError, type Actor, type Bucket, type DataSource, type RpcArgs, type RpcName, type RpcResult } from './types'

const STORAGE_KEY = 'reelcraft-demo-v1'
type Store = { [K in TableName]: Row<K>[] } & { _seq: Record<string, number> }
type AnyRow = Record<string, unknown> & { id?: string }

const uuid = () => crypto.randomUUID()
const now = () => new Date().toISOString()

// ───────── column defaults (mirror the SQL defaults) ─────────
const DEFAULTS: { [K in TableName]?: () => Partial<Row<K>> } = {
  team_members: () => ({ profile_id: null, email: null, phone: null, role: 'editor', designation: null, skills: [], availability: 'available', avatar_url: null, is_active: true }),
  services: () => ({ description: null, thumbnail_url: null, pricing_model: 'starting_from', starting_price: null, delivery_estimate: null, is_active: true, sort_order: 0 }),
  clients: () => ({ business_name: null, email: null, phone: null, whatsapp: null, client_type: 'business', address: null, city: null, gstin: null, notes: null }),
  enquiries: () => ({ business_name: null, phone: null, email: null, service_id: null, service_label: null, budget: null, lead_source: 'website', enquiry_date: todayIST(), follow_up_date: null, assigned_to: null, notes: null, status: 'new', client_id: null, project_id: null, submitted_via: 'admin', submission_fingerprint: null }),
  enquiry_followups: () => ({ channel: 'call', next_follow_up: null, created_by: null }),
  projects: () => ({ client_id: null, service_id: null, service_label: null, description: null, start_date: null, delivery_date: null, priority: 'medium', status: 'enquiry_received', approval_status: 'pending', revision_count: 0, internal_notes: null, enquiry_id: null }),
  project_tasks: () => ({ kind: 'deliverable', is_done: false, due_date: null, assigned_to: null, sort_order: 0 }),
  bookings: () => ({ client_id: null, project_id: null, contact_name: null, contact_phone: null, contact_email: null, shoot_type: null, location: null, equipment: [], status: 'requested', advance_status: 'pending', internal_notes: null, submitted_via: 'admin', submission_fingerprint: null }),
  portfolio_items: () => ({ description: null, category: 'Brand Film', client_name: null, service_id: null, duration_seconds: null, video_url: null, video_provider: null, thumbnail_url: null, media_url: null, is_featured: false, is_published: false, sort_order: 0 }),
  testimonials: () => ({ company: null, avatar_url: null, rating: 5, status: 'pending', is_featured: false, sort_order: 0, client_id: null }),
  content_calendar: () => ({ platform: 'instagram', format: 'reel', caption: null, hashtags: [], scheduled_at: null, assigned_to: null, status: 'idea', project_id: null, client_id: null }),
  invoices: () => ({ project_id: null, issue_date: todayIST(), due_date: null, status: 'draft', discount_type: 'flat', discount_value: 0, tax_label: 'GST', tax_rate: 18, notes: null, terms: null }),
  invoice_items: () => ({ quantity: 1, unit_price: 0, sort_order: 0 }),
  payments: () => ({ client_id: null, invoice_id: null, project_id: null, paid_on: todayIST(), method: 'upi', reference: null, is_advance: false, notes: null }),
  expenses: () => ({ category: 'Equipment', spent_on: todayIST(), vendor: null, project_id: null, payment_method: 'upi', receipt_path: null }),
  notifications: () => ({ recipient_id: null, body: null, kind: 'info', link: null, read_at: null }),
}
const CODES: Partial<Record<TableName, [string, string]>> = { enquiries: ['code', 'ENQ-'], projects: ['code', 'PRJ-'], bookings: ['code', 'BK-'] }

// ───────── foreign keys (what happens to children when a parent is deleted) ─────────
type FK = { table: TableName; column: string; ref: TableName; onDelete: 'cascade' | 'set null' | 'restrict' }
const FKS: FK[] = [
  { table: 'team_members', column: 'profile_id', ref: 'profiles', onDelete: 'set null' },
  { table: 'enquiries', column: 'service_id', ref: 'services', onDelete: 'set null' },
  { table: 'enquiries', column: 'assigned_to', ref: 'team_members', onDelete: 'set null' },
  { table: 'enquiries', column: 'client_id', ref: 'clients', onDelete: 'set null' },
  { table: 'enquiries', column: 'project_id', ref: 'projects', onDelete: 'set null' },
  { table: 'enquiry_followups', column: 'enquiry_id', ref: 'enquiries', onDelete: 'cascade' },
  { table: 'projects', column: 'client_id', ref: 'clients', onDelete: 'set null' },
  { table: 'projects', column: 'service_id', ref: 'services', onDelete: 'set null' },
  { table: 'projects', column: 'enquiry_id', ref: 'enquiries', onDelete: 'set null' },
  { table: 'project_financials', column: 'project_id', ref: 'projects', onDelete: 'cascade' },
  { table: 'project_team_members', column: 'project_id', ref: 'projects', onDelete: 'cascade' },
  { table: 'project_team_members', column: 'team_member_id', ref: 'team_members', onDelete: 'cascade' },
  { table: 'project_tasks', column: 'project_id', ref: 'projects', onDelete: 'cascade' },
  { table: 'project_tasks', column: 'assigned_to', ref: 'team_members', onDelete: 'set null' },
  { table: 'bookings', column: 'client_id', ref: 'clients', onDelete: 'set null' },
  { table: 'bookings', column: 'project_id', ref: 'projects', onDelete: 'set null' },
  { table: 'booking_crew', column: 'booking_id', ref: 'bookings', onDelete: 'cascade' },
  { table: 'booking_crew', column: 'team_member_id', ref: 'team_members', onDelete: 'cascade' },
  { table: 'portfolio_items', column: 'service_id', ref: 'services', onDelete: 'set null' },
  { table: 'testimonials', column: 'client_id', ref: 'clients', onDelete: 'set null' },
  { table: 'content_calendar', column: 'assigned_to', ref: 'team_members', onDelete: 'set null' },
  { table: 'content_calendar', column: 'project_id', ref: 'projects', onDelete: 'set null' },
  { table: 'content_calendar', column: 'client_id', ref: 'clients', onDelete: 'set null' },
  { table: 'invoices', column: 'client_id', ref: 'clients', onDelete: 'restrict' },
  { table: 'invoices', column: 'project_id', ref: 'projects', onDelete: 'set null' },
  { table: 'invoice_items', column: 'invoice_id', ref: 'invoices', onDelete: 'cascade' },
  { table: 'payments', column: 'client_id', ref: 'clients', onDelete: 'set null' },
  { table: 'payments', column: 'invoice_id', ref: 'invoices', onDelete: 'restrict' },
  { table: 'payments', column: 'project_id', ref: 'projects', onDelete: 'restrict' },
  { table: 'expenses', column: 'project_id', ref: 'projects', onDelete: 'set null' },
]

// ───────── access rules (mirror the RLS migration at table level) ─────────
const OPS: AppRole[] = ['owner', 'manager']
const FINR: AppRole[] = ['owner', 'manager', 'accounts']
const FINW: AppRole[] = ['owner', 'accounts']
const CRTV: AppRole[] = ['owner', 'manager', 'editor']
const READ: Partial<Record<TableName, AppRole[]>> = {
  enquiries: FINR, enquiry_followups: FINR, project_financials: FINR, invoices: FINR, invoice_items: FINR,
  payments: FINR, expenses: FINR, activity_logs: OPS,
}
const WRITE: Partial<Record<TableName, AppRole[]>> = {
  team_members: OPS, services: OPS, enquiries: OPS, enquiry_followups: OPS, project_team_members: OPS,
  bookings: OPS, booking_crew: OPS, portfolio_items: CRTV, testimonials: CRTV, content_calendar: CRTV,
  invoices: FINW, invoice_items: FINW, payments: FINW, expenses: FINW, project_financials: FINR,
  clients: ['owner', 'manager', 'accounts'], studio_settings: ['owner'], activity_logs: [],
}

const DEFAULT_DELIVERABLES = ['Creative brief & moodboard', 'Script / shot list approved', 'Shoot completed', 'First cut delivered', 'Final masters exported']
const PUBLIC_READ = new Set<TableName>(['services', 'portfolio_items', 'testimonials'])
const deny = () => new DataError("You don't have permission to do that. Ask an owner to change your role if you need access.", '42501')
const delay = () => new Promise((r) => setTimeout(r, 120 + Math.random() * 180))
const clone = <T,>(v: T): T => structuredClone(v)

export class DemoSource implements DataSource {
  readonly mode = 'demo' as const
  private db: Store
  private actor: Actor = { profileId: '', role: null, teamMemberId: null }
  private saveTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    this.db = this.load() ?? (buildSeed() as Store)
    this.save()
  }

  setActor(a: Actor) { this.actor = a }
  private rows(t: TableName): AnyRow[] { return this.db[t] as unknown as AnyRow[] }
  private setRows(t: TableName, rows: AnyRow[]) { (this.db as unknown as Record<string, AnyRow[]>)[t] = rows }
  reset() { this.db = buildSeed() as Store; this.save(true) }
  /** Remove every demo record, to see the app's empty states. Settings and demo users stay. */
  clearAll() {
    const keep: TableName[] = ['profiles', 'team_members', 'studio_settings', 'services']
    for (const t of Object.keys(this.db) as (TableName | '_seq')[]) if (t !== '_seq' && !keep.includes(t as TableName)) this.setRows(t as TableName, [])
    this.save(true)
  }
  profiles() { return this.db.profiles }

  private load(): Store | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as Store
      return parsed && Array.isArray(parsed.enquiries) ? parsed : null
    } catch { return null }
  }
  private save(immediate = false) {
    const write = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db)) } catch { /* storage full or blocked: keep in memory */ } }
    if (this.saveTimer) clearTimeout(this.saveTimer)
    if (immediate) write()
    else this.saveTimer = setTimeout(write, 150)
  }

  // ───────── access ─────────
  private role() { return this.actor.role }
  private canRead(t: TableName) { const r = this.role(); if (!r) return PUBLIC_READ.has(t); const allow = READ[t]; return !allow || allow.includes(r) }
  private canWrite(t: TableName, op: 'insert' | 'update' | 'delete', row?: AnyRow): boolean {
    const r = this.role()
    if (!r) return false
    if (t === 'clients' && op === 'delete') return r === 'owner'
    if (t === 'profiles') return op === 'update' && (row?.id === this.actor.profileId || r === 'owner')
    if (t === 'notifications') return op !== 'insert' && (row?.recipient_id === this.actor.profileId || (row?.recipient_id == null && OPS.includes(r)))
    if (t === 'projects' || t === 'project_tasks') {
      if (OPS.includes(r)) return true
      if (op === 'delete' || (t === 'projects' && op === 'insert')) return false
      const projectId = (t === 'projects' ? row?.id : row?.project_id) as string
      return this.db.project_team_members.some((m) => m.project_id === projectId && m.team_member_id === this.actor.teamMemberId)
    }
    const allow = WRITE[t]
    return !allow || allow.includes(r)
  }
  private visible<T extends TableName>(t: T, rows: Row<T>[]): Row<T>[] {
    if (!this.role()) {
      // anonymous website visitors: same filters as the anon RLS policies
      if (t === 'services') return rows.filter((x) => (x as Row<'services'>).is_active)
      if (t === 'portfolio_items') return rows.filter((x) => (x as Row<'portfolio_items'>).is_published)
      if (t === 'testimonials') return rows.filter((x) => (x as Row<'testimonials'>).status === 'approved')
      return []
    }
    if (t === 'notifications') {
      const r = this.role()
      return rows.filter((n) => { const x = n as Row<'notifications'>; return x.recipient_id === this.actor.profileId || (x.recipient_id == null && !!r && OPS.includes(r)) })
    }
    return rows
  }

  // ───────── CRUD ─────────
  async list<T extends TableName>(table: T): Promise<Row<T>[]> {
    await delay()
    if (!this.canRead(table)) return []
    return clone(this.visible(table, this.db[table] as Row<T>[]))
  }

  async insert<T extends TableName>(table: T, values: Insert<T>): Promise<Row<T>> {
    await delay()
    return clone(this.insertRow(table, values))
  }
  async insertMany<T extends TableName>(table: T, values: Insert<T>[]): Promise<Row<T>[]> {
    await delay()
    return clone(values.map((v) => this.insertRow(table, v)))
  }

  private insertRow<T extends TableName>(table: T, values: Insert<T>, system = false): Row<T> {
    if (!system && !this.canWrite(table, 'insert', values as AnyRow)) throw deny()
    const base: AnyRow = { ...(DEFAULTS[table]?.() ?? {}), ...stripUndefined(values as AnyRow) }
    if (!('id' in base) && !['project_team_members', 'booking_crew', 'project_financials'].includes(table)) base.id = uuid()
    base.created_at ??= now()
    if (table !== 'activity_logs' && table !== 'project_team_members' && table !== 'booking_crew') base.updated_at = now()
    const code = CODES[table]
    if (code && !base[code[0]]) base[code[0]] = code[1] + String(this.nextSeq(table)).padStart(4, '0')

    this.beforeWrite(table, base, null)
    ;this.rows(table).push(base)
    this.afterWrite(table, base, null)
    this.save()
    return base as unknown as Row<T>
  }

  async update<T extends TableName>(table: T, id: string, patch: Insert<T>, key = 'id'): Promise<Row<T>> {
    await delay()
    const rows = this.rows(table)
    const i = rows.findIndex((r) => String(r[key]) === String(id))
    if (i < 0) throw new DataError('That record no longer exists.', 'PGRST116')
    const old = rows[i]
    if (!this.canWrite(table, 'update', old)) throw deny()
    const next: AnyRow = { ...old, ...stripUndefined(patch as AnyRow), updated_at: now() }
    for (const k of ['id', 'code', 'created_at']) if (k in old) next[k] = old[k]
    if (table === 'profiles') this.guardProfile(old, next)
    this.beforeWrite(table, next, old)
    rows[i] = next
    this.afterWrite(table, next, old)
    this.save()
    return clone(next) as unknown as Row<T>
  }

  async remove(table: TableName, id: string, key = 'id'): Promise<void> {
    await delay()
    const row = this.rows(table).find((r) => String(r[key]) === String(id))
    if (!row) throw new DataError('That record no longer exists.', 'PGRST116')
    if (!this.canWrite(table, 'delete', row)) throw deny()
    this.deleteRow(table, row, key)
    this.save()
  }

  private deleteRow(table: TableName, row: AnyRow, key = 'id') {
    const id = row[key] as string
    for (const fk of FKS.filter((f) => f.ref === table)) {
      const kids = this.rows(fk.table).filter((r) => r[fk.column] === id)
      if (!kids.length) continue
      if (fk.onDelete === 'restrict') throw new DataError('This record is linked to other records (for example invoices or payments). Remove those links first.', '23503')
    }
    for (const fk of FKS.filter((f) => f.ref === table)) {
      const kids = this.rows(fk.table).filter((r) => r[fk.column] === id)
      for (const kid of kids) {
        if (fk.onDelete === 'cascade') this.deleteRow(fk.table, kid, fk.table === 'project_financials' ? 'project_id' : 'id')
        else if (fk.onDelete === 'set null') { kid[fk.column] = null; this.afterWrite(fk.table, kid, { ...kid, [fk.column]: id }) }
      }
    }
    ;this.setRows(table, this.rows(table).filter((r) => r !== row))
    this.afterWrite(table, null, row)
  }

  // ───────── triggers ─────────
  private nextSeq(name: string) { this.db._seq ??= {}; this.db._seq[name] = (this.db._seq[name] ?? 0) + 1; return this.db._seq[name] }

  private guardProfile(old: AnyRow, next: AnyRow) {
    if (next.role !== old.role || next.is_active !== old.is_active) {
      if (this.role() !== 'owner') throw new DataError('Only an owner can change roles or account status', '42501')
      if (old.id === this.actor.profileId && (next.role !== 'owner' || !next.is_active)) throw new DataError('You cannot remove your own owner access', '42501')
    }
    next.email = old.email
  }

  private beforeWrite(table: TableName, row: AnyRow, old: AnyRow | null) {
    switch (table) {
      case 'projects':
        if (row.start_date && row.delivery_date && (row.delivery_date as string) < (row.start_date as string)) throw new DataError('Delivery date must be on or after the start date.', '23514')
        break
      case 'invoice_items':
        row.amount = round2(Number(row.quantity) * Number(row.unit_price))
        break
      case 'invoices': {
        if (!old && !String(row.invoice_number ?? '').trim()) row.invoice_number = this.nextInvoiceNumber()
        if (row.due_date && (row.due_date as string) < (row.issue_date as string)) throw new DataError('Due date must be on or after the issue date.', '23514')
        if (this.db.invoices.some((i) => i.invoice_number === row.invoice_number && i.id !== row.id)) throw new DataError('That invoice number already exists.', '23505')
        this.computeInvoice(row as unknown as Invoice)
        break
      }
      case 'payments': {
        if (!row.invoice_id && !row.project_id) throw new DataError('A payment must be linked to an invoice or a project.', '23514')
        if (row.invoice_id) {
          const inv = this.db.invoices.find((i) => i.id === row.invoice_id)!
          if (inv.status === 'void') throw new DataError('Cannot record a payment against a void invoice', '23514')
          row.client_id ??= inv.client_id
          row.project_id ??= inv.project_id
          const other = this.db.payments.filter((p) => p.invoice_id === inv.id && p.id !== row.id).reduce((s, p) => s + Number(p.amount), 0)
          try { assertPaymentFits(Number(inv.total), other, Number(row.amount)) } catch (e) { throw new DataError((e as Error).message, '23514') }
        }
        if (!row.client_id && row.project_id) row.client_id = this.db.projects.find((p) => p.id === row.project_id)?.client_id ?? null
        break
      }
      case 'project_financials':
        row.amount_due = Math.max(round2(Number(row.budget) - Number(row.amount_received)), 0)
        break
      case 'bookings': {
        if (new Date(row.end_at as string) <= new Date(row.start_at as string)) throw new DataError('Shoot end time must be after the start time.', '23514')
        const timeChanged = !old || old.start_at !== row.start_at || old.end_at !== row.end_at || old.status !== row.status || JSON.stringify(old.equipment) !== JSON.stringify(row.equipment)
        if (timeChanged && ['requested', 'confirmed'].includes(row.status as string)) {
          const crew = this.db.booking_crew.filter((c) => c.booking_id === row.id).map((c) => c.team_member_id)
          this.assertNoConflict(row as unknown as Booking, crew)
        }
        break
      }
      case 'services':
        if (this.db.services.some((s) => s.slug === row.slug && s.id !== row.id)) throw new DataError('That URL slug is already used by another service.', '23505')
        break
    }
  }

  private afterWrite(table: TableName, row: AnyRow | null, old: AnyRow | null) {
    const r = row ?? old!
    switch (table) {
      case 'projects':
        if (row && !old) this.db.project_financials.push({ project_id: row.id as string, budget: 0, advance_paid: 0, amount_received: 0, amount_due: 0, updated_at: now() })
        break
      case 'invoice_items':
        for (const id of new Set([row?.invoice_id, old?.invoice_id])) if (id) this.touchInvoice(id as string)
        break
      case 'payments':
        for (const id of new Set([row?.invoice_id, old?.invoice_id])) if (id) this.touchInvoice(id as string)
        for (const id of new Set([row?.project_id, old?.project_id])) if (id) this.recalcProject(id as string)
        break
    }
    if (['enquiries', 'clients', 'projects', 'bookings', 'invoices', 'payments', 'expenses', 'portfolio_items'].includes(table)) {
      const action = !old ? 'created' : !row ? 'deleted' : old.status !== row.status ? 'status_changed' : 'updated'
      if (table === 'invoices' && action === 'updated') return
      const label = String(r.code ?? r.invoice_number ?? r.name ?? r.title ?? r.client_name ?? r.description ?? '')
      this.db.activity_logs.push({
        id: uuid(), actor_id: this.actor.profileId || null, entity_type: table, entity_id: r.id as string,
        action, summary: (label + (action === 'status_changed' ? ` → ${String(row!.status).replace(/_/g, ' ')}` : '')).trim(), created_at: now(),
      })
    }
  }

  private nextInvoiceNumber() {
    const s = this.db.studio_settings[0]
    const n = s.next_invoice_number
    s.next_invoice_number = n + 1
    return `${s.invoice_prefix}${todayIST().slice(2, 4)}-${String(n).padStart(4, '0')}`
  }

  private computeInvoice(inv: Invoice) {
    const items = this.db.invoice_items.filter((i) => i.invoice_id === inv.id)
    const paid = this.db.payments.filter((p) => p.invoice_id === inv.id).reduce((s, p) => s + Number(p.amount), 0)
    const t = computeInvoiceTotals(items, inv.discount_type, inv.discount_value, inv.tax_rate, paid)
    Object.assign(inv, t)
    inv.status = deriveInvoiceStatus(inv.status, t.total, t.amount_paid, inv.due_date, todayIST())
  }
  private touchInvoice(id: string) {
    const inv = this.db.invoices.find((i) => i.id === id)
    if (inv) { this.computeInvoice(inv); inv.updated_at = now() }
  }
  private recalcProject(projectId: string) {
    const pf = this.db.project_financials.find((f) => f.project_id === projectId)
    if (!pf) return
    const pays = this.db.payments.filter((p) => p.project_id === projectId)
    pf.amount_received = round2(pays.reduce((s, p) => s + Number(p.amount), 0))
    pf.advance_paid = round2(pays.filter((p) => p.is_advance).reduce((s, p) => s + Number(p.amount), 0))
    pf.amount_due = Math.max(round2(pf.budget - pf.amount_received), 0)
  }

  private memberName = (id: string) => this.db.team_members.find((t) => t.id === id)?.full_name ?? 'crew member'
  private conflicts(b: Pick<Booking, 'start_at' | 'end_at' | 'equipment'> & { id?: string }, crew: string[]) {
    const crewMap = new Map<string, string[]>()
    for (const c of this.db.booking_crew) crewMap.set(c.booking_id, [...(crewMap.get(c.booking_id) ?? []), c.team_member_id])
    return findConflicts({ start_at: b.start_at, end_at: b.end_at, crew, equipment: b.equipment, excludeId: b.id }, this.db.bookings, crewMap, this.memberName)
  }
  private assertNoConflict(b: Booking, crew: string[]) {
    const hit = this.conflicts(b, crew)[0]
    if (hit) throw new DataError(`Schedule conflict with ${hit.code} (${hit.title}): ${hit.reason}`, '23P01')
  }

  private notify(title: string, body: string, kind: string, link: string) {
    this.db.notifications.push({ id: uuid(), recipient_id: null, title, body, kind, link, read_at: null, created_at: now(), updated_at: now() })
  }

  // ───────── RPCs ─────────
  async rpc<N extends RpcName>(fn: N, args: RpcArgs[N]): Promise<RpcResult[N]> {
    await delay()
    const result = this.runRpc(fn, args)
    this.save()
    return clone(result) as RpcResult[N]
  }

  private runRpc(fn: RpcName, raw: unknown): unknown {
    switch (fn) {
      case 'set_project_team': {
        const a = raw as RpcArgs['set_project_team']
        if (!this.canWrite('project_team_members', 'insert')) throw deny()
        this.db.project_team_members = this.db.project_team_members.filter((m) => m.project_id !== a.p_project || a.p_members.includes(m.team_member_id))
        for (const m of a.p_members) if (!this.db.project_team_members.some((x) => x.project_id === a.p_project && x.team_member_id === m)) this.db.project_team_members.push({ project_id: a.p_project, team_member_id: m, role_on_project: null, created_at: now() })
        return null
      }
      case 'set_booking_crew': {
        const a = raw as RpcArgs['set_booking_crew']
        if (!this.canWrite('booking_crew', 'insert')) throw deny()
        const b = this.db.bookings.find((x) => x.id === a.p_booking)!
        const existing = this.db.booking_crew.filter((c) => c.booking_id === b.id).map((c) => c.team_member_id)
        const added = a.p_members.filter((m) => !existing.includes(m))
        if (added.length && ['requested', 'confirmed'].includes(b.status)) this.assertNoConflict(b, added)
        this.db.booking_crew = this.db.booking_crew.filter((c) => c.booking_id !== b.id || a.p_members.includes(c.team_member_id))
        for (const m of added) this.db.booking_crew.push({ booking_id: b.id, team_member_id: m, created_at: now() })
        return null
      }
      case 'booking_conflicts': {
        const a = raw as RpcArgs['booking_conflicts']
        return this.conflicts({ id: a.p_exclude ?? undefined, start_at: a.p_start, end_at: a.p_end, equipment: a.p_equipment }, a.p_crew)
      }
      case 'convert_enquiry': {
        const a = raw as RpcArgs['convert_enquiry']
        if (!OPS.includes(this.role()!)) throw new DataError('Not allowed', '42501')
        const e = this.db.enquiries.find((x) => x.id === a.p_enquiry)
        if (!e) throw new DataError('Enquiry not found')
        if (e.status === 'converted' && e.project_id) return { client_id: e.client_id, project_id: e.project_id, already: true }
        const digits = (s: string | null) => (s ?? '').replace(/\D/g, '')
        let clientId = e.client_id ?? this.db.clients.find((c) =>
          (e.email && c.email?.toLowerCase() === e.email.toLowerCase()) || (e.phone && digits(c.phone) === digits(e.phone)))?.id ?? null
        if (!clientId) {
          clientId = this.insertRow('clients', {
            name: e.client_name, business_name: e.business_name, email: e.email, phone: e.phone, whatsapp: e.phone,
            client_type: e.business_name ? 'business' : 'individual', notes: `Created from enquiry ${e.code}`,
          }, true).id
        }
        const project = this.insertRow('projects', {
          name: a.p_project_name.trim() || `${e.business_name ?? e.client_name} — ${e.service_label ?? 'Project'}`,
          client_id: clientId, service_id: e.service_id, service_label: e.service_label, description: e.notes,
          start_date: a.p_start, delivery_date: a.p_delivery, status: 'planning', enquiry_id: e.id,
        }, true)
        DEFAULT_DELIVERABLES.forEach((title, i) => this.insertRow('project_tasks', { project_id: project.id, title, kind: 'deliverable', sort_order: i }, true))
        const pf = this.db.project_financials.find((f) => f.project_id === project.id)!
        pf.budget = Number(a.p_budget ?? e.budget ?? 0)
        pf.amount_due = Math.max(pf.budget - pf.amount_received, 0)
        const old = { ...e }
        Object.assign(e, { status: 'converted', client_id: clientId, project_id: project.id, updated_at: now() })
        this.afterWrite('enquiries', e as unknown as AnyRow, old as unknown as AnyRow)
        return { client_id: clientId, project_id: project.id, already: false }
      }
      case 'submit_enquiry': {
        const a = raw as RpcArgs['submit_enquiry']
        if (a.p_website) return { ok: true }
        validateContact(a.p_name, a.p_phone, a.p_email)
        const fp = [a.p_email?.trim().toLowerCase() ?? '', (a.p_phone ?? '').replace(/\D/g, ''), a.p_service_slug ?? '', (a.p_message ?? '').slice(0, 200)].join('|')
        if (this.db.enquiries.some((e) => e.submission_fingerprint === fp && Date.now() - new Date(e.created_at).getTime() < 864e5)) return { ok: true, duplicate: true }
        const svc = this.db.services.find((s) => s.slug === a.p_service_slug && s.is_active)
        const e = this.insertRow('enquiries', {
          client_name: a.p_name.trim(), business_name: a.p_business?.trim() || null, phone: a.p_phone?.trim() || null,
          email: a.p_email?.trim().toLowerCase() || null, service_id: svc?.id ?? null, service_label: svc?.title ?? a.p_service_slug ?? null,
          budget: a.p_budget, lead_source: 'website', notes: a.p_message?.trim() || null, submitted_via: 'website', submission_fingerprint: fp,
        }, true)
        this.notify('New website enquiry', `${e.client_name}${svc ? ' — ' + svc.title : ''}`, 'enquiry', `/enquiries?open=${e.id}`)
        return { ok: true, duplicate: false }
      }
      case 'submit_booking_request': {
        const a = raw as RpcArgs['submit_booking_request']
        if (a.p_website) return { ok: true }
        validateContact(a.p_name, a.p_phone, a.p_email)
        const start = new Date(a.p_preferred_start)
        if (Number.isNaN(start.getTime()) || start.getTime() < Date.now()) throw new DataError('Please choose a shoot date in the future.', 'P0001')
        if (!(a.p_duration_hours >= 0.5 && a.p_duration_hours <= 14)) throw new DataError('Shoot duration must be between 30 minutes and 14 hours.', 'P0001')
        const fp = [a.p_email?.trim().toLowerCase() ?? '', (a.p_phone ?? '').replace(/\D/g, ''), start.toISOString()].join('|')
        if (this.db.bookings.some((b) => b.submission_fingerprint === fp && Date.now() - new Date(b.created_at).getTime() < 864e5)) return { ok: true, duplicate: true }
        const b = this.insertRow('bookings', {
          title: `Shoot request — ${a.p_name.trim()}`, contact_name: a.p_name.trim(), contact_phone: a.p_phone?.trim() || null,
          contact_email: a.p_email?.trim().toLowerCase() || null, shoot_type: a.p_shoot_type, start_at: start.toISOString(),
          end_at: new Date(start.getTime() + a.p_duration_hours * 36e5).toISOString(), location: a.p_location?.trim() || null,
          status: 'requested', internal_notes: a.p_message?.trim() || null, submitted_via: 'website', submission_fingerprint: fp,
        }, true)
        this.notify('New booking request', `${a.p_name.trim()} — ${fmtDateTime(b.start_at)}`, 'booking', `/bookings?open=${b.id}`)
        return { ok: true, duplicate: false }
      }
      case 'refresh_overdue_invoices': {
        let n = 0
        for (const inv of this.db.invoices) { const before = inv.status; this.computeInvoice(inv); if (inv.status !== before) n++ }
        return n
      }
    }
  }

  // ───────── files: kept as data URLs in demo mode (size-capped) ─────────
  async upload(_bucket: Bucket, _path: string, file: File) {
    if (file.size > 1.5 * 1024 * 1024) throw new DataError('In demo mode uploads are limited to 1.5 MB. Connect Supabase Storage for full-size media.', 'demo')
    const url = await new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.onerror = () => rej(fr.error); fr.readAsDataURL(file) })
    return { path: url, url }
  }
  async fileUrl(_bucket: Bucket, path: string) { return path }
}

function stripUndefined(o: AnyRow): AnyRow {
  const out: AnyRow = {}
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k] = v
  return out
}

function validateContact(name: string, phone: string | null, email: string | null) {
  if (!name || name.trim().length < 2) throw new DataError('Please enter your name.', 'P0001')
  if (!phone?.trim() && !email?.trim()) throw new DataError('Please enter a phone number or email.', 'P0001')
  if (phone?.trim() && !/^[0-9+\-\s()]{7,20}$/.test(phone.trim())) throw new DataError('Please enter a valid phone number.', 'P0001')
  if (email?.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) throw new DataError('Please enter a valid email address.', 'P0001')
}

export type DemoTables = Tables
