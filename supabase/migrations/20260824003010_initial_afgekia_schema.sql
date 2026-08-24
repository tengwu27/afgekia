create schema if not exists private;
revoke all on schema private from public, anon;

create type public.app_role as enum ('owner', 'admin', 'client');
create type public.account_state as enum ('active', 'suspended');
create type public.project_status as enum ('planning', 'active', 'on_hold', 'completed', 'archived');
create type public.milestone_status as enum ('not_started', 'active', 'blocked', 'done');
create type public.update_audience as enum ('staff', 'client');
create type public.booking_status as enum ('submitted', 'confirmed', 'reschedule_proposed', 'declined', 'cancelled', 'completed');
create type public.publish_state as enum ('draft', 'published', 'archived');
create type public.portfolio_accent as enum ('olive', 'terracotta', 'gold', 'plum');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique check (email = lower(email) and char_length(email) <= 320),
  full_name text not null check (char_length(full_name) between 1 and 120),
  role public.app_role not null default 'client',
  state public.account_state not null default 'active',
  must_change_password boolean not null default true,
  timezone text not null default 'America/Los_Angeles' check (char_length(timezone) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.site_settings (
  singleton boolean primary key default true check (singleton),
  business_name text not null default 'Afgekia' check (char_length(business_name) between 1 and 80),
  tagline text not null check (char_length(tagline) between 1 and 180),
  description text not null check (char_length(description) between 1 and 1200),
  contact_email text not null check (char_length(contact_email) <= 320),
  phone text check (phone is null or char_length(phone) <= 40),
  address text check (address is null or char_length(address) <= 240),
  timezone text not null default 'America/Los_Angeles' check (char_length(timezone) between 1 and 80),
  instagram_url text check (instagram_url is null or char_length(instagram_url) <= 500),
  linkedin_url text check (linkedin_url is null or char_length(linkedin_url) <= 500),
  booking_lead_hours integer not null default 24 check (booking_lead_hours between 0 and 720),
  booking_horizon_days integer not null default 90 check (booking_horizon_days between 1 and 730),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.site_settings (singleton, business_name, tagline, description, contact_email, timezone)
values (true, 'Afgekia', 'Thoughtful support for work that matters.', 'Calm project support, practical business assistance, and clear communication for work that matters.', 'hello@afgekia.example', 'America/Los_Angeles');

create table public.booking_services (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null check (char_length(description) between 1 and 800),
  duration_minutes integer not null check (duration_minutes between 15 and 480),
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique check (reference_code ~ '^AF-[A-HJ-NP-Z2-9]{8}$'),
  service_id uuid not null references public.booking_services (id) on delete restrict,
  client_user_id uuid references public.profiles (id) on delete set null,
  full_name text not null check (char_length(full_name) between 1 and 120),
  email text not null check (email = lower(email) and char_length(email) <= 320),
  phone text check (phone is null or char_length(phone) <= 40),
  timezone text not null check (char_length(timezone) between 1 and 80),
  preferred_at timestamptz not null,
  alternate_at timestamptz,
  message text not null check (char_length(message) between 20 and 3000),
  privacy_consent_at timestamptz not null,
  status public.booking_status not null default 'submitted',
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (alternate_at is null or alternate_at <> preferred_at)
);

create table public.booking_request_admin (
  booking_id uuid primary key references public.booking_requests (id) on delete cascade,
  notes text not null default '' check (char_length(notes) <= 3000),
  created_by uuid not null references public.profiles (id) on delete restrict,
  updated_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique check (reference_code ~ '^PRJ-[A-HJ-NP-Z2-9]{6}$'),
  title text not null check (char_length(title) between 1 and 160),
  summary text not null check (char_length(summary) between 1 and 600),
  description text not null default '' check (char_length(description) <= 12000),
  status public.project_status not null default 'planning',
  progress integer not null default 0 check (progress between 0 and 100),
  start_date date,
  target_date date,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (target_date is null or start_date is null or target_date >= start_date),
  check (status <> 'completed'::public.project_status or progress = 100),
  check (status <> 'planning'::public.project_status or progress < 100)
);

create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '' check (char_length(description) <= 3000),
  status public.milestone_status not null default 'not_started',
  due_date date,
  completed_at timestamptz,
  client_visible boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  body_json jsonb not null check (jsonb_typeof(body_json) = 'object'),
  body_text text not null check (char_length(body_text) between 1 and 12000),
  audience public.update_audience not null default 'client',
  status_snapshot public.project_status,
  progress_snapshot integer check (progress_snapshot is null or progress_snapshot between 0 and 100),
  occurred_at timestamptz not null default now(),
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  eyebrow text not null default 'Selected work' check (char_length(eyebrow) <= 80),
  title text not null check (char_length(title) between 1 and 180),
  summary text not null check (char_length(summary) between 1 and 600),
  body_json jsonb not null check (jsonb_typeof(body_json) = 'object'),
  body_text text not null check (char_length(body_text) between 1 and 20000),
  cover_path text check (cover_path is null or char_length(cover_path) <= 500),
  accent public.portfolio_accent not null default 'olive',
  status public.publish_state not null default 'draft',
  featured boolean not null default false,
  sort_order integer not null default 0,
  seo_title text check (seo_title is null or char_length(seo_title) <= 70),
  seo_description text check (seo_description is null or char_length(seo_description) <= 180),
  published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.portfolio_item_sources (
  portfolio_item_id uuid primary key references public.portfolio_items (id) on delete cascade,
  source_project_id uuid not null references public.projects (id) on delete restrict,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.portfolio_updates (
  id uuid primary key default gen_random_uuid(),
  portfolio_item_id uuid not null references public.portfolio_items (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  body_json jsonb not null check (jsonb_typeof(body_json) = 'object'),
  body_text text not null check (char_length(body_text) between 1 and 12000),
  progress integer check (progress is null or progress between 0 and 100),
  published_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.portfolio_update_sources (
  portfolio_update_id uuid primary key references public.portfolio_updates (id) on delete cascade,
  source_project_update_id uuid not null references public.project_updates (id) on delete restrict,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 180),
  excerpt text not null check (char_length(excerpt) between 1 and 400),
  body_json jsonb not null check (jsonb_typeof(body_json) = 'object'),
  body_text text not null check (char_length(body_text) between 1 and 30000),
  cover_path text check (cover_path is null or char_length(cover_path) <= 500),
  status public.publish_state not null default 'draft',
  featured boolean not null default false,
  seo_title text check (seo_title is null or char_length(seo_title) <= 70),
  seo_description text check (seo_description is null or char_length(seo_description) <= 180),
  published_at timestamptz,
  author_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'public-media' check (bucket = 'public-media'),
  path text not null unique check (char_length(path) between 1 and 500),
  alt_text text not null check (char_length(alt_text) between 1 and 240),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')),
  bytes integer not null check (bytes between 1 and 5242880),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated by default as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null check (char_length(action) between 1 and 120),
  entity_type text not null check (char_length(entity_type) between 1 and 80),
  entity_id text check (entity_id is null or char_length(entity_id) <= 120),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);

create index profiles_role_state_idx on public.profiles (role, state);
create index booking_services_active_order_idx on public.booking_services (active, display_order);
create index booking_requests_created_at_idx on public.booking_requests (created_at desc);
create index booking_requests_email_created_idx on public.booking_requests (email, created_at desc);
create index booking_requests_client_idx on public.booking_requests (client_user_id) where client_user_id is not null;
create index booking_requests_status_idx on public.booking_requests (status, created_at desc);
create index projects_status_idx on public.projects (status, updated_at desc);
create index project_members_user_idx on public.project_members (user_id, project_id);
create index milestones_project_position_idx on public.milestones (project_id, position);
create index project_updates_project_date_idx on public.project_updates (project_id, occurred_at desc);
create index portfolio_items_publish_idx on public.portfolio_items (status, published_at desc);
create index portfolio_updates_item_date_idx on public.portfolio_updates (portfolio_item_id, published_at desc);
create index articles_publish_idx on public.articles (status, published_at desc);
create index audit_events_actor_date_idx on public.audit_events (actor_id, created_at desc);
create index audit_events_entity_idx on public.audit_events (entity_type, entity_id, created_at desc);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.enforce_project_transition()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if new.status = old.status then return new; end if;
  if not (
    (old.status = 'planning'::public.project_status and new.status in ('active'::public.project_status, 'on_hold'::public.project_status, 'archived'::public.project_status))
    or (old.status = 'active'::public.project_status and new.status in ('on_hold'::public.project_status, 'completed'::public.project_status, 'archived'::public.project_status))
    or (old.status = 'on_hold'::public.project_status and new.status in ('active'::public.project_status, 'archived'::public.project_status))
    or (old.status = 'completed'::public.project_status and new.status in ('active'::public.project_status, 'archived'::public.project_status))
    or (old.status = 'archived'::public.project_status and new.status in ('planning'::public.project_status, 'active'::public.project_status))
  ) then
    raise exception 'invalid project status transition from % to %', old.status, new.status using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function private.enforce_booking_transition()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if new.status = old.status then return new; end if;
  if not (
    (old.status = 'submitted'::public.booking_status and new.status in ('confirmed'::public.booking_status, 'reschedule_proposed'::public.booking_status, 'declined'::public.booking_status, 'cancelled'::public.booking_status))
    or (old.status = 'confirmed'::public.booking_status and new.status in ('reschedule_proposed'::public.booking_status, 'cancelled'::public.booking_status, 'completed'::public.booking_status))
    or (old.status = 'reschedule_proposed'::public.booking_status and new.status in ('confirmed'::public.booking_status, 'declined'::public.booking_status, 'cancelled'::public.booking_status))
  ) then
    raise exception 'invalid booking status transition from % to %', old.status, new.status using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and state = 'active'::public.account_state
  );
$$;

create or replace function private.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select role from public.profiles
  where id = (select auth.uid()) and state = 'active'::public.account_state;
$$;

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select coalesce((select private.current_user_role()) in ('owner'::public.app_role, 'admin'::public.app_role), false);
$$;

create or replace function private.is_owner()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select coalesce((select private.current_user_role()) = 'owner'::public.app_role, false);
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  requested_role public.app_role;
begin
  requested_role := case new.raw_app_meta_data ->> 'role'
    when 'owner' then 'owner'::public.app_role
    when 'admin' then 'admin'::public.app_role
    else 'client'::public.app_role
  end;

  insert into public.profiles (id, email, full_name, role, must_change_password)
  values (
    new.id,
    lower(new.email),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    requested_role,
    coalesce((new.raw_app_meta_data ->> 'must_change_password')::boolean, true)
  );
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.enforce_project_transition() from public, anon, authenticated;
revoke all on function private.enforce_booking_transition() from public, anon, authenticated;
revoke all on function private.is_active_user() from public, anon;
revoke all on function private.current_user_role() from public, anon;
revoke all on function private.is_staff() from public, anon;
revoke all on function private.is_owner() from public, anon;
revoke all on function private.handle_new_user() from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_active_user() to authenticated;
grant execute on function private.current_user_role() to authenticated;
grant execute on function private.is_staff() to authenticated;
grant execute on function private.is_owner() to authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create trigger profiles_set_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create trigger site_settings_set_updated_at before update on public.site_settings for each row execute function private.set_updated_at();
create trigger booking_services_set_updated_at before update on public.booking_services for each row execute function private.set_updated_at();
create trigger booking_requests_set_updated_at before update on public.booking_requests for each row execute function private.set_updated_at();
create trigger booking_requests_validate_transition before update of status on public.booking_requests for each row execute function private.enforce_booking_transition();
create trigger booking_request_admin_set_updated_at before update on public.booking_request_admin for each row execute function private.set_updated_at();
create trigger projects_set_updated_at before update on public.projects for each row execute function private.set_updated_at();
create trigger projects_validate_transition before update of status on public.projects for each row execute function private.enforce_project_transition();
create trigger milestones_set_updated_at before update on public.milestones for each row execute function private.set_updated_at();
create trigger project_updates_set_updated_at before update on public.project_updates for each row execute function private.set_updated_at();
create trigger portfolio_items_set_updated_at before update on public.portfolio_items for each row execute function private.set_updated_at();
create trigger portfolio_updates_set_updated_at before update on public.portfolio_updates for each row execute function private.set_updated_at();
create trigger articles_set_updated_at before update on public.articles for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;
alter table public.site_settings enable row level security;
alter table public.booking_services enable row level security;
alter table public.booking_requests enable row level security;
alter table public.booking_request_admin enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.milestones enable row level security;
alter table public.project_updates enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.portfolio_item_sources enable row level security;
alter table public.portfolio_updates enable row level security;
alter table public.portfolio_update_sources enable row level security;
alter table public.articles enable row level security;
alter table public.media_assets enable row level security;
alter table public.audit_events enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
grant usage on schema public to anon, authenticated;

grant select on public.site_settings, public.booking_services, public.portfolio_items, public.portfolio_updates, public.articles to anon, authenticated;
grant select on public.profiles, public.booking_requests, public.projects, public.project_members, public.milestones, public.project_updates, public.portfolio_item_sources, public.portfolio_update_sources, public.media_assets, public.audit_events to authenticated;
grant select, insert, update, delete on public.booking_request_admin to authenticated;
grant insert, update, delete on public.booking_services, public.projects, public.project_members, public.milestones, public.project_updates, public.portfolio_items, public.portfolio_item_sources, public.portfolio_updates, public.portfolio_update_sources, public.articles, public.media_assets to authenticated;
grant update on public.site_settings, public.booking_requests to authenticated;
grant insert on public.audit_events to authenticated;
grant usage, select on sequence public.audit_events_id_seq to authenticated;

create policy "Public can read site settings"
on public.site_settings for select
to anon, authenticated
using (true);

create policy "Staff can update site settings"
on public.site_settings for update
to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

create policy "Public can read active services"
on public.booking_services for select
to anon, authenticated
using (active);

create policy "Staff can manage services"
on public.booking_services for all
to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

create policy "Users can read allowed profiles"
on public.profiles for select
to authenticated
using (
  ((select private.is_active_user()) and id = (select auth.uid()))
  or (select private.is_staff())
);

create policy "Staff can read booking requests and clients can read linked requests"
on public.booking_requests for select
to authenticated
using (
  (select private.is_staff())
  or ((select private.is_active_user()) and client_user_id = (select auth.uid()))
);

create policy "Staff can update booking requests"
on public.booking_requests for update
to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

create policy "Staff can manage booking administration"
on public.booking_request_admin for all
to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

create policy "Staff can manage projects"
on public.projects for all
to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

create policy "Clients can read assigned projects"
on public.projects for select
to authenticated
using (
  (select private.is_active_user())
  and exists (
    select 1 from public.project_members
    where project_members.project_id = projects.id
      and project_members.user_id = (select auth.uid())
  )
);

create policy "Staff can manage project members"
on public.project_members for all
to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

create policy "Clients can read their own project memberships"
on public.project_members for select
to authenticated
using ((select private.is_active_user()) and user_id = (select auth.uid()));

create policy "Staff can manage milestones"
on public.milestones for all
to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

create policy "Clients can read visible milestones"
on public.milestones for select
to authenticated
using (
  (select private.is_active_user())
  and client_visible
  and exists (
    select 1 from public.project_members
    where project_members.project_id = milestones.project_id
      and project_members.user_id = (select auth.uid())
  )
);

create policy "Staff can manage project updates"
on public.project_updates for all
to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

create policy "Clients can read client updates"
on public.project_updates for select
to authenticated
using (
  (select private.is_active_user())
  and audience = 'client'::public.update_audience
  and exists (
    select 1 from public.project_members
    where project_members.project_id = project_updates.project_id
      and project_members.user_id = (select auth.uid())
  )
);

create policy "Public can read published portfolio items"
on public.portfolio_items for select
to anon, authenticated
using (status = 'published'::public.publish_state and published_at <= now());

create policy "Staff can manage portfolio items"
on public.portfolio_items for all
to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

create policy "Staff can manage portfolio item sources"
on public.portfolio_item_sources for all
to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

create policy "Public can read published portfolio updates"
on public.portfolio_updates for select
to anon, authenticated
using (
  published_at <= now()
  and exists (
    select 1 from public.portfolio_items
    where portfolio_items.id = portfolio_updates.portfolio_item_id
      and portfolio_items.status = 'published'::public.publish_state
      and portfolio_items.published_at <= now()
  )
);

create policy "Staff can manage portfolio updates"
on public.portfolio_updates for all
to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

create policy "Staff can manage portfolio update sources"
on public.portfolio_update_sources for all
to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

create policy "Public can read published articles"
on public.articles for select
to anon, authenticated
using (status = 'published'::public.publish_state and published_at <= now());

create policy "Staff can manage articles"
on public.articles for all
to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

create policy "Staff can manage media metadata"
on public.media_assets for all
to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

create policy "Staff can read audit events"
on public.audit_events for select
to authenticated
using ((select private.is_staff()));

create policy "Active users can write their audit events"
on public.audit_events for insert
to authenticated
with check ((select private.is_active_user()) and actor_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'public-media',
  'public-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Staff can upload public media"
on storage.objects for insert
to authenticated
with check (bucket_id = 'public-media' and (select private.is_staff()));

create policy "Staff can read public media objects"
on storage.objects for select
to authenticated
using (bucket_id = 'public-media' and (select private.is_staff()));

create policy "Staff can update public media"
on storage.objects for update
to authenticated
using (bucket_id = 'public-media' and (select private.is_staff()))
with check (bucket_id = 'public-media' and (select private.is_staff()));

create policy "Staff can delete public media"
on storage.objects for delete
to authenticated
using (bucket_id = 'public-media' and (select private.is_staff()));
