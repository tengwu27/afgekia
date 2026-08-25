begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(42);

select results_eq(
  $$select relname::text collate "C" from pg_class join pg_namespace on pg_namespace.oid = pg_class.relnamespace where nspname = 'public' and relrowsecurity and relkind = 'r' order by relname$$,
  $$values ('assessment_plan_approvals'::text collate "C"), ('assessment_plan_revisions'), ('audit_events'), ('booking_request_admin'), ('booking_requests'), ('booking_services'), ('media_assets'), ('milestones'), ('owner_project_types'), ('profiles'), ('project_members'), ('project_requests'), ('project_stages'), ('project_updates'), ('projects'), ('registration_attempts'), ('site_settings')$$,
  'RLS is enabled on every exposed application table'
);

select ok(to_regclass('public.articles') is null and to_regclass('public.portfolio_items') is null and to_regclass('public.portfolio_updates') is null, 'publishing tables were removed');
select ok(not exists (select 1 from pg_type where typname in ('publish_state', 'portfolio_accent') and typnamespace = 'public'::regnamespace), 'publishing enums were removed');
select ok(not exists (select 1 from pg_policies where schemaname = 'public' and policyname ilike '%staff%'), 'no broad staff policies remain');
select ok(not has_table_privilege('anon', 'public.project_requests', 'select,insert,update,delete'), 'anonymous users cannot access project requests');
select ok(not has_table_privilege('anon', 'public.booking_requests', 'select,insert,update,delete'), 'anonymous users cannot access booking records');
select ok(not has_table_privilege('anon', 'public.profiles', 'select'), 'anonymous users cannot access profiles');
select ok(has_table_privilege('anon', 'public.owner_project_types', 'select'), 'anonymous users can read public-safe owner listings');
select ok(has_table_privilege('anon', 'public.booking_services', 'select'), 'anonymous users can read active appointment types');
select ok(not has_table_privilege('authenticated', 'public.registration_attempts', 'select,insert,update,delete'), 'registration throttle records are service-only');
select ok(not has_function_privilege('anon', 'private.is_admin()', 'execute'), 'anonymous users cannot execute authorization helpers');
select ok(not has_function_privilege('authenticated', 'private.process_project_request_decision()', 'execute'), 'authenticated users cannot invoke decision triggers directly');
select ok(has_column_privilege('authenticated', 'public.profiles', 'state', 'update') and not has_column_privilege('authenticated', 'public.profiles', 'role', 'update'), 'account state is manageable without exposing role updates');
select ok(has_column_privilege('authenticated', 'public.project_requests', 'status', 'update') and not has_column_privilege('authenticated', 'public.project_requests', 'requester_id', 'update'), 'request decisions cannot reassign request ownership');

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
values
  ('f0000000-0000-4000-8000-000000000001', 'owner-a@example.test', '{"role":"owner","must_change_password":false}'::jsonb, '{"full_name":"Owner A"}'::jsonb),
  ('f0000000-0000-4000-8000-000000000002', 'owner-b@example.test', '{"role":"owner","must_change_password":false}'::jsonb, '{"full_name":"Owner B"}'::jsonb),
  ('f0000000-0000-4000-8000-000000000003', 'admin@example.test', '{"role":"admin","must_change_password":false}'::jsonb, '{"full_name":"Administrator"}'::jsonb),
  ('f0000000-0000-4000-8000-000000000004', 'client-a@example.test', '{"role":"client","must_change_password":false}'::jsonb, '{"full_name":"Client A","privacy_consent_at":"2026-08-25T00:00:00Z"}'::jsonb),
  ('f0000000-0000-4000-8000-000000000005', 'client-b@example.test', '{"role":"client","must_change_password":false}'::jsonb, '{"full_name":"Client B","privacy_consent_at":"2026-08-25T00:00:00Z"}'::jsonb),
  ('f0000000-0000-4000-8000-000000000006', 'pending@example.test', '{"role":"client","must_change_password":false}'::jsonb, '{"full_name":"Pending Client","privacy_consent_at":"2026-08-25T00:00:00Z"}'::jsonb);

update public.profiles set state = 'active' where id in ('f0000000-0000-4000-8000-000000000004', 'f0000000-0000-4000-8000-000000000005');
insert into public.owner_project_types (owner_id, project_type, display_name, listed, display_order) values
  ('f0000000-0000-4000-8000-000000000001', 'real_estate_listing', 'Owner A', true, 10),
  ('f0000000-0000-4000-8000-000000000002', 'real_estate_listing', 'Owner B', true, 20);
insert into public.booking_services (id, owner_id, name, slug, description, duration_minutes) values
  ('f1000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'Owner A consult', 'owner-a-consult', 'An appointment type used to verify owner routing and isolation.', 45),
  ('f1000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000002', 'Owner B consult', 'owner-b-consult', 'A second appointment type used to verify owner isolation.', 45);
insert into public.project_requests (id, reference_code, requester_id, owner_id, property_address_short, seller_nickname, summary, privacy_consent_at)
values ('f2000000-0000-4000-8000-000000000001', 'REQ-RLS23456', 'f0000000-0000-4000-8000-000000000004', 'f0000000-0000-4000-8000-000000000001', '123 Main St', 'The Parkers', 'A listing request used to verify approval and row-level isolation.', now());
insert into public.booking_requests (id, reference_code, service_id, owner_id, client_user_id, full_name, email, timezone, preferred_at, message, privacy_consent_at)
values ('f3000000-0000-4000-8000-000000000001', 'AF-RLS23456', 'f1000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000004', 'Client A', 'client-a@example.test', 'America/Los_Angeles', now() + interval '2 days', 'A booking request used for owner and client isolation testing.', now());

select throws_ok(
  $$insert into public.booking_requests (reference_code, service_id, owner_id, full_name, email, timezone, preferred_at, message, privacy_consent_at) values ('AF-MSMN2345', 'f1000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000002', 'Mismatch', 'mismatch@example.test', 'UTC', now() + interval '1 day', 'This booking intentionally mismatches its owner and appointment type.', now())$$,
  '23503',
  'insert or update on table "booking_requests" violates foreign key constraint "booking_requests_service_owner_fkey"',
  'booking owner and appointment type must match'
);

select set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.project_requests), 1::bigint, 'selected owner reads their request');
select lives_ok($$update public.project_requests set status = 'approved' where id = 'f2000000-0000-4000-8000-000000000001'$$, 'selected owner can approve a submitted request');
select is((select count(*) from public.projects where owner_id = 'f0000000-0000-4000-8000-000000000001'), 1::bigint, 'approval creates exactly one project');
select is((select count(*) from public.project_members where project_id = (select resulting_project_id from public.project_requests where id = 'f2000000-0000-4000-8000-000000000001')), 1::bigint, 'approval adds the requester as initial client');
select is((select count(*) from public.project_stages where project_id = (select resulting_project_id from public.project_requests where id = 'f2000000-0000-4000-8000-000000000001')), 8::bigint, 'approval creates the eight listing stages');
select is((select count(*) from public.booking_requests), 1::bigint, 'selected owner reads their booking');
reset role;

select set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.project_requests), 0::bigint, 'another owner cannot read the request');
select is((select count(*) from public.projects), 0::bigint, 'another owner cannot read the project');
select is((select count(*) from public.booking_requests), 0::bigint, 'another owner cannot read the booking');
reset role;

select set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.project_requests), 0::bigint, 'administrator cannot read project requests');
select is((select count(*) from public.projects), 0::bigint, 'administrator cannot read projects');
select is((select count(*) from public.booking_requests), 0::bigint, 'administrator cannot read bookings');
select ok((select count(*) from public.profiles) >= 6, 'administrator can read managed accounts');
reset role;

select set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.project_requests), 1::bigint, 'requesting client reads their request');
select is((select count(*) from public.projects), 1::bigint, 'assigned client reads their project');
select is((select count(*) from public.booking_requests), 1::bigint, 'linked client reads their booking');
select lives_ok($$delete from public.project_members where project_id = (select resulting_project_id from public.project_requests where id = 'f2000000-0000-4000-8000-000000000001') and user_id = 'f0000000-0000-4000-8000-000000000004'$$, 'unauthorized membership deletion is safely filtered');
select is((select count(*) from public.project_members where project_id = (select resulting_project_id from public.project_requests where id = 'f2000000-0000-4000-8000-000000000001')), 1::bigint, 'client cannot remove project membership');
reset role;

select set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.project_requests), 0::bigint, 'pending client cannot read project requests');
select throws_ok($$insert into public.project_requests (reference_code, requester_id, owner_id, property_address_short, seller_nickname, summary, privacy_consent_at) values ('REQ-PEND2345', 'f0000000-0000-4000-8000-000000000006', 'f0000000-0000-4000-8000-000000000001', '9 Pending Way', 'Pending', 'A pending account must not be able to submit this project request.', now())$$, '42501', null, 'pending client cannot submit a project request');
reset role;

select set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$delete from public.project_members where project_id = (select resulting_project_id from public.project_requests where id = 'f2000000-0000-4000-8000-000000000001')$$,
  '23514',
  'A nonterminal project must retain at least one client.',
  'owner cannot remove the last client from a nonterminal project'
);
select lives_ok(
  $$update public.projects set status = 'archived' where id = (select resulting_project_id from public.project_requests where id = 'f2000000-0000-4000-8000-000000000001'); delete from public.project_members where project_id = (select resulting_project_id from public.project_requests where id = 'f2000000-0000-4000-8000-000000000001')$$,
  'archived project may have no clients'
);
select throws_ok(
  $$update public.projects set status = 'active' where id = (select resulting_project_id from public.project_requests where id = 'f2000000-0000-4000-8000-000000000001')$$,
  '23514',
  'A nonterminal project must have at least one client.',
  'terminal project without a client cannot become actionable again'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$update public.owner_project_types set listed = false where owner_id = 'f0000000-0000-4000-8000-000000000001'; update public.owner_project_types set listed = true where owner_id = 'f0000000-0000-4000-8000-000000000001'$$,
  'administrator can manage public owner listings'
);
select throws_ok(
  $$update public.profiles set state = 'suspended' where id = 'f0000000-0000-4000-8000-000000000001'$$,
  '23514',
  'Owner has unresolved work and cannot be suspended.',
  'owner suspension is blocked while actionable work remains'
);
select lives_ok(
  $$update public.profiles set state = 'active' where id = 'f0000000-0000-4000-8000-000000000006'$$,
  'administrator can activate a pending client'
);
select is((select state::text from public.profiles where id = 'f0000000-0000-4000-8000-000000000006'), 'active', 'activated client state is persisted');
reset role;

select * from finish();
rollback;
