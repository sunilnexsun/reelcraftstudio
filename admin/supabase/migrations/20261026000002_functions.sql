-- ReelCraft Studio — business rules enforced in the database

-- ───────────────────────── Role helpers ─────────────────────────
create or replace function public.current_app_role() returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;

create or replace function public.has_role(roles public.app_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_app_role() = any(roles), false)
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_app_role() is not null
$$;

create or replace function public.current_team_member_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.team_members where profile_id = auth.uid()
$$;

-- ───────────────────────── Auth → profile ─────────────────────────
-- The very first account becomes the active Owner. Every later sign-up is created
-- inactive with no role, and has no access until an Owner approves it in Settings.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare first_user boolean;
begin
  select not exists (select 1 from public.profiles) into first_user;
  insert into public.profiles (id, email, full_name, role, is_active)
  values (
    new.id, coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    case when first_user then 'owner'::public.app_role else null end,
    first_user
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Only an Owner may change roles or activation, and an Owner can't lock themselves out.
create or replace function public.guard_profile_changes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.is_active is distinct from old.is_active) then
    if auth.uid() is not null and not public.has_role(array['owner']::public.app_role[]) then
      raise exception 'Only an owner can change roles or account status' using errcode = '42501';
    end if;
    if old.id = auth.uid() and old.role = 'owner' and (new.role is distinct from 'owner' or not new.is_active) then
      raise exception 'You cannot remove your own owner access' using errcode = '42501';
    end if;
  end if;
  if new.email is distinct from old.email and auth.uid() is not null then
    new.email := old.email; -- email is synced from auth, not editable here
  end if;
  return new;
end $$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_changes();

-- ───────────────────────── Projects ─────────────────────────
create or replace function public.create_project_financials() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.project_financials (project_id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger projects_financials_row after insert on public.projects
  for each row execute function public.create_project_financials();

create or replace function public.recalc_project_financials(p_project uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_project is null then return; end if;
  update public.project_financials pf set
    amount_received = coalesce((select sum(amount) from public.payments where project_id = p_project), 0),
    advance_paid    = coalesce((select sum(amount) from public.payments where project_id = p_project and is_advance), 0)
  where pf.project_id = p_project;
end $$;

-- Replace a project's team in one call (RLS of the caller applies).
create or replace function public.set_project_team(p_project uuid, p_members uuid[]) returns void
language plpgsql security invoker set search_path = public as $$
begin
  delete from public.project_team_members
   where project_id = p_project and team_member_id <> all(coalesce(p_members, '{}'));
  insert into public.project_team_members (project_id, team_member_id)
  select p_project, m from unnest(coalesce(p_members, '{}')) m
  on conflict do nothing;
end $$;

-- ───────────────────────── Invoices ─────────────────────────
create or replace function public.next_invoice_number() returns text
language plpgsql security definer set search_path = public as $$
declare v_prefix text; v_num integer;
begin
  update public.studio_settings
     set next_invoice_number = next_invoice_number + 1
   where id = 1
  returning invoice_prefix, next_invoice_number - 1 into v_prefix, v_num;
  return v_prefix || to_char((now() at time zone 'Asia/Kolkata'), 'YY') || '-' || lpad(v_num::text, 4, '0');
end $$;

-- Totals are always derived from line items and payments, never trusted from the client.
create or replace function public.compute_invoice() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_sub numeric(12,2); v_paid numeric(12,2); v_taxable numeric(12,2);
begin
  if tg_op = 'INSERT' and coalesce(trim(new.invoice_number), '') = '' then
    new.invoice_number := public.next_invoice_number();
  end if;

  select coalesce(sum(amount), 0) into v_sub from public.invoice_items where invoice_id = new.id;
  select coalesce(sum(amount), 0) into v_paid from public.payments where invoice_id = new.id;

  new.subtotal := v_sub;
  new.discount_amount := case
    when new.discount_type = 'percent' then round(v_sub * least(new.discount_value, 100) / 100, 2)
    else least(new.discount_value, v_sub) end;
  v_taxable := v_sub - new.discount_amount;
  new.tax_amount := round(v_taxable * new.tax_rate / 100, 2);
  new.total := v_taxable + new.tax_amount;
  new.amount_paid := v_paid;
  new.balance_due := greatest(new.total - v_paid, 0);

  if new.status <> 'void' then
    if new.total > 0 and v_paid >= new.total then
      new.status := 'paid';
    elsif v_paid > 0 then
      new.status := 'partially_paid';
    elsif new.status in ('paid', 'partially_paid') then
      new.status := 'sent';
    end if;
    if new.status in ('sent', 'partially_paid') and new.due_date is not null
       and new.due_date < (now() at time zone 'Asia/Kolkata')::date and new.balance_due > 0 then
      new.status := 'overdue';
    elsif new.status = 'overdue' and (new.due_date is null or new.due_date >= (now() at time zone 'Asia/Kolkata')::date) then
      new.status := case when v_paid > 0 then 'partially_paid' else 'sent' end;
    end if;
  end if;
  return new;
end $$;

create trigger invoices_compute before insert or update on public.invoices
  for each row execute function public.compute_invoice();

create or replace function public.touch_invoice() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.invoice_id is not null then
    update public.invoices set updated_at = now() where id = old.invoice_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.invoice_id is not null then
    update public.invoices set updated_at = now() where id = new.invoice_id;
  end if;
  return null;
end $$;

create trigger invoice_items_touch after insert or update or delete on public.invoice_items
  for each row execute function public.touch_invoice();

-- Payments: fill client/project from the invoice, refuse overpayment, refresh totals.
create or replace function public.prepare_payment() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_inv public.invoices; v_other numeric(12,2);
begin
  if new.invoice_id is not null then
    select * into v_inv from public.invoices where id = new.invoice_id;
    if v_inv.status = 'void' then
      raise exception 'Cannot record a payment against a void invoice' using errcode = '23514';
    end if;
    new.client_id := coalesce(new.client_id, v_inv.client_id);
    new.project_id := coalesce(new.project_id, v_inv.project_id);
    select coalesce(sum(amount), 0) into v_other from public.payments
     where invoice_id = new.invoice_id and id <> new.id;
    if v_other + new.amount > v_inv.total then
      raise exception 'Payment of % exceeds the invoice balance of %', new.amount, greatest(v_inv.total - v_other, 0)
        using errcode = '23514';
    end if;
  end if;
  if new.client_id is null and new.project_id is not null then
    select client_id into new.client_id from public.projects where id = new.project_id;
  end if;
  return new;
end $$;

create trigger payments_prepare before insert or update on public.payments
  for each row execute function public.prepare_payment();

create or replace function public.after_payment_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    if old.invoice_id is not null then update public.invoices set updated_at = now() where id = old.invoice_id; end if;
    perform public.recalc_project_financials(old.project_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    if new.invoice_id is not null then update public.invoices set updated_at = now() where id = new.invoice_id; end if;
    perform public.recalc_project_financials(new.project_id);
  end if;
  return null;
end $$;

create trigger payments_after after insert or update or delete on public.payments
  for each row execute function public.after_payment_change();

-- Refresh overdue status (schedule daily with pg_cron, or call from the app).
create or replace function public.refresh_overdue_invoices() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update public.invoices set updated_at = now()
   where status in ('sent', 'partially_paid') and due_date < (now() at time zone 'Asia/Kolkata')::date;
  get diagnostics n = row_count;
  return n;
end $$;

-- ───────────────────────── Bookings: conflict prevention ─────────────────────────
-- Returns other active bookings that overlap in time and share a crew member or equipment item.
create or replace function public.booking_conflicts(
  p_start timestamptz, p_end timestamptz, p_crew uuid[], p_equipment text[], p_exclude uuid default null
) returns table (booking_id uuid, code text, title text, start_at timestamptz, end_at timestamptz, reason text)
language sql stable security definer set search_path = public as $$
  select b.id, b.code, b.title, b.start_at, b.end_at,
         concat_ws('; ',
           case when exists (select 1 from public.booking_crew bc where bc.booking_id = b.id and bc.team_member_id = any(coalesce(p_crew, '{}')))
             then 'crew: ' || (select string_agg(tm.full_name, ', ') from public.booking_crew bc join public.team_members tm on tm.id = bc.team_member_id
                               where bc.booking_id = b.id and bc.team_member_id = any(coalesce(p_crew, '{}'))) end,
           case when b.equipment && coalesce(p_equipment, '{}')
             then 'equipment: ' || array_to_string(array(select unnest(b.equipment) intersect select unnest(coalesce(p_equipment, '{}'))), ', ') end
         ) as reason
    from public.bookings b
   where b.status in ('requested', 'confirmed')
     and (p_exclude is null or b.id <> p_exclude)
     and tstzrange(b.start_at, b.end_at, '[)') && tstzrange(p_start, p_end, '[)')
     and (
       b.equipment && coalesce(p_equipment, '{}')
       or exists (select 1 from public.booking_crew bc where bc.booking_id = b.id and bc.team_member_id = any(coalesce(p_crew, '{}')))
     )
$$;

create or replace function public.check_booking_conflicts() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_crew uuid[]; v_hit record;
begin
  if new.status not in ('requested', 'confirmed') then return new; end if;
  select coalesce(array_agg(team_member_id), '{}') into v_crew from public.booking_crew where booking_id = new.id;
  select * into v_hit from public.booking_conflicts(new.start_at, new.end_at, v_crew, new.equipment, new.id) limit 1;
  if found then
    raise exception 'Schedule conflict with % (%): %', v_hit.code, v_hit.title, v_hit.reason using errcode = '23P01';
  end if;
  return new;
end $$;

create trigger bookings_conflicts before insert or update of start_at, end_at, equipment, status on public.bookings
  for each row execute function public.check_booking_conflicts();

create or replace function public.check_crew_conflict() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_b public.bookings; v_hit record;
begin
  select * into v_b from public.bookings where id = new.booking_id;
  if v_b.status not in ('requested', 'confirmed') then return new; end if;
  select * into v_hit from public.booking_conflicts(v_b.start_at, v_b.end_at, array[new.team_member_id], '{}', v_b.id) limit 1;
  if found then
    raise exception 'Schedule conflict with % (%): %', v_hit.code, v_hit.title, v_hit.reason using errcode = '23P01';
  end if;
  return new;
end $$;

create trigger booking_crew_conflicts before insert on public.booking_crew
  for each row execute function public.check_crew_conflict();

create or replace function public.set_booking_crew(p_booking uuid, p_members uuid[]) returns void
language plpgsql security invoker set search_path = public as $$
begin
  delete from public.booking_crew
   where booking_id = p_booking and team_member_id <> all(coalesce(p_members, '{}'));
  insert into public.booking_crew (booking_id, team_member_id)
  select p_booking, m from unnest(coalesce(p_members, '{}')) m
  on conflict do nothing;
end $$;

-- ───────────────────────── Enquiry conversion ─────────────────────────
-- Atomically: find or create the client, create the project, mark the enquiry converted.
create or replace function public.convert_enquiry(
  p_enquiry uuid, p_project_name text, p_budget numeric default null,
  p_start date default null, p_delivery date default null
) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare e public.enquiries; v_client uuid; v_project uuid;
begin
  if not public.has_role(array['owner', 'manager']::public.app_role[]) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select * into e from public.enquiries where id = p_enquiry for update;
  if not found then raise exception 'Enquiry not found'; end if;
  if e.status = 'converted' and e.project_id is not null then
    return jsonb_build_object('client_id', e.client_id, 'project_id', e.project_id, 'already', true);
  end if;

  v_client := e.client_id;
  if v_client is null then
    select id into v_client from public.clients
     where (e.email is not null and lower(email) = lower(e.email))
        or (e.phone is not null and regexp_replace(phone, '\D', '', 'g') = regexp_replace(e.phone, '\D', '', 'g'))
     order by created_at limit 1;
  end if;
  if v_client is null then
    insert into public.clients (name, business_name, email, phone, whatsapp, client_type, notes)
    values (e.client_name, e.business_name, e.email, e.phone, e.phone,
            case when e.business_name is null then 'individual' else 'business' end,
            'Created from enquiry ' || e.code)
    returning id into v_client;
  end if;

  insert into public.projects (name, client_id, service_id, service_label, description, start_date, delivery_date, status, enquiry_id)
  values (coalesce(nullif(trim(p_project_name), ''), coalesce(e.business_name, e.client_name) || ' — ' || coalesce(e.service_label, 'Project')),
          v_client, e.service_id, e.service_label, e.notes, p_start, p_delivery, 'planning', e.id)
  returning id into v_project;

  update public.project_financials set budget = coalesce(p_budget, e.budget, 0) where project_id = v_project;
  insert into public.project_tasks (project_id, title, kind, sort_order)
  select v_project, t.title, 'deliverable', t.ord - 1
    from unnest(array['Creative brief & moodboard', 'Script / shot list approved', 'Shoot completed',
                      'First cut delivered', 'Final masters exported']) with ordinality as t(title, ord);
  -- the enquiries activity trigger records this as a status change to "converted"
  update public.enquiries set status = 'converted', client_id = v_client, project_id = v_project where id = e.id;

  return jsonb_build_object('client_id', v_client, 'project_id', v_project, 'already', false);
end $$;

-- ───────────────────────── Activity log ─────────────────────────
create or replace function public.log_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare r jsonb; v_label text; v_action text;
begin
  r := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_label := coalesce(r ->> 'code', r ->> 'invoice_number', r ->> 'name', r ->> 'title', r ->> 'client_name', '');
  v_action := case
    when tg_op = 'INSERT' then 'created'
    when tg_op = 'DELETE' then 'deleted'
    when (to_jsonb(old) ->> 'status') is distinct from (r ->> 'status') then 'status_changed'
    else 'updated' end;
  if v_action = 'updated' and tg_table_name in ('invoices') then
    return null; -- totals are recalculated often; only log meaningful invoice events
  end if;
  insert into public.activity_logs (actor_id, entity_type, entity_id, action, summary)
  values (auth.uid(), tg_table_name, (r ->> 'id')::uuid, v_action,
          trim(v_label || case when v_action = 'status_changed' then ' → ' || replace(r ->> 'status', '_', ' ') else '' end));
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['enquiries','clients','projects','bookings','invoices','payments','expenses','portfolio_items'] loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.log_activity()', t || '_activity', t);
  end loop;
end $$;
