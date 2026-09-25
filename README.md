# Cerebras Compute — Cerebras Paris

Event credit portal adapted from [shuklaji28/cafecompute](https://github.com/shuklaji28/cafecompute), preserving the original Git history.

## Attendee flow

1. Enter name and the email used on Luma.
2. Imported checked-in guests are eligible. Unknown emails create a pending request; the page refreshes while the attendee visits the coordinator.
3. Approved guests open **Cerebras Discord**, then **Quicksort LinkedIn**, and confirm completion in a popup wizard.
4. The server checks approval and ordered completion before atomically assigning one credit code or full URL. Returning guests receive the same reward.

Community steps use **attendee self-confirmation**, not OAuth verification. Opening a link does not prove a join/follow. The external site must be closed or left by the attendee; our app cannot detect its Follow/Join clicks. OpenAI Discord is intentionally omitted.

Email entry follows the requested event-desk model: **there is no email ownership verification**. Anyone who knows an approved email can access its reward. Manual coordinator approval is an eligibility check, not an email login. Use this for a supervised event; add email OTP before using it as a public unattended reward system.

## Coordinator portal

Open `/admin` on a phone or computer and sign in with `ADMIN_PASSWORD`.

- **Guests & approvals:** Search and filter guests, approve or reject requests, or add emails directly. For a different email, fill **Email to approve** with the new email and **Original attendee email** with the existing imported email. Both then share one attendee and one reward. A record that already claimed cannot be merged into another attendee.
- **Import Luma CSV:** In Luma, open Manage → Guests → Checked In → Download CSV → Download Filtered Guests. Upload the CSV, map email/name/check-in columns, preview the results, then confirm. An unfiltered export works if it contains check-in evidence. If no check-in column exists, explicitly confirm that the export was already filtered to checked-in guests.
- **Credit pool:** Paste one code or full HTTP(S) credit URL per line, or upload a plain-text file. Existing codes and legacy claimed codes are skipped. These are credit rewards, separate from Luma ticket discount coupons.
- **Community links:** Edit the Cerebras Discord and Quicksort LinkedIn links. Both supplied links are seeded by the migration. Missing links lock the corresponding step.
- **Activity:** See recent imports, approvals, rejections, self-confirmations and claims. No reward codes are recorded in the activity log.

CSV imports allow 500 KB / 5,000 rows, normalize email casing, deduplicate attendees, and preserve claims and progress. Unknown check-in values are not treated as checked in. Manually rejected attendees stay rejected even if reimported. Missing rows never delete attendees. Upload again as more people check in, or approve late arrivals manually. Import only one event into a database instance.

## Database setup

Use a dedicated Postgres/Supabase database for this event. **The app does not run migrations automatically.**

For a new database, run these files in order in the SQL editor:

1. `supabase/events-schema.sql`
2. `supabase/migrations/20260925191020_attendee_portal.sql`

For an existing installation with `events.attendees`, `events.credits` and `events.settings`, run only the migration. It preserves existing approvals and claims. Back up the existing event database first. Imported registration data stays in the database, never in this public repository.

Tables live in a private `events` schema, with RLS enabled and no client policies. The server connection must use a trusted Postgres role with `BYPASSRLS` (the Supabase Postgres connection is suitable). Keep this schema out of the Data API. Never put database credentials in a `NEXT_PUBLIC_` variable.

## Run and deploy

Node 22.13+ is required. Copy `.env.example` to `.env.local` and configure:

- `DATABASE_URL`: event database connection string. SSL certificate verification is enabled; configure the provider's CA via `NODE_EXTRA_CA_CERTS` if needed. Use `DATABASE_SSL=disable` only for a local test database.
- `SESSION_SECRET`: at least 32 random characters.
- `ADMIN_PASSWORD`: a unique password of at least 16 characters. Rotating it invalidates existing admin sessions.

```sh
npm ci
npm run dev
```

Then open `http://localhost:3000`. Deploy to a Node-compatible host such as Vercel with the same server environment variables and a configured database. Run `npm run build` before deployment. If local Turbopack process restrictions block the build, use `npm run build -- --webpack`.

Admin sessions expire after eight hours; attendee sessions after seven days. Signed tokens enforce expiry on the server. All coordinator mutations check admin authorization. Persistent rate limits protect sign-in and attendee intake; configure your trusted reverse proxy to overwrite `x-forwarded-for`. Expired rows in `events.rate_limits` may be periodically deleted. Choose your event's data-retention period and remove guest data when it is no longer needed.

## Validation and isolated preview

```sh
npm run lint
npm test
npm run preview:local
```

Tests run a temporary, isolated PostgreSQL instance on port 55438 and cover CSV filtering, upgrades, alias linking, reimports, step enforcement, concurrent claims, exhaustion, rate limits and session tampering. They do not access any production database. The test runtime's platform package needs its standard postinstall script enabled if your package manager blocks install scripts.

`preview:local` creates a temporary demo database on port 55439 and starts the app at `http://127.0.0.1:3100`. The demo coordinator password is `preview-coordinator-password`; demo attendees include `alex@example.com` (approved) and `pending@example.com` (pending). Rewards are fake. Stop with Ctrl+C to delete the temporary database. Never deploy the preview script or use its example credentials in production.

The inherited presentation, partner artwork and event layout are preserved. The evening agenda and advertised $15,500 credit offer match the organizer-provided event copy. Date and venue have not been supplied. The first-75-registration eligibility and selection of three Codex Pro recipients must be managed by the coordinator through the eligible import list and credit inventory; this app does not infer registration rank from a checked-in-only CSV. Database settings `event_name` and `description` override the Paris defaults if present.
