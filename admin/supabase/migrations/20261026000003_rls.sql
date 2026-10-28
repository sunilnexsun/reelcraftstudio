-- ReelCraft Studio — Row Level Security
-- Roles: owner (everything) · manager (operations, read finance) · accounts (finance)
--        editor (creative + assigned projects) · videographer (shoots + assigned projects)

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','team_members','services','clients','enquiries','enquiry_followups','projects','project_financials',
    'project_team_members','project_tasks','bookings','booking_crew','portfolio_items','testimonials','content_calendar',
    'invoices','invoice_items','payments','expenses','notifications','activity_logs','studio_settings'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Anonymous visitors only read published website content (and call the public RPCs in 0005).
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant select on public.services, public.portfolio_items, public.testimonials to anon;

-- Functions are private by default; grant explicitly.
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.current_app_role(), public.has_role(public.app_role[]), public.is_staff(), public.current_team_member_id(),
  public.set_project_team(uuid, uuid[]), public.set_booking_crew(uuid, uuid[]),
  public.booking_conflicts(timestamptz, timestamptz, uuid[], text[], uuid),
  public.convert_enquiry(uuid, text, numeric, date, date), public.refresh_overdue_invoices()
to authenticated;

-- shorthand role sets
-- OPS  = owner, manager
-- FINR = owner, manager, accounts   (read finance)
-- FINW = owner, accounts            (write finance)
-- CRTV = owner, manager, editor     (website content)

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.has_role('{owner}')) with check (id = auth.uid() or public.has_role('{owner}'));

-- team
create policy team_select on public.team_members for select to authenticated using (public.is_staff());
create policy team_write on public.team_members for all to authenticated
  using (public.has_role('{owner,manager}')) with check (public.has_role('{owner,manager}'));

-- services (public read of active services)
create policy services_public on public.services for select to anon using (is_active);
create policy services_select on public.services for select to authenticated using (is_active or public.is_staff());
create policy services_write on public.services for all to authenticated
  using (public.has_role('{owner,manager}')) with check (public.has_role('{owner,manager}'));

-- clients
create policy clients_select on public.clients for select to authenticated using (public.is_staff());
create policy clients_insert on public.clients for insert to authenticated with check (public.has_role('{owner,manager,accounts}'));
create policy clients_update on public.clients for update to authenticated
  using (public.has_role('{owner,manager,accounts}')) with check (public.has_role('{owner,manager,accounts}'));
create policy clients_delete on public.clients for delete to authenticated using (public.has_role('{owner}'));

-- enquiries + follow-ups (leads are sales data: not visible to editors/videographers)
create policy enquiries_select on public.enquiries for select to authenticated using (public.has_role('{owner,manager,accounts}'));
create policy enquiries_write on public.enquiries for all to authenticated
  using (public.has_role('{owner,manager}')) with check (public.has_role('{owner,manager}'));
create policy followups_select on public.enquiry_followups for select to authenticated using (public.has_role('{owner,manager,accounts}'));
create policy followups_write on public.enquiry_followups for all to authenticated
  using (public.has_role('{owner,manager}')) with check (public.has_role('{owner,manager}'));

-- projects: every staff member sees the board; only ops create/delete; assigned crew may update
create policy projects_select on public.projects for select to authenticated using (public.is_staff());
create policy projects_insert on public.projects for insert to authenticated with check (public.has_role('{owner,manager}'));
create policy projects_update on public.projects for update to authenticated
  using (
    public.has_role('{owner,manager}')
    or exists (select 1 from public.project_team_members ptm
               where ptm.project_id = projects.id and ptm.team_member_id = public.current_team_member_id())
  )
  with check (
    public.has_role('{owner,manager}')
    or exists (select 1 from public.project_team_members ptm
               where ptm.project_id = projects.id and ptm.team_member_id = public.current_team_member_id())
  );
create policy projects_delete on public.projects for delete to authenticated using (public.has_role('{owner,manager}'));

create policy project_fin_select on public.project_financials for select to authenticated using (public.has_role('{owner,manager,accounts}'));
create policy project_fin_update on public.project_financials for update to authenticated
  using (public.has_role('{owner,manager,accounts}')) with check (public.has_role('{owner,manager,accounts}'));

create policy ptm_select on public.project_team_members for select to authenticated using (public.is_staff());
create policy ptm_write on public.project_team_members for all to authenticated
  using (public.has_role('{owner,manager}')) with check (public.has_role('{owner,manager}'));

create policy tasks_select on public.project_tasks for select to authenticated using (public.is_staff());
create policy tasks_insert on public.project_tasks for insert to authenticated
  with check (
    public.has_role('{owner,manager}')
    or exists (select 1 from public.project_team_members ptm
               where ptm.project_id = project_tasks.project_id and ptm.team_member_id = public.current_team_member_id())
  );
create policy tasks_update on public.project_tasks for update to authenticated
  using (
    public.has_role('{owner,manager}')
    or exists (select 1 from public.project_team_members ptm
               where ptm.project_id = project_tasks.project_id and ptm.team_member_id = public.current_team_member_id())
  )
  with check (
    public.has_role('{owner,manager}')
    or exists (select 1 from public.project_team_members ptm
               where ptm.project_id = project_tasks.project_id and ptm.team_member_id = public.current_team_member_id())
  );
create policy tasks_delete on public.project_tasks for delete to authenticated using (public.has_role('{owner,manager}'));

-- bookings
create policy bookings_select on public.bookings for select to authenticated using (public.is_staff());
create policy bookings_write on public.bookings for all to authenticated
  using (public.has_role('{owner,manager}')) with check (public.has_role('{owner,manager}'));
create policy crew_select on public.booking_crew for select to authenticated using (public.is_staff());
create policy crew_write on public.booking_crew for all to authenticated
  using (public.has_role('{owner,manager}')) with check (public.has_role('{owner,manager}'));

-- portfolio + testimonials (public read of published/approved)
create policy portfolio_public on public.portfolio_items for select to anon using (is_published);
create policy portfolio_select on public.portfolio_items for select to authenticated using (is_published or public.is_staff());
create policy portfolio_write on public.portfolio_items for all to authenticated
  using (public.has_role('{owner,manager,editor}')) with check (public.has_role('{owner,manager,editor}'));

create policy testimonials_public on public.testimonials for select to anon using (status = 'approved');
create policy testimonials_select on public.testimonials for select to authenticated using (status = 'approved' or public.is_staff());
create policy testimonials_write on public.testimonials for all to authenticated
  using (public.has_role('{owner,manager,editor}')) with check (public.has_role('{owner,manager,editor}'));

-- content calendar
create policy content_select on public.content_calendar for select to authenticated using (public.is_staff());
create policy content_write on public.content_calendar for all to authenticated
  using (public.has_role('{owner,manager,editor}')) with check (public.has_role('{owner,manager,editor}'));

-- finance
create policy invoices_select on public.invoices for select to authenticated using (public.has_role('{owner,manager,accounts}'));
create policy invoices_write on public.invoices for all to authenticated
  using (public.has_role('{owner,accounts}')) with check (public.has_role('{owner,accounts}'));
create policy invoice_items_select on public.invoice_items for select to authenticated using (public.has_role('{owner,manager,accounts}'));
create policy invoice_items_write on public.invoice_items for all to authenticated
  using (public.has_role('{owner,accounts}')) with check (public.has_role('{owner,accounts}'));
create policy payments_select on public.payments for select to authenticated using (public.has_role('{owner,manager,accounts}'));
create policy payments_write on public.payments for all to authenticated
  using (public.has_role('{owner,accounts}')) with check (public.has_role('{owner,accounts}'));
create policy expenses_select on public.expenses for select to authenticated using (public.has_role('{owner,manager,accounts}'));
create policy expenses_write on public.expenses for all to authenticated
  using (public.has_role('{owner,accounts}')) with check (public.has_role('{owner,accounts}'));

-- notifications: personal ones, plus broadcast (recipient null) for owners/managers
create policy notifications_select on public.notifications for select to authenticated
  using (recipient_id = auth.uid() or (recipient_id is null and public.has_role('{owner,manager}')));
create policy notifications_update on public.notifications for update to authenticated
  using (recipient_id = auth.uid() or (recipient_id is null and public.has_role('{owner,manager}')))
  with check (recipient_id = auth.uid() or (recipient_id is null and public.has_role('{owner,manager}')));
create policy notifications_delete on public.notifications for delete to authenticated
  using (recipient_id = auth.uid() or (recipient_id is null and public.has_role('{owner,manager}')));

-- activity log: read-only, written by triggers
create policy activity_select on public.activity_logs for select to authenticated using (public.has_role('{owner,manager}'));

-- settings
create policy settings_select on public.studio_settings for select to authenticated using (public.is_staff());
create policy settings_update on public.studio_settings for update to authenticated
  using (public.has_role('{owner}')) with check (public.has_role('{owner}'));
