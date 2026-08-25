drop policy "Public can read listed owners" on public.owner_project_types;

create policy "Public can read listed owners"
on public.owner_project_types for select
to anon, authenticated
using (listed);

create or replace function private.delist_suspended_owner()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if old.role = 'owner'::public.app_role
     and old.state <> 'suspended'::public.account_state
     and new.state = 'suspended'::public.account_state then
    update public.owner_project_types set listed = false where owner_id = old.id;
  end if;
  return new;
end;
$$;

revoke all on function private.delist_suspended_owner()
from public, anon, authenticated;

create trigger profiles_delist_suspended_owner
after update of state on public.profiles
for each row execute function private.delist_suspended_owner();
