# Afgekia

Afgekia is a private, mobile-first workspace for coordinating real-estate listing projects from assessment through closing. Next.js 16.3 and React 19 run on Vercel; Supabase provides Database, Auth, and Storage.

## Product surface

- Public homepage, privacy notice, registration, login, and owner-routed booking requests.
- Active clients submit listing-project requests at `/request` without mixing in scheduling.
- `/portal` contains a client's requests, assigned projects, bookings, assessment approvals, and security.
- `/owner` contains only that owner's requests, projects, appointment types, bookings, media, and AI project assistance.
- `/admin` contains account administration only: pending client activation, owner creation, public owner listing, password reset, and safe suspension.
- Listing projects use an address and seller nickname, eight ordered stages, milestones, explicit progress, dated updates, and an assessment plan that becomes official only after required client approvals.

Work, Insights, the public Services catalog, portfolio publishing, and article publishing have been removed. Media storage and TipTap structured project updates remain. Email, notifications, calendar availability, Zoom, payments, and password-recovery email are not implemented.

## Requirements

- Node.js 22
- npm
- Docker Desktop or a compatible runtime for local Supabase
- Supabase CLI access for hosted environment management
- Vercel CLI access for deployments and environment inspection

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start and reset local Supabase:

   ```bash
   npm run db:start
   npm run db:reset
   npm run db:types
   ```

3. Copy `.env.example` to `.env.local` and provide the Supabase values. All secret keys are server-only and must never use a `NEXT_PUBLIC_` prefix.

4. Create the first administrator through the single-use hidden-password command:

   ```bash
   npm run bootstrap:admin -- --email admin@example.com --name "Administrator Name"
   ```

   The command refuses to run after an administrator exists. On a fresh installation, sign in as the administrator and create the first owner under `/admin/owners`. The migration preserves and lists an existing owner when upgrading an earlier Afgekia database.

5. Start the application:

   ```bash
   npm run dev
   ```

Without Supabase variables, public pages use deterministic read-only demo data. Writes and protected routes fail closed.

## Verification

Run application checks separately:

```bash
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run test:e2e
npm run build
```

Run the reproducible local database chain:

```bash
npm run db:verify
```

`db:verify` resets the local database, regenerates types, runs database lint, executes pgTAP grant/RLS tests, and type-checks the generated result. Docker must be running.

Authenticated Playwright journeys use test-only credentials:

```text
E2E_ADMIN_EMAIL=
E2E_ADMIN_PASSWORD=
E2E_OWNER_EMAIL=
E2E_OWNER_PASSWORD=
E2E_OWNER_DISPLAY_NAME=
E2E_SECOND_OWNER_EMAIL=
E2E_SECOND_OWNER_PASSWORD=
E2E_CLIENT_EMAIL=
E2E_CLIENT_PASSWORD=
```

Never use production accounts in browser-test automation.

## Environment rollout

Use separate Supabase projects:

- Preview and development deployments use `afgekia-dev`.
- Production deployments use the production Afgekia project only.

Apply the identical ordered migration chain to development first, run pgTAP and the Supabase Security and Performance Advisors, then deploy a preview and smoke-test registration through project approval and booking processing. Before production, take a Supabase backup and record affected table counts. Only then apply the same chain, run `bootstrap:admin`, confirm the preserved owner is listed, and smoke-test the production domain.

Set `NEXT_PUBLIC_SITE_URL` to each deployment's canonical origin and configure the matching Supabase Auth redirect allow-list. AI credentials belong only in the Vercel environments that should enable the assistant.

## Security model

- Every exposed table has RLS and explicit Data API grants.
- Roles and account states live in protected `public.profiles` records, not editable Auth metadata.
- Pending and suspended accounts cannot enter protected routes.
- Clients see only their requests, memberships, linked bookings, and assigned project content.
- Owners see only resources assigned to them. Clients are added to a project only by exact registered email.
- Administrators manage accounts and public-safe owner listings but cannot read request, project, booking, or media contents.
- Public booking writes use a server-only Supabase secret; anonymous callers receive no booking-table access.
- Registration and public booking actions validate lengths, consent, honeypots, elapsed time, and throttling.
- Private authorization and workflow helpers live in the unexposed `private` schema with fixed search paths and restricted execution.
- Rich text is stored as structured JSON and sanitized at render time.
- Assistant data tools run through the signed-in Supabase session, so RLS filters facts before they reach the model.

## Project structure

```text
src/app/(marketing)     Public pages, registration, project intake, and booking
src/app/portal          Client workspace
src/app/owner           Operational owner workspace
src/app/admin           Account-only administration
src/lib/supabase        Browser, server, secret, and proxy clients
src/types               Generated database and application types
supabase/migrations     Forward-only database migrations
supabase/tests          pgTAP grant and RLS assertions
tests/e2e               Public and authenticated Playwright journeys
scripts                 Single-use administrator bootstrap
```
