import type { Pool, PoolClient } from "pg";
import { normalizeEmail, STEPS, validCommunityLink } from "./portal";
import type { GuestRow } from "./csv";
export type Attendee = {
  email: string;
  name: string;
  status: "pending" | "approved" | "rejected";
  coupon: string | null;
  claimed_at: string | null;
  community_step: number;
  opened_step: number;
  approval_source: string;
};
export class PortalError extends Error {}
export function createStore(pool: Pool) {
  async function transaction<T>(fn: (c: PoolClient) => Promise<T>) {
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      const result = await fn(c);
      await c.query("COMMIT");
      return result;
    } catch (error) {
      await c.query("ROLLBACK");
      throw error;
    } finally {
      c.release();
    }
  }
  // Serialize identity mutations with claims so aliases/imports cannot split one reward into two.
  async function identityLock(c: PoolClient) {
    await c.query("SELECT pg_advisory_xact_lock(8327101)");
  }
  async function resolve(email: string, c: Pool | PoolClient = pool) {
    const row = await c.query<{ attendee_email: string }>(
      "SELECT attendee_email FROM events.email_aliases WHERE email=$1",
      [normalizeEmail(email)],
    );
    return row.rows[0]?.attendee_email ?? normalizeEmail(email);
  }
  async function findAttendee(email: string) {
    const result = await pool.query<Attendee>(
      "SELECT *, claimed_at::text FROM events.attendees WHERE email=$1",
      [await resolve(email)],
    );
    return result.rows[0];
  }
  async function getLinks() {
    const result = await pool.query<{ key: string; value: string }>(
      "SELECT key,value FROM events.settings WHERE key=ANY($1::text[])",
      [STEPS.map((s) => s.key)],
    );
    return Object.fromEntries(
      result.rows.map((r) => [r.key, r.value]),
    ) as Record<string, string>;
  }
  async function enroll(email: string, name: string) {
    return transaction(async (c) => {
      await identityLock(c);
      const canonical = await resolve(email, c);
      await c.query(
        "INSERT INTO events.attendees(email,name,approval_source) VALUES($1,$2,'request') ON CONFLICT(email) DO UPDATE SET name=CASE WHEN events.attendees.name='' THEN excluded.name ELSE events.attendees.name END",
        [canonical, name],
      );
    });
  }
  async function importGuests(guests: GuestRow[]) {
    return transaction(async (c) => {
      await identityLock(c);
      let approved = 0,
        protectedRejections = 0;
      for (const guest of guests) {
        const email = await resolve(guest.email, c);
        const result = await c.query(
          "INSERT INTO events.attendees(email,name,status,approval_source) VALUES($1,$2,'approved','luma_csv') ON CONFLICT(email) DO UPDATE SET name=CASE WHEN excluded.name<>'' THEN excluded.name ELSE events.attendees.name END, status='approved', approval_source=CASE WHEN events.attendees.approval_source='manual' THEN 'manual' ELSE 'luma_csv' END WHERE events.attendees.status<>'rejected' RETURNING email",
          [email, guest.name],
        );
        if (result.rows.length) approved++;
        else protectedRejections++;
      }
      await c.query(
        "INSERT INTO events.audit_log(action,details) VALUES('csv_import',$1)",
        [JSON.stringify({ approved, protectedRejections })],
      );
      return { approved, protectedRejections };
    });
  }
  async function approve(email: string, name: string, existingEmail = "") {
    return transaction(async (c) => {
      await identityLock(c);
      const source = await resolve(email, c);
      if (existingEmail) {
        const target = await resolve(existingEmail, c);
        if (source !== target) {
          const found = await c.query<Attendee>(
            "SELECT * FROM events.attendees WHERE email=ANY($1::text[]) ORDER BY email FOR UPDATE",
            [[source, target]],
          );
          if (!found.rows.some((r) => r.email === target))
            throw new PortalError(
              "The original attendee email was not found. Import or approve it first.",
            );
          if (found.rows.find((r) => r.email === source)?.coupon)
            throw new PortalError(
              "This email has already claimed a credit. It cannot be linked to another attendee.",
            );
          await c.query(
            "UPDATE events.email_aliases SET attendee_email=$1 WHERE attendee_email=$2",
            [target, source],
          );
          await c.query("DELETE FROM events.attendees WHERE email=$1", [
            source,
          ]);
          await c.query(
            "INSERT INTO events.email_aliases(email,attendee_email) VALUES($1,$2) ON CONFLICT(email) DO UPDATE SET attendee_email=excluded.attendee_email",
            [source, target],
          );
        }
        await c.query(
          "UPDATE events.attendees SET status='approved',approval_source='manual' WHERE email=$1",
          [target],
        );
      } else {
        await c.query(
          "INSERT INTO events.attendees(email,name,status,approval_source) VALUES($1,$2,'approved','manual') ON CONFLICT(email) DO UPDATE SET status='approved',approval_source='manual',name=CASE WHEN excluded.name<>'' THEN excluded.name ELSE events.attendees.name END",
          [source, name],
        );
      }
      await c.query(
        "INSERT INTO events.audit_log(action,email,details) VALUES('approve',$1,$2)",
        [
          email,
          existingEmail ? `Linked to ${existingEmail}` : "Coordinator approval",
        ],
      );
    });
  }
  async function reject(email: string) {
    return transaction(async (c) => {
      await identityLock(c);
      const canonical = await resolve(email, c);
      await c.query(
        "UPDATE events.attendees SET status='rejected' WHERE email=$1",
        [canonical],
      );
      await c.query(
        "INSERT INTO events.audit_log(action,email) VALUES('reject',$1)",
        [canonical],
      );
    });
  }
  async function advance(email: string, step: number, complete: boolean) {
    if (!Number.isInteger(step) || step < 1 || step > STEPS.length)
      throw new PortalError("Invalid step.");
    return transaction(async (c) => {
      await identityLock(c);
      const canonical = await resolve(email, c);
      const { rows } = await c.query<Attendee>(
        "SELECT * FROM events.attendees WHERE email=$1 FOR UPDATE",
        [canonical],
      );
      const a = rows[0];
      if (!a || a.status !== "approved")
        throw new PortalError("Please get coordinator approval first.");
      if (a.community_step !== step - 1)
        throw new PortalError(
          "Refresh your progress and complete the steps in order.",
        );
      const setting = await c.query<{ value: string }>(
        "SELECT value FROM events.settings WHERE key=$1",
        [STEPS[step - 1].key],
      );
      const url = setting.rows[0]?.value ?? "";
      if (!validCommunityLink(STEPS[step - 1].key, url))
        throw new PortalError(
          "The coordinator has not configured this community link yet.",
        );
      if (complete && a.opened_step !== step)
        throw new PortalError("Open the community link before confirming.");
      await c.query(
        complete
          ? "UPDATE events.attendees SET community_step=$2 WHERE email=$1"
          : "UPDATE events.attendees SET opened_step=$2 WHERE email=$1",
        [canonical, step],
      );
      if (complete)
        await c.query(
          "INSERT INTO events.audit_log(action,email,details) VALUES('self_confirmed_step',$1,$2)",
          [canonical, STEPS[step - 1].key],
        );
      return url;
    });
  }
  async function claimCoupon(email: string) {
    return transaction(async (c) => {
      await identityLock(c);
      const canonical = await resolve(email, c);
      const { rows } = await c.query<Attendee>(
        "SELECT * FROM events.attendees WHERE email=$1 FOR UPDATE",
        [canonical],
      );
      const a = rows[0];
      if (!a || a.status !== "approved")
        throw new PortalError("Please get coordinator approval first.");
      if (a.coupon) return a;
      if (a.community_step !== STEPS.length)
        throw new PortalError("Complete all community steps before claiming.");
      const credit = await c.query<{ code: string }>(
        "SELECT code FROM events.credits WHERE assigned_to IS NULL ORDER BY created_at,code FOR UPDATE SKIP LOCKED LIMIT 1",
      );
      if (!credit.rows[0])
        throw new PortalError(
          "All credits are currently claimed. Please see the coordinator.",
        );
      const code = credit.rows[0].code;
      await c.query(
        "UPDATE events.credits SET assigned_to=$1,assigned_at=NOW() WHERE code=$2",
        [canonical, code],
      );
      const updated = await c.query<Attendee>(
        "UPDATE events.attendees SET coupon=$2,claimed_at=NOW() WHERE email=$1 RETURNING *",
        [canonical, code],
      );
      await c.query(
        "INSERT INTO events.audit_log(action,email) VALUES('claim',$1)",
        [canonical],
      );
      return updated.rows[0];
    });
  }
  async function addCredits(codes: string[]) {
    return transaction(async (c) => {
      let added = 0;
      for (const code of codes) {
        const r = await c.query(
          "INSERT INTO events.credits(code) SELECT $1 WHERE NOT EXISTS(SELECT 1 FROM events.attendees WHERE coupon=$1) ON CONFLICT(code) DO NOTHING RETURNING code",
          [code],
        );
        added += r.rows.length;
      }
      await c.query(
        "INSERT INTO events.audit_log(action,details) VALUES('credits_added',$1)",
        [String(added)],
      );
      return added;
    });
  }
  async function rateLimit(key: string, max: number) {
    const r = await pool.query<{ hits: number }>(
      "INSERT INTO events.rate_limits(key,hits,expires_at) VALUES($1,1,NOW()+interval '15 minutes') ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN events.rate_limits.expires_at<NOW() THEN 1 ELSE events.rate_limits.hits+1 END,expires_at=CASE WHEN events.rate_limits.expires_at<NOW() THEN NOW()+interval '15 minutes' ELSE events.rate_limits.expires_at END RETURNING hits",
      [key],
    );
    return r.rows[0].hits <= max;
  }
  return {
    findAttendee,
    getLinks,
    enroll,
    importGuests,
    approve,
    reject,
    advance,
    claimCoupon,
    addCredits,
    rateLimit,
  };
}
