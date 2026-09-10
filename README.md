# Cafe Compute Delhi — Coupon Portal

A fast, simple invitation and credit claiming portal for Cafe Compute Delhi attendees.

Attendees enter their registered email:
- If approved, they receive an unused Codex credit code/claim link from the pool.
- The code is locked permanently to their email and will never be given to anyone else.
- Revisiting the site displays their same code.
- No emails, no verification codes, no unnecessary friction.

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

