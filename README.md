# Afgekia

Afgekia is a mobile-first business-assistance website with a public publishing and booking surface, an invitation-only client workspace, and a protected owner/staff administration area.

The application uses Next.js 16.3, React 19, strict TypeScript, Tailwind CSS 4, shadcn/Radix, TipTap, and Supabase Database/Auth/Storage. It is designed for Vercel hosting and a native Vercel–Supabase integration.

## What is included

- Public home, services, work, work detail, insights, insight detail, privacy, login, and booking-request routes.
- Public-safe portfolio records separated structurally from private project records, with staff-only provenance links.
- Server-only booking writes with Zod validation, honeypot and elapsed-time checks, active-service verification, booking-window rules, per-email throttling, and generated references.
- Invitation-only password authentication with suspended-account enforcement and mandatory first-login password replacement.
- Client-only assigned projects, visible milestones, client-audience updates, and explicitly linked booking history.
- Admin projects, progress/status workflows, milestones, updates, bookings, services, clients, publishing, media, and settings.
- Owner-only staff account creation and access management. Temporary passwords are generated, shown once, never stored by the application, and immediately force replacement.
- Public image storage with MIME and size restrictions; private files and uploads are intentionally absent.
- Audit events for authentication and administrative mutations.
- Migrations, deterministic public seed content, RLS/grant pgTAP assertions, Vitest unit tests, and Playwright journeys.

Email or browser notifications are not sent in this MVP. Published content already has stable IDs and timestamps so a later idempotent notification outbox can be added without treating clients as subscribers.

## Requirements

- Node.js 22 (`.nvmrc` and `engines.node` are pinned)
- npm
- Docker Desktop or another Docker-compatible runtime for local Supabase
- Supabase CLI access for hosted environment management
- Vercel CLI access for project linking and environment inspection

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

3. Copy the variable names from `.env.example` into `.env.local` and fill them from `supabase status`:

   ```text
   NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
   SUPABASE_URL=...
   SUPABASE_SECRET_KEY=...
   ```

   `SUPABASE_SECRET_KEY` is server-only. Never prefix it with `NEXT_PUBLIC_`, expose it to browser code, commit it, print it, or place it in client-editable metadata.

4. Create the first owner through the single-use interactive command:

   ```bash
   npm run bootstrap:owner -- --email owner@example.com --name "Owner Name"
   ```

   The command reads the password without echoing it and refuses to run if an owner exists.

5. Start Next.js:

   ```bash
   npm run dev
   ```

Without Supabase variables, public routes render deterministic demo content for design review. All writes and private routes fail closed; demo mode is not a substitute for environment setup.

## Verification

Run application checks independently in CI:

```bash
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run build
```

Run the database chain against local Supabase:

```bash
npm run db:verify
```

`db:verify` resets the database, regenerates database types, runs the database linter, executes pgTAP coverage for RLS and grants, and type-checks the generated result. Regenerated type changes should be reviewed and committed with their migration.

Playwright starts the app automatically for public journeys:

```bash
npm run test:e2e
```

Set the optional `E2E_CLIENT_*` and `E2E_ADMIN_*` test-only variables to enable authenticated isolation and role-restriction journeys. Never use production credentials in CI.

## Vercel and Supabase environments

Use two Supabase projects:

- Development supplies local/preview deployments.
- Production supplies only production deployments.

Recommended provisioning sequence:

1. Sign in with `vercel login` and `supabase login`.
2. Link this repository to the intended Vercel project.
3. Install Supabase through the Vercel Marketplace for both environment resources.
4. Verify that Preview receives development values and Production receives production values for all five application keys in `.env.example`.
5. Apply the exact migration chain to development, run `npm run db:verify` locally, then review both Supabase Security Advisor and Performance Advisor findings. Apply that same reviewed chain to production—do not edit production manually.
6. Run the owner bootstrap against production variables once.
7. configure `NEXT_PUBLIC_SITE_URL` to the canonical production origin and update Supabase Auth URL allow-lists.
8. Deploy, run the production Supabase advisors once more, then smoke-test public reading, booking submission, admin processing, client isolation, forced password replacement, suspension, publishing/unpublishing, mobile navigation, and error states.

Before public launch, recheck the latest Next.js security advisory/release notes and update to the latest patched 16.3.x release if needed.

## Security model

- Every exposed application table has RLS plus explicit Data API grants. RLS is repeated even when a route guard exists.
- Roles live in `public.profiles`; browser-editable Auth user metadata is never an authorization source.
- Authorization helpers live in an unexposed `private` schema, use fixed search paths, and have restricted execution.
- The authenticated browser client cannot update profile roles or account state.
- Anonymous visitors have no booking-table grant; the validated Server Action uses a server secret.
- Private projects and public portfolio content are independent tables. Source links are staff-only.
- Authenticated routes are dynamic and receive private/no-store response headers from `proxy.ts`.
- Rich text is stored as structured JSON and sanitized to an allow-list at render time.

## Project structure

```text
src/app/(marketing)     Public pages and booking action
src/app/portal          Client workspace
src/app/admin           Staff/owner administration and mutations
src/lib/supabase        Browser, server, secret, and proxy clients
src/types               Database and domain types
supabase/migrations     Ordered database changes
supabase/tests          pgTAP RLS/grant checks
tests/e2e               Playwright journeys
scripts                 Owner bootstrap tooling
```
