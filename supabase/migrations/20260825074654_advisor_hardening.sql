-- Keep the server-only throttle table explicitly closed at the RLS layer even
-- if a future grant is added accidentally.
create policy "Data API cannot access registration attempts"
on public.registration_attempts
for all
to anon, authenticated
using (false)
with check (false);

-- Cover the composite foreign key used to validate owner-routed appointments.
create index booking_requests_service_owner_idx
on public.booking_requests (service_id, owner_id);
