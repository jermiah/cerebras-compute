import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required. Add it to .env.local for local development.");

const globalForDb = globalThis as unknown as { eventPool?: Pool };
export const pool = globalForDb.eventPool ?? new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
if (process.env.NODE_ENV !== "production") globalForDb.eventPool = pool;

export type Attendee = { email: string; coupon: string; claimed_at: string | null };
export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export async function findAttendee(email: string): Promise<Attendee | undefined> {
  const result = await pool.query<Attendee>("SELECT email, COALESCE(coupon, '') AS coupon, claimed_at::text FROM events.attendees WHERE email = $1", [normalizeEmail(email)]);
  return result.rows[0];
}

/** Atomically reserves the next unused credit for a verified attendee. */
export async function claimCoupon(email: string): Promise<Attendee | undefined> {
  const client = await pool.connect();
  const normalized = normalizeEmail(email);
  try {
    await client.query("BEGIN");
    const attendeeResult = await client.query<Attendee>("SELECT email, COALESCE(coupon, '') AS coupon, claimed_at::text FROM events.attendees WHERE email = $1 FOR UPDATE", [normalized]);
    const attendee = attendeeResult.rows[0];
    if (!attendee) { await client.query("ROLLBACK"); return undefined; }
    if (attendee.coupon) {
      const result = await client.query<Attendee>("UPDATE events.attendees SET claimed_at = COALESCE(claimed_at, NOW()) WHERE email = $1 RETURNING email, COALESCE(coupon, '') AS coupon, claimed_at::text", [normalized]);
      await client.query("COMMIT");
      return result.rows[0];
    }

    // SKIP LOCKED ensures simultaneous verifications receive different credits.
    const creditResult = await client.query<{ code: string }>("SELECT code FROM events.credits WHERE assigned_to IS NULL ORDER BY created_at, code FOR UPDATE SKIP LOCKED LIMIT 1");
    const credit = creditResult.rows[0];
    if (!credit) { await client.query("ROLLBACK"); return undefined; }
    await client.query("UPDATE events.credits SET assigned_to = $1, assigned_at = NOW() WHERE code = $2", [normalized, credit.code]);
    const result = await client.query<Attendee>("UPDATE events.attendees SET coupon = $1, claimed_at = NOW() WHERE email = $2 RETURNING email, COALESCE(coupon, '') AS coupon, claimed_at::text", [credit.code, normalized]);
    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getSetting(key: string, fallback = ""): Promise<string> {
  try {
    const result = await pool.query<{ value: string }>("SELECT value FROM events.settings WHERE key = $1", [key]);
    return result.rows[0]?.value ?? fallback;
  } catch {
    return fallback;
  }
}

