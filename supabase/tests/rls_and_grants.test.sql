begin;
select plan(21);

select results_eq(
  $$select relname::text from pg_class join pg_namespace on pg_namespace.oid = pg_class.relnamespace where nspname = 'public' and relrowsecurity and relkind = 'r' order by relname$$,
  $$values ('articles'), ('audit_events'), ('booking_request_admin'), ('booking_requests'), ('booking_services'), ('media_assets'), ('milestones'), ('portfolio_item_sources'), ('portfolio_items'), ('portfolio_update_sources'), ('portfolio_updates'), ('profiles'), ('project_members'), ('project_updates'), ('projects'), ('site_settings')$$,
  'RLS is enabled on every exposed application table'
);

select results_eq(
  $$select policyname::text from pg_policies where schemaname = 'public' order by policyname$$,
  $$values ('Active users can write their audit events'), ('Clients can read assigned projects'), ('Clients can read client updates'), ('Clients can read their own project memberships'), ('Clients can read visible milestones'), ('Public can read active services'), ('Public can read published articles'), ('Public can read published portfolio items'), ('Public can read published portfolio updates'), ('Public can read site settings'), ('Staff can manage articles'), ('Staff can manage booking administration'), ('Staff can manage media metadata'), ('Staff can manage milestones'), ('Staff can manage portfolio item sources'), ('Staff can manage portfolio items'), ('Staff can manage portfolio update sources'), ('Staff can manage portfolio updates'), ('Staff can manage project members'), ('Staff can manage project updates'), ('Staff can manage projects'), ('Staff can manage services'), ('Staff can read audit events'), ('Staff can read booking requests and clients can read linked requests'), ('Staff can update booking requests'), ('Staff can update site settings'), ('Users can read allowed profiles')$$,
  'the complete public RLS policy set is present'
);

select results_eq(
  $$select table_name::text || ':' || privilege_type from information_schema.role_table_grants where table_schema = 'public' and grantee = 'anon' order by 1$$,
  $$values ('articles:SELECT'), ('booking_services:SELECT'), ('portfolio_items:SELECT'), ('portfolio_updates:SELECT'), ('site_settings:SELECT')$$,
  'anonymous Data API grants are limited to public read models'
);

select results_eq(
  $$select table_name::text || ':' || privilege_type from information_schema.role_table_grants where table_schema = 'public' and grantee = 'authenticated' order by 1$$,
  $$values ('articles:DELETE'), ('articles:INSERT'), ('articles:SELECT'), ('articles:UPDATE'), ('audit_events:INSERT'), ('audit_events:SELECT'), ('booking_request_admin:DELETE'), ('booking_request_admin:INSERT'), ('booking_request_admin:SELECT'), ('booking_request_admin:UPDATE'), ('booking_requests:SELECT'), ('booking_requests:UPDATE'), ('booking_services:DELETE'), ('booking_services:INSERT'), ('booking_services:SELECT'), ('booking_services:UPDATE'), ('media_assets:DELETE'), ('media_assets:INSERT'), ('media_assets:SELECT'), ('media_assets:UPDATE'), ('milestones:DELETE'), ('milestones:INSERT'), ('milestones:SELECT'), ('milestones:UPDATE'), ('portfolio_item_sources:DELETE'), ('portfolio_item_sources:INSERT'), ('portfolio_item_sources:SELECT'), ('portfolio_item_sources:UPDATE'), ('portfolio_items:DELETE'), ('portfolio_items:INSERT'), ('portfolio_items:SELECT'), ('portfolio_items:UPDATE'), ('portfolio_update_sources:DELETE'), ('portfolio_update_sources:INSERT'), ('portfolio_update_sources:SELECT'), ('portfolio_update_sources:UPDATE'), ('portfolio_updates:DELETE'), ('portfolio_updates:INSERT'), ('portfolio_updates:SELECT'), ('portfolio_updates:UPDATE'), ('profiles:SELECT'), ('project_members:DELETE'), ('project_members:INSERT'), ('project_members:SELECT'), ('project_members:UPDATE'), ('project_updates:DELETE'), ('project_updates:INSERT'), ('project_updates:SELECT'), ('project_updates:UPDATE'), ('projects:DELETE'), ('projects:INSERT'), ('projects:SELECT'), ('projects:UPDATE'), ('site_settings:SELECT'), ('site_settings:UPDATE')$$,
  'authenticated Data API grants exactly match the RLS-protected operations'
);

select ok(not has_table_privilege('anon', 'public.booking_requests', 'select'), 'anonymous users have no booking table access');
select ok(not has_table_privilege('authenticated', 'public.profiles', 'update'), 'profiles cannot be role-edited through the Data API');
select ok(has_table_privilege('authenticated', 'public.projects', 'select,insert,update,delete'), 'authenticated role has project grants constrained by RLS');
select ok(has_table_privilege('authenticated', 'public.audit_events', 'select,insert') and not has_table_privilege('authenticated', 'public.audit_events', 'update,delete'), 'audit events are append-only for authenticated callers');

select results_eq(
  $$select policyname::text from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'Staff can % public media%' order by policyname$$,
  $$values ('Staff can delete public media'), ('Staff can read public media objects'), ('Staff can update public media'), ('Staff can upload public media')$$,
  'storage read, insert, update, and delete policies support staff upserts'
);

select ok(not has_function_privilege('anon', 'private.is_staff()', 'execute'), 'anonymous users cannot execute authorization helpers');
select ok(not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'portfolio_items' and column_name in ('description', 'created_by_project', 'private_notes')), 'public portfolio rows have no private project fields');

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
values
  ('f0000000-0000-4000-8000-000000000001', 'rls-admin@example.test', '{"role":"admin","must_change_password":false}'::jsonb, '{"full_name":"RLS Admin"}'::jsonb),
  ('f0000000-0000-4000-8000-000000000002', 'rls-client-a@example.test', '{"role":"client","must_change_password":false}'::jsonb, '{"full_name":"RLS Client A"}'::jsonb),
  ('f0000000-0000-4000-8000-000000000003', 'rls-client-b@example.test', '{"role":"client","must_change_password":false}'::jsonb, '{"full_name":"RLS Client B"}'::jsonb);

insert into public.booking_services (id, name, slug, description, duration_minutes)
values ('f1000000-0000-4000-8000-000000000001', 'RLS service', 'rls-service', 'A service used only to verify row-level security behavior.', 60);

insert into public.projects (id, reference_code, title, summary, status, progress, created_by)
values ('f2000000-0000-4000-8000-000000000001', 'PRJ-RLS234', 'Client A private project', 'A private project that must remain isolated from every other client.', 'active', 40, 'f0000000-0000-4000-8000-000000000001');
insert into public.project_members (project_id, user_id) values ('f2000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000002');
insert into public.milestones (project_id, title, status, client_visible, position) values
  ('f2000000-0000-4000-8000-000000000001', 'Visible milestone', 'active', true, 10),
  ('f2000000-0000-4000-8000-000000000001', 'Private milestone', 'not_started', false, 20);
insert into public.project_updates (project_id, title, body_json, body_text, audience, created_by) values
  ('f2000000-0000-4000-8000-000000000001', 'Visible update', '{"type":"doc"}'::jsonb, 'Visible update copy', 'client', 'f0000000-0000-4000-8000-000000000001'),
  ('f2000000-0000-4000-8000-000000000001', 'Private update', '{"type":"doc"}'::jsonb, 'Private update copy', 'staff', 'f0000000-0000-4000-8000-000000000001');
insert into public.booking_requests (id, reference_code, service_id, client_user_id, full_name, email, timezone, preferred_at, message, privacy_consent_at)
values ('f3000000-0000-4000-8000-000000000001', 'AF-RLS23456', 'f1000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000002', 'RLS Client A', 'rls-client-a@example.test', 'America/Los_Angeles', now() + interval '2 days', 'A booking request used for row-level isolation testing.', now());
insert into public.booking_request_admin (booking_id, notes, created_by, updated_by)
values ('f3000000-0000-4000-8000-000000000001', 'Staff-only booking note', 'f0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001');

select throws_ok(
  $$update public.projects set status = 'planning' where id = 'f2000000-0000-4000-8000-000000000001'$$,
  '23514',
  'invalid project status transition from active to planning',
  'database rejects invalid project status transitions'
);
select throws_ok(
  $$update public.booking_requests set status = 'completed' where id = 'f3000000-0000-4000-8000-000000000001'$$,
  '23514',
  'invalid booking status transition from submitted to completed',
  'database rejects invalid booking status transitions'
);

select set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.projects), 1::bigint, 'assigned client can read its project');
select is((select count(*) from public.milestones), 1::bigint, 'assigned client sees only client-visible milestones');
select is((select count(*) from public.project_updates), 1::bigint, 'assigned client sees only client-audience updates');
select is((select count(*) from public.booking_requests), 1::bigint, 'linked client can read its booking');
select is((select count(*) from public.booking_request_admin), 0::bigint, 'client cannot read staff-only booking administration');
reset role;

select set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.projects), 0::bigint, 'unassigned client cannot read another client project');
select is((select count(*) from public.booking_requests), 0::bigint, 'unlinked client cannot read another client booking');
reset role;

select set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.booking_request_admin), 1::bigint, 'staff can read booking administration after RLS authorization');
reset role;

select * from finish();
rollback;
