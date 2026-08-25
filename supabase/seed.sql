insert into public.site_settings (
  singleton,
  business_name,
  tagline,
  description,
  contact_email,
  timezone,
  booking_lead_hours,
  booking_horizon_days
)
values (
  true,
  'Afgekia',
  'Clear guidance from listing assessment to close.',
  'Afgekia gives sellers a calm, visible path through assessment, preparation, marketing, open house, and closing.',
  'hello@afgekia.example',
  'America/Los_Angeles',
  24,
  90
)
on conflict (singleton) do update set
  business_name = excluded.business_name,
  tagline = excluded.tagline,
  description = excluded.description,
  contact_email = excluded.contact_email,
  timezone = excluded.timezone,
  booking_lead_hours = excluded.booking_lead_hours,
  booking_horizon_days = excluded.booking_horizon_days;

-- Appointment types are owner-scoped. A clean local reset has no Auth users,
-- so owners add their appointment types after the administrator creates them.
