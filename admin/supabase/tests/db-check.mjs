// Runs every migration in an in-process Postgres (PGlite) with Supabase auth/storage stubs,
// then exercises triggers, RLS per role and the public API. Usage: npm run test:db
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import fs from 'node:fs'
import path from 'node:path'

const dir = process.argv[2] ?? new URL('../migrations', import.meta.url).pathname
const db = new PGlite({ extensions: { pgcrypto } })
const ok = (m) => console.log('  ✓ ' + m)
const fail = (m) => { console.log('  ✗ ' + m); process.exitCode = 1 }

await db.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
create schema auth; grant usage on schema auth to anon, authenticated;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant execute on function auth.uid() to anon, authenticated;
create schema storage; grant usage on schema storage to anon, authenticated;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security; grant all on storage.objects, storage.buckets to anon, authenticated;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
`)
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) {
  try { await db.exec(fs.readFileSync(path.join(dir, f), 'utf8')); ok('migration ' + f) }
  catch (e) { fail('migration ' + f + ': ' + e.message); process.exit(1) }
}
if (process.argv[3]) {
  try { await db.exec(fs.readFileSync(process.argv[3], 'utf8')); ok('seed ' + path.basename(process.argv[3])) }
  catch (e) { fail('seed: ' + e.message); process.exit(1) }
}

const as = async (uid, sql, params) => {
  await db.exec(uid === 'anon' ? `reset role; select set_config('request.jwt.claim.sub','',false); set role anon;`
    : `reset role; select set_config('request.jwt.claim.sub','${uid}',false); set role authenticated;`)
  try { return await db.query(sql, params) } finally { await db.exec('reset role;') }
}
const expectErr = async (label, fn, re) => { try { await fn(); fail(label + ' (no error)') } catch (e) { re.test(e.message) ? ok(label + ' → ' + e.message.slice(0, 90)) : fail(label + ': ' + e.message) } }

// users
const owner = (await db.query(`insert into auth.users (email) values ('owner@test.dev') returning id`)).rows[0].id
const u2 = (await db.query(`insert into auth.users (email) values ('editor@test.dev') returning id`)).rows[0].id
const u3 = (await db.query(`insert into auth.users (email) values ('acct@test.dev') returning id`)).rows[0].id
const p = (await db.query(`select email, role, is_active from public.profiles order by created_at, email`)).rows
p.find(r => r.email === 'owner@test.dev').role === 'owner' ? ok('first user is owner') : fail('first user role')
p.find(r => r.email === 'editor@test.dev').is_active === false ? ok('later sign-ups inactive') : fail('signup active')

// inactive user sees nothing
;(await as(u2, `select * from public.clients`)).rows.length === 0 || fail('inactive sees clients')
await expectErr('inactive user cannot self-promote', () => as(u2, `update public.profiles set role='owner', is_active=true where id=$1`, [u2]), /Only an owner/)
await as(owner, `update public.profiles set role='editor', is_active=true where id=$1`, [u2]); ok('owner activates editor')
await as(owner, `update public.profiles set role='accounts', is_active=true where id=$1`, [u3])
await expectErr('owner cannot demote self', () => as(owner, `update public.profiles set role='manager' where id=$1`, [owner]), /own owner/)

// core data as owner
const svc = (await as(owner, `insert into public.services (title, slug, starting_price) values ('Brand Films','brand-films',45000) returning id`)).rows[0].id
const client = (await as(owner, `insert into public.clients (name, email, phone) values ('FitZone Gym','hi@fitzone.in','+91 98400 00001') returning id`)).rows[0].id
const proj = (await as(owner, `insert into public.projects (name, client_id, service_id) values ('FitZone promo', $1, $2) returning id, code`, [client, svc])).rows[0]
ok('project code ' + proj.code)
await as(owner, `update public.project_financials set budget = 60000 where project_id = $1`, [proj.id])
const tm1 = (await as(owner, `insert into public.team_members (full_name, role, profile_id) values ('Edi Tor','editor',$1) returning id`, [u2])).rows[0].id
const tm2 = (await as(owner, `insert into public.team_members (full_name, role) values ('Vik Cam','videographer') returning id`)).rows[0].id
await as(owner, `select public.set_project_team($1, $2)`, [proj.id, [tm1]])

// invoices
const inv = (await as(u3, `insert into public.invoices (client_id, project_id, discount_type, discount_value, tax_rate, due_date) values ($1,$2,'percent',10,18, current_date + 10) returning id, invoice_number, total`, [client, proj.id])).rows[0]
;/^RC-\d{2}-0001$/.test(inv.invoice_number) ? ok('invoice number ' + inv.invoice_number) : fail('invoice number ' + inv.invoice_number)
await as(u3, `insert into public.invoice_items (invoice_id, description, quantity, unit_price) values ($1,'Shoot day',1,40000),($1,'Edit',2,5000)`, [inv.id])
let iv = (await as(u3, `select subtotal, discount_amount, tax_amount, total, balance_due, status from public.invoices where id=$1`, [inv.id])).rows[0]
// subtotal 50000, discount 5000, taxable 45000, tax 8100, total 53100
;(+iv.subtotal === 50000 && +iv.discount_amount === 5000 && +iv.tax_amount === 8100 && +iv.total === 53100) ? ok('invoice totals 53100') : fail('totals ' + JSON.stringify(iv))
await as(u3, `update public.invoices set status='sent' where id=$1`, [inv.id])
await as(u3, `insert into public.payments (invoice_id, amount, is_advance) values ($1, 20000, true)`, [inv.id])
iv = (await as(u3, `select amount_paid, balance_due, status from public.invoices where id=$1`, [inv.id])).rows[0]
;(iv.status === 'partially_paid' && +iv.balance_due === 33100) ? ok('partial payment → partially_paid, 33100 due') : fail(JSON.stringify(iv))
await expectErr('overpayment blocked', () => as(u3, `insert into public.payments (invoice_id, amount) values ($1, 40000)`, [inv.id]), /exceeds/)
await as(u3, `insert into public.payments (invoice_id, amount) values ($1, 33100)`, [inv.id])
iv = (await as(u3, `select status, balance_due from public.invoices where id=$1`, [inv.id])).rows[0]
iv.status === 'paid' ? ok('fully paid → paid') : fail(JSON.stringify(iv))
const pf = (await as(owner, `select * from public.project_financials where project_id=$1`, [proj.id])).rows[0]
;(+pf.advance_paid === 20000 && +pf.amount_received === 53100 && +pf.amount_due === 6900) ? ok('project financials: adv 20000, recv 53100, due 6900') : fail(JSON.stringify(pf))

// RLS by role
;(await as(u2, `select * from public.invoices`)).rows.length === 0 ? ok('editor cannot read invoices') : fail('editor reads invoices')
;(await as(u2, `select * from public.project_financials`)).rows.length === 0 ? ok('editor cannot read project budget') : fail('editor reads financials')
;(await as(u2, `select * from public.enquiries`)).rows.length === 0 ? ok('editor cannot read enquiries') : fail('editor reads enquiries')
;(await as(u2, `select * from public.projects`)).rows.length === 1 ? ok('editor sees projects') : fail('editor projects')
const up = await as(u2, `update public.projects set status='editing' where id=$1 returning id`, [proj.id])
up.rows.length === 1 ? ok('assigned editor can move project status') : fail('editor update')
await expectErr('editor cannot create invoices', () => as(u2, `insert into public.invoices (client_id) values ($1)`, [client]), /row-level security/)
await expectErr('accounts cannot change settings', async () => { const r = await as(u3, `update public.studio_settings set studio_name='x' returning id`); if (!r.rows.length) throw new Error('row-level security: 0 rows') }, /row-level security/)

// bookings & conflicts
const b1 = (await as(owner, `insert into public.bookings (title, start_at, end_at, equipment, status) values ('Shoot A', '2026-11-01 09:00+05:30', '2026-11-01 13:00+05:30', '{Sony FX3 #1}', 'confirmed') returning id`)).rows[0].id
await as(owner, `select public.set_booking_crew($1, $2)`, [b1, [tm2]])
const b2 = (await as(owner, `insert into public.bookings (title, start_at, end_at, status) values ('Shoot B', '2026-11-01 12:00+05:30', '2026-11-01 15:00+05:30', 'confirmed') returning id`)).rows[0].id
await expectErr('crew double-booking blocked', () => as(owner, `select public.set_booking_crew($1, $2)`, [b2, [tm2]]), /Schedule conflict/)
await expectErr('equipment double-booking blocked', () => as(owner, `update public.bookings set equipment='{Sony FX3 #1}' where id=$1`, [b2]), /Schedule conflict/)
await as(owner, `insert into public.bookings (title, start_at, end_at, equipment, status) values ('Shoot C', '2026-11-01 13:00+05:30', '2026-11-01 15:00+05:30', '{Sony FX3 #1}', 'confirmed')`); ok('back-to-back booking allowed')
const c = (await as(owner, `select * from public.booking_conflicts('2026-11-01 10:00+05:30','2026-11-01 11:00+05:30', $1, '{}', null)`, [[tm2]])).rows
c.length === 1 && /Vik Cam/.test(c[0].reason) ? ok('booking_conflicts RPC: ' + c[0].reason) : fail(JSON.stringify(c))

// public API
await db.exec(`select set_config('request.headers', '{"x-forwarded-for":"1.2.3.4"}', false)`)
let r = (await as('anon', `select public.submit_enquiry('Priya S','+91 98765 43210','priya@x.in',null,'brand-films',50000,'Need a reel') as r`)).rows[0].r
r.ok && !r.duplicate ? ok('anon submit_enquiry') : fail(JSON.stringify(r))
r = (await as('anon', `select public.submit_enquiry('Priya S','+91 98765 43210','priya@x.in',null,'brand-films',50000,'Need a reel') as r`)).rows[0].r
r.duplicate ? ok('duplicate enquiry detected') : fail('dup ' + JSON.stringify(r))
await expectErr('invalid email rejected', () => as('anon', `select public.submit_enquiry('Bob','', 'not-an-email')`), /valid email/)
r = (await as('anon', `select public.submit_enquiry('Bot','1234567','b@b.io',null,null,null,null,'http://spam') as r`)).rows[0].r
const bots = (await db.query(`select count(*)::int n from public.enquiries where client_name='Bot'`)).rows[0].n
bots === 0 && r.ok ? ok('honeypot drops bot silently') : fail('honeypot')
await expectErr('anon cannot read enquiries', () => as('anon', `select * from public.enquiries`), /permission denied/)
await expectErr('anon cannot insert enquiries directly', () => as('anon', `insert into public.enquiries (client_name, phone) values ('x','1234567')`), /permission denied/)
await expectErr('anon cannot call convert_enquiry', () => as('anon', `select public.convert_enquiry(gen_random_uuid(), 'x')`), /permission denied/)
for (let i = 0; i < 4; i++) await as('anon', `select public.submit_enquiry('Spam ${i}','98765432${i}0',null,null,null,null,'msg ${i}')`)
await expectErr('rate limit after 5/hour per IP', () => as('anon', `select public.submit_enquiry('Spam 9','9876543299',null,null,null,null,'msg 9')`), /Too many/)
r = (await as('anon', `select public.submit_booking_request('Karthik','+91 90000 11111',null,'Event', now() + interval '10 days', 3, 'Chennai') as r`)).rows[0].r
r.ok ? ok('anon booking request') : fail('booking request')
await expectErr('past booking date rejected', () => as('anon', `select public.submit_booking_request('Kay','+91 90000 11112',null,'Event', now() - interval '1 day', 3)`), /future/)
;(await as('anon', `select count(*)::int n from public.services`)).rows[0].n === 1 ? ok('anon reads active services') : fail('anon services')
const notes = (await as(owner, `select title from public.notifications`)).rows
notes.length >= 2 ? ok('notifications created: ' + notes.length) : fail('notifications')

// conversion
const enq = (await db.query(`select id from public.enquiries where client_name='Priya S'`)).rows[0].id
const conv = (await as(owner, `select public.convert_enquiry($1, 'Priya reel', 55000) as r`, [enq])).rows[0].r
const e2 = (await db.query(`select status, project_id, client_id from public.enquiries where id=$1`, [enq])).rows[0]
const b = (await db.query(`select budget from public.project_financials where project_id=$1`, [conv.project_id])).rows[0]
;(e2.status === 'converted' && e2.project_id === conv.project_id && +b.budget === 55000) ? ok('convert_enquiry creates client+project') : fail(JSON.stringify({ e2, conv, b }))
const again = (await as(owner, `select public.convert_enquiry($1, 'x') as r`, [enq])).rows[0].r
again.already ? ok('conversion is idempotent') : fail('not idempotent')
await expectErr('editor cannot convert', () => as(u2, `select public.convert_enquiry($1, 'x')`, [enq]), /Not allowed/)

const logs = (await as(owner, `select count(*)::int n from public.activity_logs`)).rows[0].n
logs > 5 ? ok('activity logs written: ' + logs) : fail('logs')
;(await as(u2, `select count(*)::int n from public.activity_logs`)).rows[0].n === 0 ? ok('editor cannot read activity log') : fail('editor logs')

// storage
await expectErr('editor cannot upload receipts', () => as(u2, `insert into storage.objects (bucket_id, name) values ('receipts','a.pdf')`), /row-level security/)
await as(u2, `insert into storage.objects (bucket_id, name) values ('portfolio','thumb.jpg')`); ok('editor uploads portfolio media')

const tables = (await db.query(`select tablename from pg_tables where schemaname='public' and not rowsecurity`)).rows
tables.length === 0 ? ok('RLS enabled on every public table') : fail('RLS missing: ' + tables.map(t => t.tablename))
console.log(process.exitCode ? '\nFAILURES' : '\nALL DB CHECKS PASSED')

// project deletion with payments is blocked; without, it cascades
await expectErr('project with payments cannot be deleted', () => as(owner, `delete from public.projects where id=$1`, [proj.id]), /foreign key/)
const p2 = (await as(owner, `insert into public.projects (name) values ('Temp project') returning id`)).rows[0].id
await as(owner, `insert into public.project_tasks (project_id, title) values ($1,'x')`, [p2])
await as(owner, `delete from public.projects where id=$1`, [p2])
;(await db.query(`select count(*)::int n from public.project_financials where project_id=$1`, [p2])).rows[0].n === 0 ? ok('project delete cascades financials/tasks') : fail('cascade')
console.log(process.exitCode ? 'FAILURES (extra)' : 'EXTRA CHECKS PASSED')
