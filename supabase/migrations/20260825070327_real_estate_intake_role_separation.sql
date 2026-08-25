-- Afgekia's operational model is deliberately split three ways:
-- administrators manage accounts, owners manage their assigned work, and
-- clients see only work they requested or were assigned to.

alter type public.account_state add value if not exists 'pending' before 'active';
alter type public.update_audience rename value 'staff' to 'owner';

create type public.project_type as enum ('real_estate_listing');
create type public.project_request_status as enum ('submitted', 'approved', 'declined', 'withdrawn');

create table public.owner_project_types (
  owner_id uuid not null references public.profiles (id) on delete cascade,
  project_type public.project_type not null,
  display_name text not null check (char_length(display_name) between 1 and 120),
  listed boolean not null default true,
  display_order integer not null default 0 check (display_order between 0 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, project_type)
);

create table public.project_requests (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique check (reference_code ~ '^REQ-[A-HJ-NP-Z2-9]{8}$'),
  project_type public.project_type not null default 'real_estate_listing',
  requester_id uuid not null references public.profiles (id) on delete restrict,
  owner_id uuid not null references public.profiles (id) on delete restrict,
  property_address_short text not null check (char_length(property_address_short) between 2 and 100),
  seller_nickname text not null check (char_length(seller_nickname) between 1 and 50),
  summary text not null check (char_length(summary) between 20 and 600),
  details text not null default '' check (char_length(details) <= 12000),
  privacy_consent_at timestamptz not null,
  status public.project_request_status not null default 'submitted',
  owner_response text check (owner_response is null or char_length(owner_response) <= 2000),
  resulting_project_id uuid unique references public.projects (id) on delete restrict,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'approved'::public.project_request_status and resulting_project_id is not null and decided_at is not null)
    or (status in ('declined'::public.project_request_status, 'withdrawn'::public.project_request_status) and resulting_project_id is null and decided_at is not null)
    or (status = 'submitted'::public.project_request_status and resulting_project_id is null and decided_at is null)
  )
);

alter table public.projects
  add column project_type public.project_type not null default 'real_estate_listing',
  add column owner_id uuid references public.profiles (id) on delete restrict;

update public.projects set owner_id = created_by where owner_id is null;

do $$
begin
  if exists (select 1 from public.projects where owner_id is null) then
    raise exception 'Every existing project must have an owner before this migration can continue.';
  end if;
end;
$$;

alter table public.projects alter column owner_id set not null;

alter table public.booking_services
  add column owner_id uuid references public.profiles (id) on delete restrict;

update public.booking_services as service
set owner_id = owner_profile.id
from lateral (
  select profile.id
  from public.profiles as profile
  where profile.role = 'owner'::public.app_role
  order by profile.created_at, profile.id
  limit 1
) as owner_profile
where service.owner_id is null;

do $$
begin
  if exists (select 1 from public.booking_services where owner_id is null) then
    raise exception 'Existing booking types require an owner before this migration can continue.';
  end if;
end;
$$;

alter table public.booking_services alter column owner_id set not null;
alter table public.booking_services add constraint booking_services_id_owner_key unique (id, owner_id);

alter table public.booking_requests
  add column owner_id uuid references public.profiles (id) on delete restrict;

update public.booking_requests as request
set owner_id = service.owner_id
from public.booking_services as service
where service.id = request.service_id and request.owner_id is null;

alter table public.booking_requests alter column owner_id set not null;
alter table public.booking_requests
  add constraint booking_requests_service_owner_fkey
  foreign key (service_id, owner_id)
  references public.booking_services (id, owner_id)
  on delete restrict;

insert into public.owner_project_types (owner_id, project_type, display_name, listed, display_order)
select id, 'real_estate_listing'::public.project_type, full_name, state = 'active'::public.account_state,
       row_number() over (order by created_at, id) * 10
from public.profiles
where role = 'owner'::public.app_role
on conflict (owner_id, project_type) do nothing;

create index owner_project_types_public_idx
  on public.owner_project_types (project_type, listed, display_order, owner_id);
create index project_requests_requester_status_idx
  on public.project_requests (requester_id, status, created_at desc);
create index project_requests_owner_status_idx
  on public.project_requests (owner_id, status, created_at desc);
create index project_requests_type_status_idx
  on public.project_requests (project_type, status, created_at desc);
create index projects_owner_status_idx
  on public.projects (owner_id, status, updated_at desc);
create index projects_type_status_idx
  on public.projects (project_type, status, updated_at desc);
create index booking_services_owner_active_idx
  on public.booking_services (owner_id, active, display_order);
create index booking_requests_owner_status_idx
  on public.booking_requests (owner_id, status, created_at desc);

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select coalesce((select private.current_user_role()) = 'admin'::public.app_role, false);
$$;

create or replace function private.owns_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1 from public.projects
    where id = target_project_id
      and owner_id = (select auth.uid())
      and (select private.is_owner())
  );
$$;

create or replace function private.is_project_member(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1 from public.project_members
    where project_id = target_project_id
      and user_id = (select auth.uid())
      and (select private.is_active_user())
  );
$$;

create or replace function private.shares_project_with(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select target_user_id = (select auth.uid())
    or exists (
      select 1
      from public.projects as project
      join public.project_members as member on member.project_id = project.id
      where member.user_id = target_user_id
        and (
          project.owner_id = (select auth.uid())
          or exists (
            select 1 from public.project_members as self_membership
            where self_membership.project_id = project.id
              and self_membership.user_id = (select auth.uid())
          )
        )
    );
$$;

create or replace function private.owns_assessment_revision(target_revision_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.assessment_plan_revisions as revision
    join public.projects as project on project.id = revision.project_id
    where revision.id = target_revision_id
      and project.owner_id = (select auth.uid())
      and (select private.is_owner())
  );
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  requested_role public.app_role;
  initial_state public.account_state;
  force_change boolean;
begin
  requested_role := case new.raw_app_meta_data ->> 'role'
    when 'owner' then 'owner'::public.app_role
    when 'admin' then 'admin'::public.app_role
    else 'client'::public.app_role
  end;
  initial_state := case
    when requested_role = 'client'::public.app_role then 'pending'::public.account_state
    else 'active'::public.account_state
  end;
  force_change := case
    when requested_role = 'client'::public.app_role then false
    else coalesce((new.raw_app_meta_data ->> 'must_change_password')::boolean, true)
  end;

  insert into public.profiles (id, email, full_name, role, state, must_change_password, timezone)
  values (
    new.id,
    lower(new.email),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    requested_role,
    initial_state,
    force_change,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'timezone'), ''), 'America/Los_Angeles')
  );
  return new;
end;
$$;

create or replace function private.validate_owned_resource_assignment()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = new.owner_id
      and role = 'owner'::public.app_role
      and state = 'active'::public.account_state
  ) then
    raise exception 'Assigned owner must be active.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function private.validate_project_member()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = new.user_id
      and role = 'client'::public.app_role
      and state = 'active'::public.account_state
  ) then
    raise exception 'Project members must be active clients.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function private.enforce_project_membership_minimum()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  project_status public.project_status;
  remaining_count integer;
begin
  select status into project_status from public.projects where id = old.project_id;
  if project_status in ('completed'::public.project_status, 'archived'::public.project_status) then
    return old;
  end if;
  select count(*) into remaining_count
  from public.project_members
  where project_id = old.project_id and user_id <> old.user_id;
  if remaining_count < 1 then
    raise exception 'A nonterminal project must retain at least one client.' using errcode = '23514';
  end if;
  return old;
end;
$$;

create or replace function private.enforce_project_has_member_when_nonterminal()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if new.status not in ('completed'::public.project_status, 'archived'::public.project_status)
     and old.status in ('completed'::public.project_status, 'archived'::public.project_status)
     and not exists (select 1 from public.project_members where project_id = new.id) then
    raise exception 'A nonterminal project must have at least one client.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function private.enforce_owner_suspension_blockers()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if old.role = 'owner'::public.app_role
     and old.state <> 'suspended'::public.account_state
     and new.state = 'suspended'::public.account_state then
    if exists (select 1 from public.project_requests where owner_id = old.id and status = 'submitted'::public.project_request_status)
       or exists (select 1 from public.booking_requests where owner_id = old.id and status in ('submitted'::public.booking_status, 'confirmed'::public.booking_status, 'reschedule_proposed'::public.booking_status))
       or exists (select 1 from public.projects where owner_id = old.id and status in ('planning'::public.project_status, 'active'::public.project_status, 'on_hold'::public.project_status)) then
      raise exception 'Owner has unresolved work and cannot be suspended.' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.generate_readable_reference(prefix text, reference_length integer)
returns text
language plpgsql
volatile
security invoker
set search_path = pg_catalog
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := prefix || '-';
  index_value integer;
begin
  for index_value in 1..reference_length loop
    result := result || substr(alphabet, 1 + floor(random() * char_length(alphabet))::integer, 1);
  end loop;
  return result;
end;
$$;

create or replace function private.process_project_request_decision()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  new_project_id uuid;
  project_reference text;
begin
  if new.status = old.status then return new; end if;
  if old.status <> 'submitted'::public.project_request_status then
    raise exception 'A decided project request cannot be changed.' using errcode = '23514';
  end if;
  if new.status not in ('approved'::public.project_request_status, 'declined'::public.project_request_status, 'withdrawn'::public.project_request_status) then
    raise exception 'Invalid project request transition.' using errcode = '23514';
  end if;
  if new.status = 'withdrawn'::public.project_request_status and new.requester_id <> (select auth.uid()) then
    raise exception 'Only the requester can withdraw this request.' using errcode = '42501';
  end if;
  if new.status in ('approved'::public.project_request_status, 'declined'::public.project_request_status)
     and new.owner_id <> (select auth.uid()) then
    raise exception 'Only the selected owner can decide this request.' using errcode = '42501';
  end if;

  new.decided_at := now();
  if new.status = 'approved'::public.project_request_status then
    loop
      project_reference := private.generate_readable_reference('PRJ', 6);
      exit when not exists (select 1 from public.projects where reference_code = project_reference);
    end loop;
    insert into public.projects (
      reference_code, title, property_address_short, seller_nickname,
      summary, description, status, progress, created_by, owner_id, project_type
    ) values (
      project_reference,
      new.property_address_short || ' · ' || new.seller_nickname,
      new.property_address_short,
      new.seller_nickname,
      new.summary,
      new.details,
      'planning'::public.project_status,
      0,
      new.owner_id,
      new.owner_id,
      new.project_type
    ) returning id into new_project_id;
    insert into public.project_members (project_id, user_id, is_assessment_approver)
    values (new_project_id, new.requester_id, true);
    new.resulting_project_id := new_project_id;
  else
    new.resulting_project_id := null;
  end if;
  return new;
end;
$$;

revoke all on function private.is_admin() from public, anon;
revoke all on function private.owns_project(uuid) from public, anon;
revoke all on function private.is_project_member(uuid) from public, anon;
revoke all on function private.shares_project_with(uuid) from public, anon;
revoke all on function private.owns_assessment_revision(uuid) from public, anon;
revoke all on function private.validate_owned_resource_assignment() from public, anon, authenticated;
revoke all on function private.validate_project_member() from public, anon, authenticated;
revoke all on function private.enforce_project_membership_minimum() from public, anon, authenticated;
revoke all on function private.enforce_project_has_member_when_nonterminal() from public, anon, authenticated;
revoke all on function private.enforce_owner_suspension_blockers() from public, anon, authenticated;
revoke all on function private.generate_readable_reference(text, integer) from public, anon, authenticated;
revoke all on function private.process_project_request_decision() from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.owns_project(uuid) to authenticated;
grant execute on function private.is_project_member(uuid) to authenticated;
grant execute on function private.shares_project_with(uuid) to authenticated;
grant execute on function private.owns_assessment_revision(uuid) to authenticated;

create trigger owner_project_types_set_updated_at
before update on public.owner_project_types
for each row execute function private.set_updated_at();
create trigger project_requests_set_updated_at
before update on public.project_requests
for each row execute function private.set_updated_at();
create trigger projects_validate_owner
before insert or update of owner_id on public.projects
for each row execute function private.validate_owned_resource_assignment();
create trigger booking_services_validate_owner
before insert or update of owner_id on public.booking_services
for each row execute function private.validate_owned_resource_assignment();
create trigger project_members_validate_client
before insert or update of user_id on public.project_members
for each row execute function private.validate_project_member();
create trigger project_members_keep_one_client
before delete on public.project_members
for each row execute function private.enforce_project_membership_minimum();
create trigger projects_require_member_when_reopened
before update of status on public.projects
for each row execute function private.enforce_project_has_member_when_nonterminal();
create trigger profiles_block_owner_suspension
before update of state on public.profiles
for each row execute function private.enforce_owner_suspension_blockers();
create trigger project_requests_process_decision
before update of status on public.project_requests
for each row execute function private.process_project_request_decision();

-- Publishing is intentionally removed rather than hidden.
drop table public.portfolio_update_sources;
drop table public.portfolio_updates;
drop table public.portfolio_item_sources;
drop table public.portfolio_items;
drop table public.articles;
drop type public.publish_state;
drop type public.portfolio_accent;

alter table public.owner_project_types enable row level security;
alter table public.project_requests enable row level security;

-- Remove the original broad staff policies before defining role-specific rules.
drop policy "Staff can update site settings" on public.site_settings;
drop policy "Public can read active services" on public.booking_services;
drop policy "Staff can manage services" on public.booking_services;
drop policy "Users can read allowed profiles" on public.profiles;
drop policy "Staff can read booking requests and clients can read linked requests" on public.booking_requests;
drop policy "Staff can update booking requests" on public.booking_requests;
drop policy "Staff can manage booking administration" on public.booking_request_admin;
drop policy "Staff can manage projects" on public.projects;
drop policy "Clients can read assigned projects" on public.projects;
drop policy "Staff can manage project members" on public.project_members;
drop policy "Clients can read their own project memberships" on public.project_members;
drop policy "Staff can manage milestones" on public.milestones;
drop policy "Clients can read visible milestones" on public.milestones;
drop policy "Staff can manage project updates" on public.project_updates;
drop policy "Clients can read client updates" on public.project_updates;
drop policy "Staff can manage media metadata" on public.media_assets;
drop policy "Staff can read audit events" on public.audit_events;
drop policy "Active users can write their audit events" on public.audit_events;
drop policy "Staff can manage project stages" on public.project_stages;
drop policy "Clients can read assigned project stages" on public.project_stages;
drop policy "Staff can manage assessment revisions" on public.assessment_plan_revisions;
drop policy "Clients can read assigned assessment revisions" on public.assessment_plan_revisions;
drop policy "Staff can read assessment approvals" on public.assessment_plan_approvals;
drop policy "Staff can create assessment approvals" on public.assessment_plan_approvals;
drop policy "Clients can read their assessment approvals" on public.assessment_plan_approvals;
drop policy "Clients can answer their pending assessment approvals" on public.assessment_plan_approvals;
drop policy "Staff can upload public media" on storage.objects;
drop policy "Staff can read public media objects" on storage.objects;
drop policy "Staff can update public media" on storage.objects;
drop policy "Staff can delete public media" on storage.objects;

revoke all on public.owner_project_types, public.project_requests from anon, authenticated;
revoke all on public.site_settings, public.profiles, public.booking_services, public.booking_requests,
  public.booking_request_admin, public.projects, public.project_members, public.milestones,
  public.project_updates, public.media_assets, public.audit_events, public.project_stages,
  public.assessment_plan_revisions, public.assessment_plan_approvals from anon, authenticated;

grant select on public.site_settings, public.owner_project_types, public.booking_services to anon, authenticated;
grant select on public.profiles, public.booking_requests, public.booking_request_admin,
  public.projects, public.project_members, public.milestones, public.project_updates,
  public.media_assets, public.audit_events, public.project_stages,
  public.assessment_plan_revisions, public.assessment_plan_approvals, public.project_requests to authenticated;
grant insert on public.project_requests to authenticated;
grant update (status, owner_response, decided_at, resulting_project_id) on public.project_requests to authenticated;
grant insert, update, delete on public.owner_project_types to authenticated;
grant update (state, must_change_password) on public.profiles to authenticated;
grant insert, update, delete on public.booking_services, public.projects, public.project_members,
  public.milestones, public.project_updates, public.media_assets, public.project_stages,
  public.assessment_plan_revisions to authenticated;
grant update on public.booking_requests to authenticated;
grant insert, update, delete on public.booking_request_admin to authenticated;
grant insert, update on public.assessment_plan_approvals to authenticated;
grant insert on public.audit_events to authenticated;

create policy "Public can read listed owners"
on public.owner_project_types for select
to anon, authenticated
using (
  listed
  and exists (
    select 1 from public.profiles
    where profiles.id = owner_project_types.owner_id
      and profiles.role = 'owner'::public.app_role
      and profiles.state = 'active'::public.account_state
  )
);

create policy "Admins can manage owner listings"
on public.owner_project_types for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "Public can read active owner appointment types"
on public.booking_services for select
to anon, authenticated
using (
  active
  and exists (
    select 1 from public.owner_project_types
    where owner_project_types.owner_id = booking_services.owner_id
      and owner_project_types.project_type = 'real_estate_listing'::public.project_type
      and owner_project_types.listed
  )
);

create policy "Owners can manage their appointment types"
on public.booking_services for all
to authenticated
using ((select private.is_owner()) and owner_id = (select auth.uid()))
with check ((select private.is_owner()) and owner_id = (select auth.uid()));

create policy "Users can read permitted profiles"
on public.profiles for select
to authenticated
using (
  (select private.is_active_user())
  and (
    id = (select auth.uid())
    or (select private.is_admin())
    or (select private.shares_project_with(id))
  )
);

create policy "Admins can update managed account states"
on public.profiles for update
to authenticated
using ((select private.is_admin()) and role <> 'admin'::public.app_role and id <> (select auth.uid()))
with check ((select private.is_admin()) and role <> 'admin'::public.app_role and id <> (select auth.uid()));

create policy "Owners and linked clients can read bookings"
on public.booking_requests for select
to authenticated
using (
  (select private.is_active_user())
  and (owner_id = (select auth.uid()) or client_user_id = (select auth.uid()))
);

create policy "Owners can update their bookings"
on public.booking_requests for update
to authenticated
using ((select private.is_owner()) and owner_id = (select auth.uid()))
with check ((select private.is_owner()) and owner_id = (select auth.uid()));

create policy "Owners can manage their booking notes"
on public.booking_request_admin for all
to authenticated
using (
  exists (select 1 from public.booking_requests where id = booking_id and owner_id = (select auth.uid()))
)
with check (
  exists (select 1 from public.booking_requests where id = booking_id and owner_id = (select auth.uid()))
  and created_by = (select auth.uid()) and updated_by = (select auth.uid())
);

create policy "Owners can manage their projects"
on public.projects for all
to authenticated
using ((select private.owns_project(id)))
with check ((select private.is_owner()) and owner_id = (select auth.uid()));

create policy "Clients can read assigned projects"
on public.projects for select
to authenticated
using ((select private.is_project_member(id)));

create policy "Owners can manage their project members"
on public.project_members for all
to authenticated
using ((select private.owns_project(project_id)))
with check ((select private.owns_project(project_id)));

create policy "Clients can read assigned project memberships"
on public.project_members for select
to authenticated
using ((select private.is_project_member(project_id)));

create policy "Owners can manage their milestones"
on public.milestones for all
to authenticated
using ((select private.owns_project(project_id)))
with check ((select private.owns_project(project_id)));

create policy "Clients can read visible milestones"
on public.milestones for select
to authenticated
using (client_visible and (select private.is_project_member(project_id)));

create policy "Owners can manage their project updates"
on public.project_updates for all
to authenticated
using ((select private.owns_project(project_id)))
with check ((select private.owns_project(project_id)) and created_by = (select auth.uid()));

create policy "Clients can read client project updates"
on public.project_updates for select
to authenticated
using (audience = 'client'::public.update_audience and (select private.is_project_member(project_id)));

create policy "Owners can manage their project stages"
on public.project_stages for all
to authenticated
using ((select private.owns_project(project_id)))
with check ((select private.owns_project(project_id)));

create policy "Clients can read assigned project stages"
on public.project_stages for select
to authenticated
using ((select private.is_project_member(project_id)));

create policy "Owners can manage their assessment revisions"
on public.assessment_plan_revisions for all
to authenticated
using ((select private.owns_project(project_id)))
with check ((select private.owns_project(project_id)) and submitted_by = (select auth.uid()));

create policy "Clients can read assigned assessment revisions"
on public.assessment_plan_revisions for select
to authenticated
using ((select private.is_project_member(project_id)));

create policy "Owners can read their assessment approvals"
on public.assessment_plan_approvals for select
to authenticated
using ((select private.owns_assessment_revision(revision_id)));

create policy "Owners can create their assessment approvals"
on public.assessment_plan_approvals for insert
to authenticated
with check ((select private.owns_assessment_revision(revision_id)));

create policy "Clients can read their assessment approvals"
on public.assessment_plan_approvals for select
to authenticated
using (user_id = (select auth.uid()) and (select private.is_active_user()));

create policy "Clients can answer pending assessment approvals"
on public.assessment_plan_approvals for update
to authenticated
using (user_id = (select auth.uid()) and status = 'pending'::public.assessment_approval_status and (select private.is_active_user()))
with check (user_id = (select auth.uid()) and status in ('approved'::public.assessment_approval_status, 'changes_requested'::public.assessment_approval_status));

create policy "Clients can create their project requests"
on public.project_requests for insert
to authenticated
with check (
  requester_id = (select auth.uid())
  and status = 'submitted'::public.project_request_status
  and (select private.current_user_role()) = 'client'::public.app_role
  and exists (
    select 1 from public.owner_project_types
    where owner_id = project_requests.owner_id
      and project_type = project_requests.project_type
      and listed
  )
);

create policy "Clients can read their project requests"
on public.project_requests for select
to authenticated
using (requester_id = (select auth.uid()) and (select private.is_active_user()));

create policy "Clients can withdraw submitted project requests"
on public.project_requests for update
to authenticated
using (requester_id = (select auth.uid()) and status = 'submitted'::public.project_request_status and (select private.is_active_user()))
with check (requester_id = (select auth.uid()) and status = 'withdrawn'::public.project_request_status);

create policy "Owners can read selected project requests"
on public.project_requests for select
to authenticated
using (owner_id = (select auth.uid()) and (select private.is_owner()));

create policy "Owners can decide selected project requests"
on public.project_requests for update
to authenticated
using (owner_id = (select auth.uid()) and status = 'submitted'::public.project_request_status and (select private.is_owner()))
with check (owner_id = (select auth.uid()) and status in ('approved'::public.project_request_status, 'declined'::public.project_request_status));

create policy "Owners can manage their media metadata"
on public.media_assets for all
to authenticated
using ((select private.is_owner()) and created_by = (select auth.uid()))
with check ((select private.is_owner()) and created_by = (select auth.uid()));

create policy "Users can read their own audit events"
on public.audit_events for select
to authenticated
using ((select private.is_active_user()) and actor_id = (select auth.uid()));

create policy "Active users can write their own audit events"
on public.audit_events for insert
to authenticated
with check ((select private.is_active_user()) and actor_id = (select auth.uid()));

create policy "Owners can upload public media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'public-media'
  and (select private.is_owner())
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Owners can read their public media objects"
on storage.objects for select
to authenticated
using (bucket_id = 'public-media' and owner_id = (select auth.uid())::text);

create policy "Owners can update their public media"
on storage.objects for update
to authenticated
using (bucket_id = 'public-media' and owner_id = (select auth.uid())::text)
with check (
  bucket_id = 'public-media'
  and owner_id = (select auth.uid())::text
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Owners can delete their public media"
on storage.objects for delete
to authenticated
using (bucket_id = 'public-media' and owner_id = (select auth.uid())::text);

-- The old helper represented a role combination that no longer exists.
revoke all on function private.is_staff() from authenticated;
drop function private.is_staff();
