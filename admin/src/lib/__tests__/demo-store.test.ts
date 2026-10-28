import { beforeEach, describe, expect, it } from 'vitest'
import { DemoSource } from '../data/demo'

/** The demo store must behave like the database: triggers, constraints and role access. */
let ds: DemoSource
const as = (role: 'owner' | 'manager' | 'editor' | 'videographer' | 'accounts') => {
  const p = ds.profiles().find((x) => x.role === role)!
  ds.setActor({ profileId: p.id, role, teamMemberId: null })
}

beforeEach(() => { ds = new DemoSource(); ds.reset() })

describe('demo store', () => {
  it('seeds consistent invoice totals', async () => {
    as('owner')
    const [invoices, items, payments] = await Promise.all([ds.list('invoices'), ds.list('invoice_items'), ds.list('payments')])
    expect(invoices.length).toBeGreaterThan(5)
    for (const i of invoices) {
      const sub = items.filter((x) => x.invoice_id === i.id).reduce((s, x) => s + x.amount, 0)
      const paid = payments.filter((p) => p.invoice_id === i.id).reduce((s, p) => s + p.amount, 0)
      expect(i.subtotal).toBeCloseTo(sub, 2)
      expect(i.amount_paid).toBeCloseTo(paid, 2)
      expect(i.balance_due).toBeCloseTo(Math.max(i.total - paid, 0), 2)
    }
  })

  it('auto-numbers invoices, recalculates on items/payments, and blocks overpayment', async () => {
    as('accounts')
    const [client] = await ds.list('clients')
    const inv = await ds.insert('invoices', { client_id: client.id, status: 'sent', discount_type: 'percent', discount_value: 10, tax_rate: 18, due_date: '2099-01-01' })
    expect(inv.invoice_number).toMatch(/^RC-\d{2}-\d{4}$/)
    await ds.insertMany('invoice_items', [{ invoice_id: inv.id, description: 'Shoot', quantity: 1, unit_price: 40000 }, { invoice_id: inv.id, description: 'Edit', quantity: 2, unit_price: 5000 }])
    let cur = (await ds.list('invoices')).find((i) => i.id === inv.id)!
    expect(cur.total).toBe(53100)
    await ds.insert('payments', { invoice_id: inv.id, amount: 20000 })
    cur = (await ds.list('invoices')).find((i) => i.id === inv.id)!
    expect(cur.status).toBe('partially_paid')
    await expect(ds.insert('payments', { invoice_id: inv.id, amount: 40000 })).rejects.toThrow(/exceeds/)
    await ds.insert('payments', { invoice_id: inv.id, amount: 33100 })
    cur = (await ds.list('invoices')).find((i) => i.id === inv.id)!
    expect(cur.status).toBe('paid')
    await expect(ds.remove('invoices', inv.id)).rejects.toThrow(/linked/) // payments restrict delete
  })

  it('converts an enquiry into a client + project, idempotently', async () => {
    as('manager')
    const e = await ds.insert('enquiries', { client_name: 'Test Lead', phone: '+91 90000 00001', email: 'lead@example.in', budget: 25000 })
    expect(e.code).toMatch(/^ENQ-\d{4}$/)
    const r = await ds.rpc('convert_enquiry', { p_enquiry: e.id, p_project_name: 'Lead promo', p_budget: null, p_start: null, p_delivery: null })
    const fin = (await ds.list('project_financials')).find((f) => f.project_id === r.project_id)!
    expect(fin.budget).toBe(25000)
    const after = (await ds.list('enquiries')).find((x) => x.id === e.id)!
    expect(after.status).toBe('converted')
    expect((await ds.rpc('convert_enquiry', { p_enquiry: e.id, p_project_name: 'x', p_budget: null, p_start: null, p_delivery: null })).already).toBe(true)
  })

  it('enforces role access like RLS', async () => {
    as('editor')
    expect(await ds.list('invoices')).toEqual([])
    expect(await ds.list('enquiries')).toEqual([])
    expect(await ds.list('project_financials')).toEqual([])
    expect((await ds.list('projects')).length).toBeGreaterThan(0)
    const [client] = await ds.list('clients')
    await expect(ds.insert('invoices', { client_id: client.id })).rejects.toThrow(/permission/)
    await expect(ds.update('studio_settings', '1', { studio_name: 'X' })).rejects.toThrow(/permission/)
    as('accounts')
    await expect(ds.insert('enquiries', { client_name: 'Nope', phone: '1234567' })).rejects.toThrow(/permission/)
  })

  it('blocks double-booking crew and equipment but allows back-to-back shoots', async () => {
    as('owner')
    const team = await ds.list('team_members')
    const b1 = await ds.insert('bookings', { title: 'Slot A', start_at: '2099-01-01T03:30:00Z', end_at: '2099-01-01T07:30:00Z', status: 'confirmed', equipment: ['Test Cam'] })
    await ds.rpc('set_booking_crew', { p_booking: b1.id, p_members: [team[3].id] })
    const b2 = await ds.insert('bookings', { title: 'Slot B', start_at: '2099-01-01T06:30:00Z', end_at: '2099-01-01T09:30:00Z', status: 'confirmed' })
    await expect(ds.rpc('set_booking_crew', { p_booking: b2.id, p_members: [team[3].id] })).rejects.toThrow(/Schedule conflict/)
    await expect(ds.update('bookings', b2.id, { equipment: ['Test Cam'] })).rejects.toThrow(/Schedule conflict/)
    await expect(ds.insert('bookings', { title: 'Slot C', start_at: '2099-01-01T07:30:00Z', end_at: '2099-01-01T09:00:00Z', status: 'confirmed', equipment: ['Test Cam'] })).resolves.toBeTruthy()
  })

  it('accepts public submissions, drops bots and de-duplicates', async () => {
    ds.setActor({ profileId: '', role: null, teamMemberId: null })
    const args = { p_name: 'Website Visitor', p_phone: '+91 91234 56789', p_email: null, p_business: null, p_service_slug: 'brand-films', p_budget: null, p_message: 'Hi', p_website: null }
    expect(await ds.rpc('submit_enquiry', args)).toEqual({ ok: true, duplicate: false })
    expect(await ds.rpc('submit_enquiry', args)).toEqual({ ok: true, duplicate: true })
    expect(await ds.rpc('submit_enquiry', { ...args, p_name: 'Bot', p_website: 'http://spam' })).toEqual({ ok: true })
    await expect(ds.rpc('submit_enquiry', { ...args, p_phone: null })).rejects.toThrow(/phone number or email/)
    expect(await ds.list('enquiries')).toEqual([]) // anonymous can't read leads
    expect((await ds.list('services')).every((s) => s.is_active)).toBe(true)
    as('owner')
    const leads = (await ds.list('enquiries')).filter((e) => e.client_name === 'Website Visitor' || e.client_name === 'Bot')
    expect(leads.map((l) => l.client_name)).toEqual(['Website Visitor'])
    expect(leads[0].service_label).toBe('Brand Films')
  })

  it('cascades project deletion and recalculates advances', async () => {
    as('owner')
    const p = await ds.insert('projects', { name: 'Cascade test' })
    await ds.update('project_financials', p.id, { budget: 10000 }, 'project_id')
    await ds.insert('payments', { project_id: p.id, amount: 4000, is_advance: true })
    const fin = (await ds.list('project_financials')).find((f) => f.project_id === p.id)!
    expect(fin).toMatchObject({ advance_paid: 4000, amount_received: 4000, amount_due: 6000 })
    await expect(ds.remove('projects', p.id)).rejects.toThrow(/linked/) // money received keeps its project
    const q = await ds.insert('projects', { name: 'Cascade test 2' })
    await ds.insert('project_tasks', { project_id: q.id, title: 'Task' })
    await ds.rpc('set_project_team', { p_project: q.id, p_members: [(await ds.list('team_members'))[0].id] })
    await ds.remove('projects', q.id)
    expect((await ds.list('project_tasks')).some((t) => t.project_id === q.id)).toBe(false)
    expect((await ds.list('project_financials')).some((f) => f.project_id === q.id)).toBe(false)
    expect((await ds.list('project_team_members')).some((m) => m.project_id === q.id)).toBe(false)
  })
})
