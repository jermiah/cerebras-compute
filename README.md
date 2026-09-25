# Cerebras Compute — Cerebras Paris

A fast, simple invitation and credit claiming portal for Cerebras Paris attendees.

Attendees enter their registered email:
- If approved, they receive an unused Codex credit code/claim link from the pool.
- The code is locked permanently to their email and will never be given to anyone else.
- Revisiting the site displays their same code.
- No emails, no verification codes, no unnecessary friction.

## Paris edition

This is the Cerebras Paris adaptation of [shuklaji28/cafecompute](https://github.com/shuklaji28/cafecompute), with the original Git history retained.

The existing credit-claiming flow, partner assets and Cerebras presentation are preserved. The agenda and menu are draft content inherited from the source event; confirm the Paris date, venue, sessions, catering and credit offering before launch. Displayed schedule times use Paris local time (`Europe/Paris`).

The home page uses `Cerebras Paris` and a Paris description by default. If your database has an `events.settings` table, its `event_name` and `description` values override those defaults; update these values for the Paris event when connecting an existing database.

## Database (Supabase)

Data lives in your Supabase database under the `events` schema.

- **`events.attendees`**: List of approved attendee emails (`email`, `coupon`, `claimed_at`).
  - To approve guests: add/import emails into this table.
- **`events.credits`**: Pool of available credit codes or claim links (`code`, `assigned_to`, `assigned_at`).
  - To add codes: insert/import codes into this table with `assigned_to` as `NULL`.

Schema definition is in [`supabase/events-schema.sql`](supabase/events-schema.sql).

## Environment Variables

Create `.env.local` for local development (and add to your host when deploying):

```env
DATABASE_URL=postgresql://postgres.xxx:xxx@aws-1-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
SESSION_SECRET=replace-with-a-random-secret
```

## Run Locally

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push to GitHub (`main` branch).
2. Import the project in Vercel.
3. Add `DATABASE_URL` and `SESSION_SECRET` under Project Settings $\rightarrow$ Environment Variables.
4. Deploy!

