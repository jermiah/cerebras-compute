import { Pool } from "pg";
import { createStore } from "./store";
export { normalizeEmail } from "./portal";
export type { Attendee } from "./store";
const globalForDb = globalThis as unknown as { eventPool?: Pool };
export const pool =
  globalForDb.eventPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.DATABASE_SSL === "disable"
        ? false
        : { rejectUnauthorized: true },
    connectionTimeoutMillis: 5000,
    max: 5,
  });
if (process.env.NODE_ENV !== "production") globalForDb.eventPool = pool;
export const store = createStore(pool);
export const { findAttendee, claimCoupon } = store;
export async function getSetting(key: string, fallback = "") {
  try {
    const result = await pool.query<{ value: string }>(
      "SELECT value FROM events.settings WHERE key=$1",
      [key],
    );
    return result.rows[0]?.value ?? fallback;
  } catch {
    return fallback;
  }
}
