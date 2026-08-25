alter table public.profiles
  add column privacy_consent_at timestamptz;

create table public.registration_attempts (
  id bigint generated always as identity primary key,
  email_hash text not null check (char_length(email_hash) = 64),
  ip_hash text not null check (char_length(ip_hash) = 64),
  created_at timestamptz not null default now()
);

create index registration_attempts_email_date_idx
  on public.registration_attempts (email_hash, created_at desc);
create index registration_attempts_ip_date_idx
  on public.registration_attempts (ip_hash, created_at desc);

alter table public.registration_attempts enable row level security;
revoke all on public.registration_attempts from anon, authenticated;

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
  consent_at timestamptz;
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
  consent_at := case
    when requested_role = 'client'::public.app_role
      then nullif(new.raw_user_meta_data ->> 'privacy_consent_at', '')::timestamptz
    else null
  end;

  insert into public.profiles (
    id, email, full_name, role, state, must_change_password, timezone, privacy_consent_at
  ) values (
    new.id,
    lower(new.email),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    requested_role,
    initial_state,
    force_change,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'timezone'), ''), 'America/Los_Angeles'),
    consent_at
  );
  return new;
end;
$$;
