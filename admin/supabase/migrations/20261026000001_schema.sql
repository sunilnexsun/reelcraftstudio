-- ReelCraft Studio — core schema
-- Money is numeric(12,2) in INR. All timestamps are timestamptz (display in Asia/Kolkata).

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- ───────────────────────── Enums ─────────────────────────
create type public.app_role as enum ('owner', 'manager', 'editor', 'videographer', 'accounts');
create type public.enquiry_status as enum ('new', 'contacted', 'follow_up', 'proposal_sent', 'converted', 'lost');
create type public.lead_source as enum ('website', 'instagram', 'whatsapp', 'referral', 'google', 'walk_in', 'phone', 'other');
create type public.project_status as enum (
  'enquiry_received', 'planning', 'script_concept', 'shoot_scheduled', 'shooting',
  'editing', 'client_review', 'revisions', 'approved', 'delivered', 'on_hold', 'cancelled'
);
create type public.priority_level as enum ('low', 'medium', 'high', 'urgent');
create type public.approval_status as enum ('pending', 'approved', 'changes_requested');
create type public.booking_status as enum ('requested', 'confirmed', 'completed', 'cancelled');
create type public.advance_status as enum ('not_required', 'pending', 'partial', 'paid');
create type public.pricing_model as enum ('fixed', 'starting_from', 'per_hour', 'per_day', 'custom_quote');
create type public.content_platform as enum ('instagram', 'facebook', 'youtube', 'linkedin', 'x', 'website', 'other');
create type public.content_format as enum ('reel', 'post', 'carousel', 'story', 'video', 'short', 'blog', 'other');
create type public.content_status as enum ('idea', 'draft', 'in_review', 'approved', 'scheduled', 'published');
create type public.invoice_status as enum ('draft', 'sent', 'partially_paid', 'paid', 'overdue', 'void');
create type public.discount_type as enum ('flat', 'percent');
create type public.payment_method as enum ('upi', 'bank_transfer', 'cash', 'card', 'cheque', 'other');
create type public.testimonial_status as enum ('pending', 'approved', 'rejected');
create type public.availability_status as enum ('available', 'busy', 'on_leave');

-- updated_at helper
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Human-friendly codes
create sequence public.enquiry_code_seq;
create sequence public.project_code_seq;
create sequence public.booking_code_seq;

-- ───────────────────────── Identity ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  avatar_url text,
  role public.app_role,                 -- null until an owner assigns a role
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  full_name text not null check (length(trim(full_name)) between 2 and 120),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text,
  role public.app_role not null default 'editor',
  designation text,
  skills text[] not null default '{}',
  availability public.availability_status not null default 'available',
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────────────── CRM ─────────────────────────
create table public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  thumbnail_url text,
  pricing_model public.pricing_model not null default 'starting_from',
  starting_price numeric(12,2) check (starting_price is null or starting_price >= 0),
  delivery_estimate text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  business_name text,
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text,
  whatsapp text,
  client_type text not null default 'business' check (client_type in ('individual', 'business', 'agency', 'institution')),
  address text,
  city text,
  gstin text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('ENQ-' || lpad(nextval('public.enquiry_code_seq')::text, 4, '0')),
  client_name text not null check (length(trim(client_name)) between 2 and 120),
  business_name text,
  phone text check (phone is null or phone ~ '^[0-9+\-\s()]{7,20}$'),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  service_id uuid references public.services (id) on delete set null,
  service_label text,
  budget numeric(12,2) check (budget is null or budget >= 0),
  lead_source public.lead_source not null default 'website',
  enquiry_date date not null default (now() at time zone 'Asia/Kolkata')::date,
  follow_up_date date,
  assigned_to uuid references public.team_members (id) on delete set null,
  notes text,
  status public.enquiry_status not null default 'new',
  client_id uuid references public.clients (id) on delete set null,
  project_id uuid,  -- FK added after projects
  submitted_via text not null default 'admin' check (submitted_via in ('admin', 'website')),
  submission_fingerprint text,  -- dedupe key for website submissions
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enquiries_contact_required check (phone is not null or email is not null)
);

create table public.enquiry_followups (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.enquiries (id) on delete cascade,
  note text not null check (length(trim(note)) between 1 and 4000),
  channel text not null default 'call' check (channel in ('call', 'whatsapp', 'email', 'meeting', 'other')),
  next_follow_up date,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────────────── Projects ─────────────────────────
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('PRJ-' || lpad(nextval('public.project_code_seq')::text, 4, '0')),
  name text not null check (length(trim(name)) between 2 and 160),
  client_id uuid references public.clients (id) on delete set null,
  service_id uuid references public.services (id) on delete set null,
  service_label text,
  description text,
  start_date date,
  delivery_date date,
  priority public.priority_level not null default 'medium',
  status public.project_status not null default 'enquiry_received',
  approval_status public.approval_status not null default 'pending',
  revision_count integer not null default 0 check (revision_count >= 0),
  internal_notes text,
  enquiry_id uuid references public.enquiries (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_dates_ok check (delivery_date is null or start_date is null or delivery_date >= start_date)
);

alter table public.enquiries
  add constraint enquiries_project_fk foreign key (project_id) references public.projects (id) on delete set null;

-- Financial fields live in their own table so Row Level Security can hide them
-- from editors and videographers while the project itself stays visible.
create table public.project_financials (
  project_id uuid primary key references public.projects (id) on delete cascade,
  budget numeric(12,2) not null default 0 check (budget >= 0),
  advance_paid numeric(12,2) not null default 0,      -- maintained from payments (is_advance)
  amount_received numeric(12,2) not null default 0,   -- maintained from payments
  amount_due numeric(12,2) generated always as (greatest(budget - amount_received, 0)) stored,
  updated_at timestamptz not null default now()
);

create table public.project_team_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  team_member_id uuid not null references public.team_members (id) on delete cascade,
  role_on_project text,
  created_at timestamptz not null default now(),
  primary key (project_id, team_member_id)
);

create table public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  kind text not null default 'deliverable' check (kind in ('deliverable', 'task', 'revision')),
  is_done boolean not null default false,
  due_date date,
  assigned_to uuid references public.team_members (id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────────────── Bookings ─────────────────────────
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('BK-' || lpad(nextval('public.booking_code_seq')::text, 4, '0')),
  title text not null check (length(trim(title)) between 2 and 160),
  client_id uuid references public.clients (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  contact_name text,     -- for website booking requests before a client exists
  contact_phone text,
  contact_email text,
  shoot_type text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  location text,
  equipment text[] not null default '{}',
  status public.booking_status not null default 'requested',
  advance_status public.advance_status not null default 'pending',
  internal_notes text,
  submitted_via text not null default 'admin' check (submitted_via in ('admin', 'website')),
  submission_fingerprint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_time_ok check (end_at > start_at)
);

create table public.booking_crew (
  booking_id uuid not null references public.bookings (id) on delete cascade,
  team_member_id uuid not null references public.team_members (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (booking_id, team_member_id)
);

-- ───────────────────────── Website content ─────────────────────────
create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 2 and 160),
  description text,
  category text not null default 'Brand Film',
  client_name text,
  service_id uuid references public.services (id) on delete set null,
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  video_url text check (video_url is null or video_url ~* '^https://'),
  video_provider text check (video_provider in ('youtube', 'vimeo', 'upload', 'other')),
  thumbnail_url text,
  media_url text,
  is_featured boolean not null default false,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  client_name text not null check (length(trim(client_name)) between 2 and 120),
  company text,
  avatar_url text,
  content text not null check (length(trim(content)) between 10 and 2000),
  rating smallint not null default 5 check (rating between 1 and 5),
  status public.testimonial_status not null default 'pending',
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  client_id uuid references public.clients (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_calendar (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 2 and 160),
  platform public.content_platform not null default 'instagram',
  format public.content_format not null default 'reel',
  caption text,
  hashtags text[] not null default '{}',
  scheduled_at timestamptz,
  assigned_to uuid references public.team_members (id) on delete set null,
  status public.content_status not null default 'idea',
  project_id uuid references public.projects (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────────────── Finance ─────────────────────────
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  client_id uuid not null references public.clients (id) on delete restrict,
  project_id uuid references public.projects (id) on delete set null,
  issue_date date not null default (now() at time zone 'Asia/Kolkata')::date,
  due_date date,
  status public.invoice_status not null default 'draft',
  discount_type public.discount_type not null default 'flat',
  discount_value numeric(12,2) not null default 0 check (discount_value >= 0),
  tax_label text not null default 'GST',
  tax_rate numeric(5,2) not null default 18 check (tax_rate between 0 and 100),
  -- maintained by trigger from invoice_items and payments
  subtotal numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  balance_due numeric(12,2) not null default 0,
  notes text,
  terms text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_due_ok check (due_date is null or due_date >= issue_date),
  constraint invoices_percent_ok check (discount_type <> 'percent' or discount_value <= 100)
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  description text not null check (length(trim(description)) between 1 and 500),
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  amount numeric(12,2) generated always as (round(quantity * unit_price, 2)) stored,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete set null,
  invoice_id uuid references public.invoices (id) on delete restrict,
  project_id uuid references public.projects (id) on delete restrict,  -- money received keeps its project
  amount numeric(12,2) not null check (amount > 0),
  paid_on date not null default (now() at time zone 'Asia/Kolkata')::date,
  method public.payment_method not null default 'upi',
  reference text,
  is_advance boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_linked check (invoice_id is not null or project_id is not null)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'Equipment' check (length(trim(category)) between 2 and 60),
  description text not null check (length(trim(description)) between 2 and 500),
  amount numeric(12,2) not null check (amount > 0),
  spent_on date not null default (now() at time zone 'Asia/Kolkata')::date,
  vendor text,
  project_id uuid references public.projects (id) on delete set null,
  payment_method public.payment_method not null default 'upi',
  receipt_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────────────── System ─────────────────────────
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.profiles (id) on delete cascade, -- null = all owners/managers
  title text not null,
  body text,
  kind text not null default 'info',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null check (action in ('created', 'updated', 'deleted', 'status_changed', 'converted', 'submitted')),
  summary text,
  created_at timestamptz not null default now()
);

create table public.studio_settings (
  id smallint primary key default 1 check (id = 1),
  studio_name text not null default 'ReelCraft Studio',
  email text,
  phone text,
  whatsapp text,
  address text,
  website text,
  logo_url text,
  primary_color text not null default '#0A0A0A' check (primary_color ~* '^#[0-9a-f]{6}$'),
  accent_color text not null default '#FF1744' check (accent_color ~* '^#[0-9a-f]{6}$'),
  currency text not null default 'INR',
  timezone text not null default 'Asia/Kolkata',
  invoice_prefix text not null default 'RC-' check (length(invoice_prefix) between 1 and 12),
  next_invoice_number integer not null default 1 check (next_invoice_number > 0),
  default_tax_rate numeric(5,2) not null default 18 check (default_tax_rate between 0 and 100),
  tax_label text not null default 'GST',
  gstin text,
  invoice_terms text default 'Payment due within 15 days. 50% advance required to confirm shoot dates.',
  notification_prefs jsonb not null default '{"new_enquiry": true, "booking_request": true, "payment_received": true, "invoice_overdue": true}',
  session_timeout_minutes integer not null default 480 check (session_timeout_minutes between 15 and 10080),
  updated_at timestamptz not null default now()
);
insert into public.studio_settings (id) values (1);

-- ───────────────────────── Indexes ─────────────────────────
create index enquiries_status_idx on public.enquiries (status);
create index enquiries_date_idx on public.enquiries (enquiry_date desc);
create index enquiries_followup_idx on public.enquiries (follow_up_date) where status not in ('converted', 'lost');
create index enquiries_assigned_idx on public.enquiries (assigned_to);
create index enquiries_client_idx on public.enquiries (client_id);
create index enquiries_fingerprint_idx on public.enquiries (submission_fingerprint, created_at desc);
create index enquiry_followups_enquiry_idx on public.enquiry_followups (enquiry_id, created_at desc);
create index clients_name_idx on public.clients (lower(name));
create index projects_client_idx on public.projects (client_id);
create index projects_status_idx on public.projects (status);
create index projects_delivery_idx on public.projects (delivery_date);
create index project_team_member_idx on public.project_team_members (team_member_id);
create index project_tasks_project_idx on public.project_tasks (project_id, sort_order);
create index bookings_time_idx on public.bookings (start_at, end_at);
create index bookings_client_idx on public.bookings (client_id);
create index bookings_project_idx on public.bookings (project_id);
create index bookings_fingerprint_idx on public.bookings (submission_fingerprint, created_at desc);
create index booking_crew_member_idx on public.booking_crew (team_member_id);
create index portfolio_public_idx on public.portfolio_items (is_published, sort_order);
create index testimonials_public_idx on public.testimonials (status, sort_order);
create index content_calendar_sched_idx on public.content_calendar (scheduled_at);
create index invoices_client_idx on public.invoices (client_id);
create index invoices_project_idx on public.invoices (project_id);
create index invoices_status_idx on public.invoices (status, due_date);
create index invoice_items_invoice_idx on public.invoice_items (invoice_id, sort_order);
create index payments_invoice_idx on public.payments (invoice_id);
create index payments_project_idx on public.payments (project_id);
create index payments_client_idx on public.payments (client_id);
create index payments_date_idx on public.payments (paid_on);
create index expenses_date_idx on public.expenses (spent_on);
create index expenses_project_idx on public.expenses (project_id);
create index notifications_recipient_idx on public.notifications (recipient_id, read_at, created_at desc);
create index activity_logs_entity_idx on public.activity_logs (entity_type, entity_id);
create index activity_logs_created_idx on public.activity_logs (created_at desc);
create index team_members_profile_idx on public.team_members (profile_id);

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','team_members','services','clients','enquiries','enquiry_followups','projects',
    'project_financials','project_tasks','bookings','portfolio_items','testimonials','content_calendar',
    'invoices','invoice_items','payments','expenses','notifications','studio_settings'
  ] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated_at', t);
  end loop;
end $$;
