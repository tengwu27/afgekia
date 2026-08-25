create type public.listing_stage_code as enum (
  'assessment',
  'cleaning',
  'remodel',
  'staging',
  'photography_marketing',
  'open_house',
  'under_contract',
  'closed'
);

create type public.listing_stage_status as enum (
  'not_started',
  'active',
  'blocked',
  'done',
  'skipped'
);

create type public.assessment_revision_status as enum (
  'draft',
  'pending_approval',
  'approved',
  'changes_requested',
  'superseded'
);

create type public.assessment_approval_status as enum (
  'pending',
  'approved',
  'changes_requested'
);

alter table public.projects
  add column property_address_short text,
  add column seller_nickname text;

update public.projects as project
set
  property_address_short = left(trim(project.title), 100),
  seller_nickname = left(
    coalesce(
      (
        select nullif(split_part(trim(profile.full_name), ' ', 1), '')
        from public.project_members as membership
        join public.profiles as profile on profile.id = membership.user_id
        where membership.project_id = project.id
        order by membership.created_at
        limit 1
      ),
      'Seller'
    ),
    50
  );

alter table public.projects
  alter column property_address_short set default 'Property address pending',
  alter column property_address_short set not null,
  alter column seller_nickname set default 'Seller',
  alter column seller_nickname set not null,
  add constraint projects_property_address_short_length
    check (char_length(property_address_short) between 2 and 100),
  add constraint projects_seller_nickname_length
    check (char_length(seller_nickname) between 1 and 50);

alter table public.project_members
  add column is_assessment_approver boolean not null default true;

create table public.project_stages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  code public.listing_stage_code not null,
  status public.listing_stage_status not null default 'not_started',
  position integer not null check (position between 0 and 1000),
  planned_start_date date,
  planned_end_date date,
  actual_started_at timestamptz,
  actual_completed_at timestamptz,
  skip_reason text check (skip_reason is null or char_length(skip_reason) between 5 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, code),
  unique (project_id, position),
  check (planned_end_date is null or planned_start_date is null or planned_end_date >= planned_start_date),
  check (
    (status = 'skipped'::public.listing_stage_status and skip_reason is not null)
    or (status <> 'skipped'::public.listing_stage_status and skip_reason is null)
  ),
  check (code <> 'assessment'::public.listing_stage_code or status <> 'skipped'::public.listing_stage_status)
);

create table public.assessment_plan_revisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  revision_number integer not null check (revision_number > 0),
  status public.assessment_revision_status not null default 'pending_approval',
  snapshot jsonb not null check (
    coalesce(
      jsonb_typeof(snapshot) = 'object'
      and snapshot ->> 'version' = '1'
      and jsonb_typeof(snapshot -> 'project') = 'object'
      and jsonb_typeof(snapshot -> 'stages') = 'array'
      and jsonb_typeof(snapshot -> 'milestones') = 'array',
      false
    )
  ),
  approvals_required integer not null check (approvals_required > 0),
  approvals_received integer not null default 0 check (
    approvals_received >= 0 and approvals_received <= approvals_required
  ),
  submitted_by uuid not null references public.profiles (id) on delete restrict,
  submitted_at timestamptz not null default now(),
  approved_at timestamptz,
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, revision_number)
);

create table public.assessment_plan_approvals (
  revision_id uuid not null references public.assessment_plan_revisions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete restrict,
  status public.assessment_approval_status not null default 'pending',
  note text check (note is null or char_length(note) <= 2000),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (revision_id, user_id),
  check (
    (status = 'pending'::public.assessment_approval_status and responded_at is null)
    or (status <> 'pending'::public.assessment_approval_status and responded_at is not null)
  ),
  check (
    status <> 'changes_requested'::public.assessment_approval_status
    or (note is not null and char_length(trim(note)) >= 10)
  )
);

alter table public.projects
  add column official_assessment_revision_id uuid
    references public.assessment_plan_revisions (id) on delete set null;

alter table public.milestones
  add column project_stage_id uuid;

alter table public.project_stages
  add constraint project_stages_project_id_id_key unique (project_id, id);

alter table public.milestones
  add constraint milestones_project_stage_project_fkey
  foreign key (project_id, project_stage_id)
  references public.project_stages (project_id, id)
  on delete restrict;

create index projects_listing_identity_idx
  on public.projects (property_address_short, seller_nickname);
create index projects_official_assessment_idx
  on public.projects (official_assessment_revision_id)
  where official_assessment_revision_id is not null;
create index project_members_approvers_idx
  on public.project_members (project_id, is_assessment_approver, user_id);
create index project_stages_project_position_idx
  on public.project_stages (project_id, position);
create index project_stages_project_status_idx
  on public.project_stages (project_id, status);
create index assessment_revisions_project_status_idx
  on public.assessment_plan_revisions (project_id, status, revision_number desc);
create index assessment_revisions_submitted_by_idx
  on public.assessment_plan_revisions (submitted_by);
create index assessment_approvals_user_idx
  on public.assessment_plan_approvals (user_id, status, revision_id);
create index milestones_stage_idx
  on public.milestones (project_stage_id)
  where project_stage_id is not null;

create or replace function private.set_project_listing_title()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.property_address_short := trim(new.property_address_short);
  new.seller_nickname := trim(new.seller_nickname);
  new.title := new.property_address_short || ' · ' || new.seller_nickname;
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
    raise exception 'invalid project status transition from % to %', old.status, new.status
      using errcode = '23514';
  end if;

  if new.status = 'completed'::public.project_status and not exists (
    select 1
    from public.project_stages as stage
    where stage.project_id = new.id
      and stage.code = 'closed'::public.listing_stage_code
      and stage.status = 'done'::public.listing_stage_status
  ) then
    raise exception 'the closed listing stage must be done before completing the project'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function private.create_default_project_stages()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  insert into public.project_stages (project_id, code, status, position)
  values
    (new.id, 'assessment'::public.listing_stage_code, 'active'::public.listing_stage_status, 10),
    (new.id, 'cleaning'::public.listing_stage_code, 'not_started'::public.listing_stage_status, 20),
    (new.id, 'remodel'::public.listing_stage_code, 'not_started'::public.listing_stage_status, 30),
    (new.id, 'staging'::public.listing_stage_code, 'not_started'::public.listing_stage_status, 40),
    (new.id, 'photography_marketing'::public.listing_stage_code, 'not_started'::public.listing_stage_status, 50),
    (new.id, 'open_house'::public.listing_stage_code, 'not_started'::public.listing_stage_status, 60),
    (new.id, 'under_contract'::public.listing_stage_code, 'not_started'::public.listing_stage_status, 70),
    (new.id, 'closed'::public.listing_stage_code, 'not_started'::public.listing_stage_status, 80);
  return new;
end;
$$;

create or replace function private.enforce_assessment_approval_response()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if new.revision_id <> old.revision_id or new.user_id <> old.user_id then
    raise exception 'assessment approval identity cannot change' using errcode = '23514';
  end if;

  if old.status <> 'pending'::public.assessment_approval_status then
    raise exception 'assessment approval has already been answered' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.assessment_plan_revisions as revision
    where revision.id = new.revision_id
      and revision.status = 'pending_approval'::public.assessment_revision_status
  ) then
    raise exception 'assessment approval request is no longer open' using errcode = '23514';
  end if;

  if new.status not in (
    'approved'::public.assessment_approval_status,
    'changes_requested'::public.assessment_approval_status
  ) then
    raise exception 'invalid assessment approval response' using errcode = '23514';
  end if;

  if (select auth.uid()) is distinct from new.user_id then
    raise exception 'assessment approvals can only be answered by their assigned client' using errcode = '42501';
  end if;

  new.responded_at := now();
  return new;
end;
$$;

create or replace function private.enforce_assessment_approval_roster()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  revision_project_id uuid;
  revision_status public.assessment_revision_status;
begin
  select revision.project_id, revision.status
  into revision_project_id, revision_status
  from public.assessment_plan_revisions as revision
  where revision.id = new.revision_id;

  if revision_project_id is null
    or revision_status <> 'pending_approval'::public.assessment_revision_status
  then
    raise exception 'assessment approvals require an open revision' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.project_members as membership
    join public.profiles as profile on profile.id = membership.user_id
    where membership.project_id = revision_project_id
      and membership.user_id = new.user_id
      and membership.is_assessment_approver
      and profile.role = 'client'::public.app_role
      and profile.state = 'active'::public.account_state
  ) then
    raise exception 'assessment approvers must be active assigned seller clients'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function private.finalize_assessment_approval_response()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  revision_project_id uuid;
  approved_count integer;
  required_count integer;
  previous_official_id uuid;
begin
  select revision.project_id, revision.approvals_required
  into revision_project_id, required_count
  from public.assessment_plan_revisions as revision
  where revision.id = new.revision_id
  for update;

  select count(*)::integer
  into approved_count
  from public.assessment_plan_approvals as approval
  where approval.revision_id = new.revision_id
    and approval.status = 'approved'::public.assessment_approval_status;

  update public.assessment_plan_revisions
  set
    approvals_received = approved_count,
    status = case
      when new.status = 'changes_requested'::public.assessment_approval_status
        then 'changes_requested'::public.assessment_revision_status
      when approved_count = required_count
        then 'approved'::public.assessment_revision_status
      else status
    end,
    approved_at = case when approved_count = required_count then now() else approved_at end
  where id = new.revision_id;

  insert into public.audit_events (actor_id, action, entity_type, entity_id, details)
  values (
    new.user_id,
    case
      when new.status = 'approved'::public.assessment_approval_status
        then 'assessment.approved_by_client'
      else 'assessment.changes_requested'
    end,
    'assessment_plan_revision',
    new.revision_id::text,
    jsonb_build_object('project_id', revision_project_id)
  );

  if new.status = 'changes_requested'::public.assessment_approval_status then
    return new;
  end if;

  if approved_count = required_count then
    select official_assessment_revision_id
    into previous_official_id
    from public.projects
    where id = revision_project_id
    for update;

    if previous_official_id is not null and previous_official_id <> new.revision_id then
      update public.assessment_plan_revisions
      set status = 'superseded'::public.assessment_revision_status,
          superseded_at = now()
      where id = previous_official_id;
    end if;

    update public.projects
    set official_assessment_revision_id = new.revision_id,
        status = case
          when status = 'planning'::public.project_status then 'active'::public.project_status
          else status
        end
    where id = revision_project_id;

    update public.project_stages
    set status = 'done'::public.listing_stage_status,
        actual_completed_at = coalesce(actual_completed_at, now())
    where project_id = revision_project_id
      and code = 'assessment'::public.listing_stage_code;

    update public.project_stages
    set status = 'active'::public.listing_stage_status,
        actual_started_at = coalesce(actual_started_at, now())
    where id = (
      select stage.id
      from public.project_stages as stage
      where stage.project_id = revision_project_id
        and stage.code <> 'assessment'::public.listing_stage_code
        and stage.status = 'not_started'::public.listing_stage_status
      order by stage.position
      limit 1
    );

    insert into public.project_updates (
      project_id,
      title,
      body_json,
      body_text,
      audience,
      status_snapshot,
      progress_snapshot,
      occurred_at,
      created_by
    )
    select
      project.id,
      'Assessment plan approved',
      jsonb_build_object(
        'type', 'doc',
        'content', jsonb_build_array(
          jsonb_build_object(
            'type', 'paragraph',
            'content', jsonb_build_array(
              jsonb_build_object('type', 'text', 'text', 'Every required seller has approved the listing preparation plan.')
            )
          )
        )
      ),
      'Every required seller has approved the listing preparation plan.',
      'client'::public.update_audience,
      project.status,
      project.progress,
      now(),
      new.user_id
    from public.projects as project
    where project.id = revision_project_id;
  end if;

  return new;
end;
$$;

create or replace function private.enforce_assessment_revision_immutability()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  recorded_approval_count integer;
begin
  if new.project_id <> old.project_id
    or new.revision_number <> old.revision_number
    or new.snapshot <> old.snapshot
    or new.approvals_required <> old.approvals_required
    or new.submitted_by <> old.submitted_by
    or new.submitted_at <> old.submitted_at
    or new.created_at <> old.created_at
  then
    raise exception 'assessment revision snapshots and approval rosters are immutable'
      using errcode = '23514';
  end if;

  select count(*)::integer
  into recorded_approval_count
  from public.assessment_plan_approvals as approval
  where approval.revision_id = new.id
    and approval.status = 'approved'::public.assessment_approval_status;

  if new.approvals_received <> recorded_approval_count then
    raise exception 'assessment approval counts must match recorded seller responses'
      using errcode = '23514';
  end if;

  if new.status = 'approved'::public.assessment_revision_status and (
    new.approvals_received <> new.approvals_required
    or exists (
      select 1
      from public.assessment_plan_approvals as approval
      where approval.revision_id = new.id
        and approval.status <> 'approved'::public.assessment_approval_status
    )
  ) then
    raise exception 'assessment revisions require unanimous seller approval'
      using errcode = '23514';
  end if;

  if new.approved_at is distinct from old.approved_at and not (
    old.status = 'pending_approval'::public.assessment_revision_status
    and new.status = 'approved'::public.assessment_revision_status
    and old.approved_at is null
    and new.approved_at is not null
  ) then
    raise exception 'assessment approval timestamps are managed by seller responses'
      using errcode = '23514';
  end if;

  if not (
    new.status = old.status
    or (old.status = 'draft'::public.assessment_revision_status
      and new.status in ('pending_approval'::public.assessment_revision_status, 'superseded'::public.assessment_revision_status))
    or (old.status = 'pending_approval'::public.assessment_revision_status
      and new.status in ('approved'::public.assessment_revision_status, 'changes_requested'::public.assessment_revision_status, 'superseded'::public.assessment_revision_status))
    or (old.status = 'changes_requested'::public.assessment_revision_status
      and new.status = 'superseded'::public.assessment_revision_status)
    or (old.status = 'approved'::public.assessment_revision_status
      and new.status = 'superseded'::public.assessment_revision_status)
  ) then
    raise exception 'invalid assessment revision status transition from % to %', old.status, new.status
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function private.enforce_project_official_revision()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if new.official_assessment_revision_id is not null and not exists (
    select 1
    from public.assessment_plan_revisions as revision
    where revision.id = new.official_assessment_revision_id
      and revision.project_id = new.id
      and revision.status = 'approved'::public.assessment_revision_status
  ) then
    raise exception 'official assessment revision must be an approved revision for this project'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.set_project_listing_title() from public, anon, authenticated;
revoke all on function private.create_default_project_stages() from public, anon, authenticated;
revoke all on function private.enforce_assessment_approval_response() from public, anon, authenticated;
revoke all on function private.enforce_assessment_approval_roster() from public, anon, authenticated;
revoke all on function private.finalize_assessment_approval_response() from public, anon, authenticated;
revoke all on function private.enforce_assessment_revision_immutability() from public, anon, authenticated;
revoke all on function private.enforce_project_official_revision() from public, anon, authenticated;

create trigger projects_set_listing_title
before insert or update of property_address_short, seller_nickname
on public.projects
for each row execute function private.set_project_listing_title();

create trigger projects_create_default_stages
after insert on public.projects
for each row execute function private.create_default_project_stages();

create trigger project_stages_set_updated_at
before update on public.project_stages
for each row execute function private.set_updated_at();

create trigger assessment_revisions_set_updated_at
before update on public.assessment_plan_revisions
for each row execute function private.set_updated_at();

create trigger assessment_revisions_enforce_immutability
before update on public.assessment_plan_revisions
for each row execute function private.enforce_assessment_revision_immutability();

create trigger assessment_approvals_set_updated_at
before update on public.assessment_plan_approvals
for each row execute function private.set_updated_at();

create trigger assessment_approvals_enforce_roster
before insert on public.assessment_plan_approvals
for each row execute function private.enforce_assessment_approval_roster();

create trigger assessment_approvals_enforce_response
before update on public.assessment_plan_approvals
for each row execute function private.enforce_assessment_approval_response();

create trigger assessment_approvals_finalize_response
after update on public.assessment_plan_approvals
for each row execute function private.finalize_assessment_approval_response();

create trigger projects_enforce_official_revision
before insert or update of official_assessment_revision_id
on public.projects
for each row execute function private.enforce_project_official_revision();

insert into public.project_stages (project_id, code, status, position)
select
  project.id,
  template.code,
  template.status,
  template.position
from public.projects as project
cross join (
  values
    ('assessment'::public.listing_stage_code, 'active'::public.listing_stage_status, 10),
    ('cleaning'::public.listing_stage_code, 'not_started'::public.listing_stage_status, 20),
    ('remodel'::public.listing_stage_code, 'not_started'::public.listing_stage_status, 30),
    ('staging'::public.listing_stage_code, 'not_started'::public.listing_stage_status, 40),
    ('photography_marketing'::public.listing_stage_code, 'not_started'::public.listing_stage_status, 50),
    ('open_house'::public.listing_stage_code, 'not_started'::public.listing_stage_status, 60),
    ('under_contract'::public.listing_stage_code, 'not_started'::public.listing_stage_status, 70),
    ('closed'::public.listing_stage_code, 'not_started'::public.listing_stage_status, 80)
) as template(code, status, position)
on conflict (project_id, code) do nothing;

update public.projects
set title = property_address_short || ' · ' || seller_nickname;

alter table public.project_stages enable row level security;
alter table public.assessment_plan_revisions enable row level security;
alter table public.assessment_plan_approvals enable row level security;

revoke all on public.project_stages from anon, authenticated;
revoke all on public.assessment_plan_revisions from anon, authenticated;
revoke all on public.assessment_plan_approvals from anon, authenticated;

grant select, insert, update, delete on public.project_stages to authenticated;
grant select, insert, update, delete on public.assessment_plan_revisions to authenticated;
grant select, insert, update on public.assessment_plan_approvals to authenticated;

create policy "Staff can manage project stages"
on public.project_stages for all
to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

create policy "Clients can read assigned project stages"
on public.project_stages for select
to authenticated
using (
  (select private.is_active_user())
  and exists (
    select 1 from public.project_members
    where project_members.project_id = project_stages.project_id
      and project_members.user_id = (select auth.uid())
  )
);

create policy "Staff can manage assessment revisions"
on public.assessment_plan_revisions for all
to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

create policy "Clients can read assigned assessment revisions"
on public.assessment_plan_revisions for select
to authenticated
using (
  (select private.is_active_user())
  and exists (
    select 1 from public.project_members
    where project_members.project_id = assessment_plan_revisions.project_id
      and project_members.user_id = (select auth.uid())
  )
);

create policy "Staff can read assessment approvals"
on public.assessment_plan_approvals for select
to authenticated
using ((select private.is_staff()));

create policy "Staff can create assessment approvals"
on public.assessment_plan_approvals for insert
to authenticated
with check ((select private.is_staff()));

create policy "Clients can read their assessment approvals"
on public.assessment_plan_approvals for select
to authenticated
using (
  (select private.is_active_user())
  and user_id = (select auth.uid())
  and exists (
    select 1
    from public.assessment_plan_revisions as revision
    join public.project_members as membership on membership.project_id = revision.project_id
    where revision.id = assessment_plan_approvals.revision_id
      and membership.user_id = (select auth.uid())
  )
);

create policy "Clients can answer their pending assessment approvals"
on public.assessment_plan_approvals for update
to authenticated
using (
  (select private.is_active_user())
  and user_id = (select auth.uid())
  and status = 'pending'::public.assessment_approval_status
  and exists (
    select 1
    from public.assessment_plan_revisions as revision
    join public.project_members as membership on membership.project_id = revision.project_id
    where revision.id = assessment_plan_approvals.revision_id
      and membership.user_id = (select auth.uid())
  )
)
with check (
  user_id = (select auth.uid())
  and status in (
    'approved'::public.assessment_approval_status,
    'changes_requested'::public.assessment_approval_status
  )
);
