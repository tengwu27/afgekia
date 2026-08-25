-- Some Supabase project generations include this event-trigger helper while
-- newer projects do not. When present, PostgreSQL invokes it as an event
-- trigger; browser-facing roles do not need direct RPC execution permission.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;

-- Cover every remaining foreign key used for ownership/provenance checks and
-- delete/update validation. Indexes whose leading column already covers a
-- foreign key are defined in the initial migration.
create index articles_author_idx on public.articles (author_id);
create index booking_request_admin_created_by_idx on public.booking_request_admin (created_by);
create index booking_request_admin_updated_by_idx on public.booking_request_admin (updated_by);
create index booking_requests_service_idx on public.booking_requests (service_id);
create index media_assets_created_by_idx on public.media_assets (created_by);
create index portfolio_item_sources_project_idx on public.portfolio_item_sources (source_project_id);
create index portfolio_item_sources_created_by_idx on public.portfolio_item_sources (created_by);
create index portfolio_items_created_by_idx on public.portfolio_items (created_by);
create index portfolio_update_sources_project_update_idx on public.portfolio_update_sources (source_project_update_id);
create index portfolio_update_sources_created_by_idx on public.portfolio_update_sources (created_by);
create index portfolio_updates_created_by_idx on public.portfolio_updates (created_by);
create index project_updates_created_by_idx on public.project_updates (created_by);
create index projects_created_by_idx on public.projects (created_by);
