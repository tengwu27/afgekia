create or replace function private.enforce_project_membership_at_commit()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if new.status not in ('completed'::public.project_status, 'archived'::public.project_status)
     and not exists (select 1 from public.project_members where project_id = new.id) then
    raise exception 'A nonterminal project must have at least one client.' using errcode = '23514';
  end if;
  return null;
end;
$$;

revoke all on function private.enforce_project_membership_at_commit()
from public, anon, authenticated;

create constraint trigger projects_require_client_at_commit
after insert or update of status on public.projects
deferrable initially deferred
for each row execute function private.enforce_project_membership_at_commit();
