-- ReelCraft Studio — storage buckets and the public website API

-- ───────────────────────── Storage ─────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('portfolio', 'portfolio', true, 52428800, array['image/jpeg','image/png','image/webp','image/avif','video/mp4','video/webm','video/quicktime']),
  ('branding',  'branding',  true, 5242880,  array['image/jpeg','image/png','image/webp','image/svg+xml']),
  ('avatars',   'avatars',   true, 2097152,  array['image/jpeg','image/png','image/webp']),
  ('receipts',  'receipts',  false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set
  public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Public buckets serve files by URL without a select policy; writes are role-restricted.
create policy "portfolio write" on storage.objects for insert to authenticated
  with check (bucket_id = 'portfolio' and public.has_role('{owner,manager,editor}'));
create policy "portfolio update" on storage.objects for update to authenticated
  using (bucket_id = 'portfolio' and public.has_role('{owner,manager,editor}'));
create policy "portfolio delete" on storage.objects for delete to authenticated
  using (bucket_id = 'portfolio' and public.has_role('{owner,manager,editor}'));

create policy "branding write" on storage.objects for insert to authenticated
  with check (bucket_id = 'branding' and public.has_role('{owner}'));
create policy "branding update" on storage.objects for update to authenticated
  using (bucket_id = 'branding' and public.has_role('{owner}'));
create policy "branding delete" on storage.objects for delete to authenticated
  using (bucket_id = 'branding' and public.has_role('{owner}'));

-- avatars: anyone on staff may manage files under a folder named after their user id; owners/managers manage all
create policy "avatars write" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and public.is_staff()
              and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role('{owner,manager,editor}')));
create policy "avatars update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role('{owner,manager,editor}')));
create policy "avatars delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role('{owner,manager,editor}')));

-- receipts are private finance documents
create policy "receipts read" on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and public.has_role('{owner,manager,accounts}'));
create policy "receipts write" on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and public.has_role('{owner,accounts}'));
create policy "receipts delete" on storage.objects for delete to authenticated
  using (bucket_id = 'receipts' and public.has_role('{owner,accounts}'));

-- ───────────────────────── Public website API ─────────────────────────
-- Anonymous visitors never touch tables directly. They call these functions, which validate
-- input, drop bot submissions, rate-limit by IP and de-duplicate repeat submissions.

create table public.public_submission_log (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  kind text not null,
  created_at timestamptz not null default now()
);
create index public_submission_log_idx on public.public_submission_log (ip_hash, created_at desc);
alter table public.public_submission_log enable row level security; -- no policies: definer functions only

create or replace function public._client_ip_hash() returns text
language plpgsql stable set search_path = public, extensions as $$
declare h json; ip text;
begin
  begin
    h := current_setting('request.headers', true)::json;
  exception when others then h := null;
  end;
  ip := coalesce(split_part(h ->> 'x-forwarded-for', ',', 1), h ->> 'x-real-ip', 'unknown');
  return encode(digest(trim(ip) || ':reelcraft', 'sha256'), 'hex');
end $$;

create or replace function public._rate_limit(p_kind text) returns void
language plpgsql security definer set search_path = public as $$
declare v_ip text := public._client_ip_hash();
begin
  if (select count(*) from public.public_submission_log
       where ip_hash = v_ip and kind = p_kind and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many submissions. Please try again later or contact us on WhatsApp.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.public_submission_log where created_at > now() - interval '1 minute') >= 30 then
    raise exception 'We are receiving a lot of requests right now. Please try again in a minute.' using errcode = 'P0001';
  end if;
  insert into public.public_submission_log (ip_hash, kind) values (v_ip, p_kind);
  delete from public.public_submission_log where created_at < now() - interval '2 days';
end $$;

create or replace function public._validate_contact(p_name text, p_phone text, p_email text) returns void
language plpgsql immutable as $$
begin
  if p_name is null or length(trim(p_name)) not between 2 and 120 then
    raise exception 'Please enter your name.' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_phone), '') = '' and coalesce(trim(p_email), '') = '' then
    raise exception 'Please enter a phone number or email.' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_phone), '') <> '' and trim(p_phone) !~ '^[0-9+\-\s()]{7,20}$' then
    raise exception 'Please enter a valid phone number.' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_email), '') <> '' and trim(p_email) !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Please enter a valid email address.' using errcode = 'P0001';
  end if;
end $$;

create or replace function public.submit_enquiry(
  p_name text, p_phone text default null, p_email text default null, p_business text default null,
  p_service_slug text default null, p_budget numeric default null, p_message text default null,
  p_website text default null  -- honeypot: real visitors leave this empty
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_service public.services; v_fp text; v_existing uuid; v_id uuid; v_code text;
begin
  if coalesce(p_website, '') <> '' then
    return jsonb_build_object('ok', true); -- silently drop bots
  end if;
  perform public._validate_contact(p_name, p_phone, p_email);
  if length(coalesce(p_message, '')) > 2000 or length(coalesce(p_business, '')) > 120 then
    raise exception 'Your message is too long.' using errcode = 'P0001';
  end if;
  if p_budget is not null and (p_budget < 0 or p_budget > 100000000) then
    raise exception 'Please enter a valid budget.' using errcode = 'P0001';
  end if;

  select * into v_service from public.services where slug = p_service_slug and is_active;

  v_fp := encode(digest(lower(coalesce(trim(p_email), '')) || '|' || regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
                        || '|' || coalesce(p_service_slug, '') || '|' || left(coalesce(p_message, ''), 200), 'sha256'), 'hex');
  select id into v_existing from public.enquiries
   where submission_fingerprint = v_fp and created_at > now() - interval '24 hours' limit 1;
  if v_existing is not null then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;

  perform public._rate_limit('enquiry');

  insert into public.enquiries (client_name, business_name, phone, email, service_id, service_label, budget,
                                lead_source, notes, submitted_via, submission_fingerprint)
  values (trim(p_name), nullif(trim(p_business), ''), nullif(trim(p_phone), ''), nullif(lower(trim(p_email)), ''),
          v_service.id, coalesce(v_service.title, nullif(trim(p_service_slug), '')), p_budget,
          'website', nullif(trim(p_message), ''), 'website', v_fp)
  returning id, code into v_id, v_code;

  insert into public.notifications (recipient_id, title, body, kind, link)
  values (null, 'New website enquiry', trim(p_name) || coalesce(' — ' || v_service.title, ''), 'enquiry', '/enquiries?open=' || v_id);
  insert into public.activity_logs (entity_type, entity_id, action, summary)
  values ('enquiries', v_id, 'submitted', v_code || ' received from website');

  return jsonb_build_object('ok', true, 'duplicate', false);
end $$;

create or replace function public.submit_booking_request(
  p_name text, p_phone text, p_email text default null, p_shoot_type text default null,
  p_preferred_start timestamptz default null, p_duration_hours numeric default 2,
  p_location text default null, p_message text default null, p_website text default null
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_fp text; v_id uuid; v_code text;
begin
  if coalesce(p_website, '') <> '' then
    return jsonb_build_object('ok', true);
  end if;
  perform public._validate_contact(p_name, p_phone, p_email);
  if p_preferred_start is null or p_preferred_start < now() or p_preferred_start > now() + interval '18 months' then
    raise exception 'Please choose a shoot date in the future.' using errcode = 'P0001';
  end if;
  if p_duration_hours is null or p_duration_hours < 0.5 or p_duration_hours > 14 then
    raise exception 'Shoot duration must be between 30 minutes and 14 hours.' using errcode = 'P0001';
  end if;
  if length(coalesce(p_message, '')) > 2000 or length(coalesce(p_location, '')) > 300 then
    raise exception 'Your message is too long.' using errcode = 'P0001';
  end if;

  v_fp := encode(digest(lower(coalesce(trim(p_email), '')) || '|' || regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
                        || '|' || p_preferred_start::text, 'sha256'), 'hex');
  if exists (select 1 from public.bookings where submission_fingerprint = v_fp and created_at > now() - interval '24 hours') then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;

  perform public._rate_limit('booking');

  insert into public.bookings (title, contact_name, contact_phone, contact_email, shoot_type, start_at, end_at,
                               location, status, internal_notes, submitted_via, submission_fingerprint)
  values ('Shoot request — ' || trim(p_name), trim(p_name), nullif(trim(p_phone), ''), nullif(lower(trim(p_email)), ''),
          nullif(trim(p_shoot_type), ''), p_preferred_start, p_preferred_start + make_interval(mins => (p_duration_hours * 60)::int),
          nullif(trim(p_location), ''), 'requested', nullif(trim(p_message), ''), 'website', v_fp)
  returning id, code into v_id, v_code;

  insert into public.notifications (recipient_id, title, body, kind, link)
  values (null, 'New booking request', trim(p_name) || ' — ' || to_char(p_preferred_start at time zone 'Asia/Kolkata', 'DD Mon YYYY, HH12:MI AM'),
          'booking', '/bookings?open=' || v_id);
  insert into public.activity_logs (entity_type, entity_id, action, summary)
  values ('bookings', v_id, 'submitted', v_code || ' requested from website');

  return jsonb_build_object('ok', true, 'duplicate', false);
end $$;

create or replace function public.get_public_studio_info() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('studio_name', studio_name, 'email', email, 'phone', phone, 'whatsapp', whatsapp,
                            'address', address, 'logo_url', logo_url, 'accent_color', accent_color)
    from public.studio_settings where id = 1
$$;

revoke execute on function public._client_ip_hash(), public._rate_limit(text), public._validate_contact(text, text, text) from public, anon, authenticated;
grant execute on function
  public.submit_enquiry(text, text, text, text, text, numeric, text, text),
  public.submit_booking_request(text, text, text, text, timestamptz, numeric, text, text, text),
  public.get_public_studio_info()
to anon, authenticated;
