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
  'Thoughtful support for work that matters.',
  'Afgekia brings calm structure to ambitious work through practical project support, clear communication, and dependable follow-through.',
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

insert into public.booking_services (id, name, slug, description, duration_minutes, active, display_order)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'Project clarity session',
    'project-clarity-session',
    'A focused working session to untangle priorities, define the next useful milestone, and leave with a practical action plan.',
    60,
    true,
    10
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'Workflow reset',
    'workflow-reset',
    'A deeper review of the tools, handoffs, and routines slowing the work down, followed by a simpler operating rhythm.',
    90,
    true,
    20
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'Ongoing assistance consult',
    'ongoing-assistance-consult',
    'Explore steady project coordination and business-assistance support for a growing body of work.',
    45,
    true,
    30
  )
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  description = excluded.description,
  duration_minutes = excluded.duration_minutes,
  active = excluded.active,
  display_order = excluded.display_order;

insert into public.portfolio_items (
  id,
  slug,
  eyebrow,
  title,
  summary,
  body_json,
  body_text,
  accent,
  status,
  featured,
  sort_order,
  seo_title,
  seo_description,
  published_at
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    'launching-a-calm-client-onboarding-system',
    'Operations · Client experience',
    'A calmer client onboarding system',
    'A scattered first week became one clear, welcoming path from signed agreement to confident kickoff.',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"We mapped every handoff, removed duplicated forms, and gave both the team and its clients one dependable source of truth."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"The result"}]},{"type":"paragraph","content":[{"type":"text","text":"Fewer follow-up emails, faster preparation, and a first impression that felt considered from the start."}]}]}'::jsonb,
    'We mapped every handoff, removed duplicated forms, and gave both the team and its clients one dependable source of truth. The result was fewer follow-up emails, faster preparation, and a first impression that felt considered from the start.',
    'olive',
    'published',
    true,
    10,
    'A calmer client onboarding system',
    'How Afgekia shaped a clearer onboarding workflow with fewer handoffs and a more confident client experience.',
    '2026-07-18T16:00:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'turning-a-busy-quarter-into-a-visible-plan',
    'Planning · Coordination',
    'Turning a busy quarter into a visible plan',
    'A growing list of commitments became a paced roadmap with owners, milestones, and room for the unexpected.',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"The work began with a practical inventory: what was fixed, what was flexible, and what no longer deserved a place on the calendar."}]},{"type":"paragraph","content":[{"type":"text","text":"From there, we built a shared view of the quarter that made tradeoffs visible before they became emergencies."}]}]}'::jsonb,
    'The work began with a practical inventory: what was fixed, what was flexible, and what no longer deserved a place on the calendar. From there, we built a shared view of the quarter that made tradeoffs visible before they became emergencies.',
    'terracotta',
    'published',
    true,
    20,
    'Turning a busy quarter into a visible plan',
    'A practical planning engagement that turned competing commitments into a calm, visible roadmap.',
    '2026-06-09T16:00:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    'building-an-editorial-rhythm-that-lasts',
    'Content · Publishing',
    'An editorial rhythm that lasts',
    'A sustainable content system replaced last-minute publishing with a small, repeatable weekly practice.',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Instead of chasing a larger content calendar, we created a smaller rhythm that the team could actually keep."}]},{"type":"paragraph","content":[{"type":"text","text":"Ideas now move through a lightweight capture, drafting, review, and publishing flow."}]}]}'::jsonb,
    'Instead of chasing a larger content calendar, we created a smaller rhythm that the team could actually keep. Ideas now move through a lightweight capture, drafting, review, and publishing flow.',
    'gold',
    'published',
    false,
    30,
    'Building an editorial rhythm that lasts',
    'A lightweight publishing system designed for consistent, thoughtful content without the scramble.',
    '2026-05-14T16:00:00Z'
  )
on conflict (id) do update set
  slug = excluded.slug,
  eyebrow = excluded.eyebrow,
  title = excluded.title,
  summary = excluded.summary,
  body_json = excluded.body_json,
  body_text = excluded.body_text,
  accent = excluded.accent,
  status = excluded.status,
  featured = excluded.featured,
  sort_order = excluded.sort_order,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  published_at = excluded.published_at;

insert into public.portfolio_updates (
  id,
  portfolio_item_id,
  title,
  body_json,
  body_text,
  progress,
  published_at
)
values
  (
    '21000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'The kickoff path is live',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"The new welcome hub, preparation checklist, and internal handoff are now working as one flow."}]}]}'::jsonb,
    'The new welcome hub, preparation checklist, and internal handoff are now working as one flow.',
    100,
    '2026-07-18T16:00:00Z'
  ),
  (
    '21000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    'Milestones agreed and sequenced',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"The team aligned on three decision points and moved lower-value work out of the critical path."}]}]}'::jsonb,
    'The team aligned on three decision points and moved lower-value work out of the critical path.',
    72,
    '2026-06-03T16:00:00Z'
  )
on conflict (id) do update set
  portfolio_item_id = excluded.portfolio_item_id,
  title = excluded.title,
  body_json = excluded.body_json,
  body_text = excluded.body_text,
  progress = excluded.progress,
  published_at = excluded.published_at;

insert into public.articles (
  id,
  slug,
  title,
  excerpt,
  body_json,
  body_text,
  status,
  featured,
  seo_title,
  seo_description,
  published_at
)
values
  (
    '30000000-0000-4000-8000-000000000001',
    'a-kind-way-to-prioritize',
    'A kinder way to prioritize a crowded week',
    'A short practice for separating what is urgent, what is important, and what can wait without guilt.',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"A useful plan does more than sort tasks. It protects attention for the work that only you can do."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Start with consequences"}]},{"type":"paragraph","content":[{"type":"text","text":"Ask what meaningfully changes if an item waits one day. The answer is often gentler than the feeling of urgency."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Choose a finish line"}]},{"type":"paragraph","content":[{"type":"text","text":"Name the one outcome that would make the week feel well used, then build around it."}]}]}'::jsonb,
    'A useful plan does more than sort tasks. It protects attention for the work that only you can do. Start with consequences. Ask what meaningfully changes if an item waits one day. Choose a finish line and build around it.',
    'published',
    true,
    'A kinder way to prioritize a crowded week',
    'A practical method for making calmer priorities when every task appears urgent.',
    '2026-08-12T16:00:00Z'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    'what-a-useful-project-update-includes',
    'What a useful project update includes',
    'The four pieces that help clients understand progress without reading a full activity log.',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"The best update answers four questions: what changed, what it means, what happens next, and where a decision is needed."}]},{"type":"paragraph","content":[{"type":"text","text":"Everything else is optional. Clarity is more useful than volume."}]}]}'::jsonb,
    'The best update answers four questions: what changed, what it means, what happens next, and where a decision is needed. Everything else is optional. Clarity is more useful than volume.',
    'published',
    false,
    'What a useful project update includes',
    'Four questions that make progress updates clearer and more useful to clients.',
    '2026-07-29T16:00:00Z'
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    'small-systems-for-consistent-follow-through',
    'Small systems for consistent follow-through',
    'Why the most dependable workflows usually contain fewer steps, clearer ownership, and one visible next action.',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Consistency rarely comes from trying harder. It comes from making the next useful action obvious and small enough to begin."}]},{"type":"paragraph","content":[{"type":"text","text":"A good system reduces the number of moments when someone has to remember what happens next."}]}]}'::jsonb,
    'Consistency rarely comes from trying harder. It comes from making the next useful action obvious and small enough to begin. A good system reduces the number of moments when someone has to remember what happens next.',
    'published',
    false,
    'Small systems for consistent follow-through',
    'How simpler workflows make dependable progress easier for small teams.',
    '2026-07-02T16:00:00Z'
  )
on conflict (id) do update set
  slug = excluded.slug,
  title = excluded.title,
  excerpt = excluded.excerpt,
  body_json = excluded.body_json,
  body_text = excluded.body_text,
  status = excluded.status,
  featured = excluded.featured,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  published_at = excluded.published_at;
