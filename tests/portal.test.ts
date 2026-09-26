import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import { Pool } from "pg";
import { createStore } from "../src/lib/store";
import { previewCsv, readCsv } from "../src/lib/csv";
import { seal, unseal } from "../src/lib/tokens";
import { STEPS, creditHref } from "../src/lib/portal";
let pg: EmbeddedPostgres,
  pool: Pool,
  store: ReturnType<typeof createStore>,
  dir: string;
before(async () => {
  dir = await mkdtemp(join(tmpdir(), "cerebras-tests-"));
  pg = new EmbeddedPostgres({
    databaseDir: join(dir, "pg"),
    user: "postgres",
    password: "test-password",
    port: 55438,
    persistent: false,
    onLog: () => {},
    onError: () => {},
  });
  await pg.initialise();
  await pg.start();
  pool = new Pool({
    connectionString:
      "postgresql://postgres:test-password@127.0.0.1:55438/postgres",
  });
  await pool.query(await readFile("supabase/events-schema.sql", "utf8"));
  await pool.query(
    "INSERT INTO events.attendees(email,coupon) VALUES ('legacy@example.com','LEGACY-CLAIM')",
  );
  await pool.query(
    await readFile(
      "supabase/migrations/20260925191020_attendee_portal.sql",
      "utf8",
    ),
  );
  await pool.query(
    await readFile(
      "supabase/migrations/20260926173000_credit_pairs.sql",
      "utf8",
    ),
  );
  store = createStore(pool);
});
after(async () => {
  await pool?.end();
  await pg?.stop();
  if (dir) await rm(dir, { recursive: true, force: true });
});
const mapping = {
  email: "email",
  name: "name",
  checkin: "checked_in_at",
  filtered: false,
};
test("CSV requires check-in evidence, supports quoted commas and BOM, deduplicates case", () => {
  const p = previewCsv(
    '\uFEFFemail,name,checked_in_at\r\nA@example.com,"Alex, Martin",2026-09-25T10:00:00Z\r\na@example.com,Alex,yes\r\nb@example.com,Bea,no\r\nbad,C,yes',
    mapping,
  );
  assert.deepEqual(p.guests, [
    { email: "a@example.com", name: "Alex, Martin" },
  ]);
  assert.equal(p.invalid, 1);
  assert.equal(p.duplicates, 1);
  assert.equal(p.unchecked, 1);
  assert.throws(
    () => previewCsv("email,name\na@example.com,Alex", mapping),
    /check-in/,
  );
  assert.equal(
    previewCsv("email,name\na@example.com,Alex", { ...mapping, filtered: true })
      .guests.length,
    1,
  );
  assert.throws(() => readCsv("email,email\na,b"), /duplicate/);
  assert.equal(
    previewCsv("email,name,checked_in_at\nz@example.com,Z,registered", mapping)
      .guests.length,
    0,
  );
});
test("migration preserves existing claims and default new requests are pending", async () => {
  assert.equal(
    (await store.findAttendee("legacy@example.com"))?.coupon,
    "LEGACY-CLAIM",
  );
  assert.equal(
    (await store.findAttendee("legacy@example.com"))?.status,
    "approved",
  );
  await store.enroll("new@example.com", "New");
  assert.equal(
    (await store.findAttendee("new@example.com"))?.status,
    "pending",
  );
  await assert.rejects(() => store.claimCoupon("new@example.com"), /approval/);
});
test("server enforces sequential opens, confirmations, approvals, and stock", async () => {
  await store.approve("steps@example.com", "Steps");
  await assert.rejects(
    () => store.advance("steps@example.com", 2, false),
    /order/,
  );
  await assert.rejects(
    () => store.advance("steps@example.com", 1, true),
    /Open/,
  );
  await assert.rejects(
    () => store.claimCoupon("steps@example.com"),
    /Complete/,
  );
  for (let i = 1; i <= STEPS.length; i++) {
    await store.advance("steps@example.com", i, false);
    await store.advance("steps@example.com", i, true);
  }
  await assert.rejects(
    () => store.claimCoupon("steps@example.com"),
    /currently claimed/,
  );
  await store.addCredits(["FIRST"]);
  assert.equal((await store.claimCoupon("steps@example.com")).coupon, "FIRST");
  assert.equal((await store.claimCoupon("steps@example.com")).coupon, "FIRST");
});
test("reimport preserves progress, rewards, manual approvals, and rejections", async () => {
  await store.reject("new@example.com");
  const result = await store.importGuests([
    { email: "new@example.com", name: "New" },
    { email: "steps@example.com", name: "Steps updated" },
  ]);
  assert.equal(result.protectedRejections, 1);
  assert.equal(
    (await store.findAttendee("new@example.com"))?.status,
    "rejected",
  );
  const a = await store.findAttendee("steps@example.com");
  assert.equal(a?.coupon, "FIRST");
  assert.equal(a?.community_step, STEPS.length);
  assert.equal(a?.approval_source, "manual");
});
test("alternate email shares one identity and reward across imports", async () => {
  await store.enroll("alternate@example.com", "Alt");
  await store.approve("alternate@example.com", "Alt", "steps@example.com");
  assert.equal(
    (await store.findAttendee("alternate@example.com"))?.email,
    "steps@example.com",
  );
  assert.equal(
    (await store.claimCoupon("alternate@example.com")).coupon,
    "FIRST",
  );
  await store.importGuests([{ email: "alternate@example.com", name: "Alt" }]);
  assert.equal(
    (
      await pool.query(
        "SELECT * FROM events.attendees WHERE email='alternate@example.com'",
      )
    ).rows.length,
    0,
  );
  await assert.rejects(
    () => store.approve("steps@example.com", "Steps", "legacy@example.com"),
    /already claimed/,
  );
});
test("parallel claims reserve one credit per attendee, never reuse codes", async () => {
  for (const email of ["parallel-a@example.com", "parallel-b@example.com"]) {
    await store.approve(email, email);
    for (let i = 1; i <= STEPS.length; i++) {
      await store.advance(email, i, false);
      await store.advance(email, i, true);
    }
  }
  await store.addCredits(["PAR-A", "PAR-B", "PAR-C"]);
  const [a, a2, b] = await Promise.all([
    store.claimCoupon("parallel-a@example.com"),
    store.claimCoupon("parallel-a@example.com"),
    store.claimCoupon("parallel-b@example.com"),
  ]);
  assert.equal(a.coupon, a2.coupon);
  assert.notEqual(a.coupon, b.coupon);
  assert.equal(
    (
      await pool.query(
        "SELECT count(*)::int n FROM events.credits WHERE assigned_to IS NULL",
      )
    ).rows[0].n,
    1,
  );
  assert.equal(await store.addCredits(["PAR-A", "LEGACY-CLAIM"]), 0);
});
test("rejected access stays blocked; missing links cannot be bypassed", async () => {
  await store.reject("steps@example.com");
  await assert.rejects(
    () => store.claimCoupon("alternate@example.com"),
    /approval/,
  );
  await store.approve("missing@example.com", "Missing");
  await pool.query("UPDATE events.settings SET value='' WHERE key=$1", [
    STEPS[0].key,
  ]);
  await assert.rejects(
    () => store.advance("missing@example.com", 1, false),
    /not configured/,
  );
});
test("database rate limits persist and enforce ceilings", async () => {
  assert.equal(await store.rateLimit("test-key", 2), true);
  assert.equal(await store.rateLimit("test-key", 2), true);
  assert.equal(await store.rateLimit("test-key", 2), false);
});
test("signed sessions reject tampering, malformed unicode and expired tokens", () => {
  process.env.SESSION_SECRET = "test-secret-only-abcdefghijklmnopqrstuvwxyz";
  const token = seal({ role: "attendee", email: "a@example.com" }, 60);
  assert.equal(unseal(token)?.email, "a@example.com");
  assert.equal(unseal(token + "x"), null);
  assert.equal(unseal("hello.💥"), null);
  assert.equal(unseal(seal({ role: "admin" }, -1)), null);
  assert.equal(creditHref("javascript:alert(1)"), null);
  assert.equal(creditHref("ABC123"), null);
  assert.equal(
    creditHref("https://example.com/claim"),
    "https://example.com/claim",
  );
});

test("private event tables have RLS and migration can be safely reapplied", async () => {
  const tables = await pool.query<{ relname: string; relrowsecurity: boolean }>(
    "SELECT relname,relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='events' AND c.relkind='r'",
  );
  assert.equal(tables.rows.length, 6);
  assert.ok(tables.rows.every((t) => t.relrowsecurity));
  await pool.query(
    await readFile(
      "supabase/migrations/20260925191020_attendee_portal.sql",
      "utf8",
    ),
  );
  assert.equal(
    (await store.findAttendee("alternate@example.com"))?.coupon,
    "FIRST",
  );
  assert.equal(
    (await store.findAttendee("new@example.com"))?.status,
    "rejected",
  );
});

test("paired credits import atomically and stay together across concurrent claims", async () => {
  const pairs = [
    { codex: "https://example.com/codex1", api: "https://example.com/api1" },
    { codex: "https://example.com/codex2", api: "https://example.com/api2" },
  ];
  assert.equal(await store.addCreditPairs(pairs), 2);
  assert.equal(await store.addCreditPairs(pairs), 0);
  await assert.rejects(
    store.addCreditPairs([
      {
        codex: "https://example.com/rollback",
        api: "https://example.com/rollback-api",
      },
      { codex: "https://example.com/other", api: pairs[0].api },
    ]),
  );
  assert.equal(
    (
      await pool.query(
        "SELECT 1 FROM events.credits WHERE code='https://example.com/rollback'",
      )
    ).rowCount,
    0,
  );
  // Exhaust legacy single rewards so these claims select the new pair inventory.
  await pool.query(
    "UPDATE events.credits SET assigned_to='legacy@example.com' WHERE code=(SELECT code FROM events.credits WHERE assigned_to IS NULL AND api_link IS NULL LIMIT 1)",
  );
  await store.approve("pair1@example.com", "Pair One");
  await store.approve("pair2@example.com", "Pair Two");
  await pool.query(
    "UPDATE events.attendees SET community_step=2 WHERE email IN ('pair1@example.com','pair2@example.com')",
  );
  const claimed = await Promise.all([
    store.claimCoupon("pair1@example.com"),
    store.claimCoupon("pair1@example.com"),
    store.claimCoupon("pair2@example.com"),
  ]);
  assert.equal(claimed[0].coupon, claimed[1].coupon);
  assert.notEqual(claimed[0].coupon, claimed[2].coupon);
  for (const a of claimed)
    assert.equal(a.api_link, pairs.find((p) => p.codex === a.coupon)?.api);
  assert.equal(
    (await store.findAttendee("pair1@example.com")).api_link,
    claimed[0].api_link,
  );
});
