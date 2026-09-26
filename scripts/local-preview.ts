// Isolated demonstration database: no production credentials or guest data.
import EmbeddedPostgres from "embedded-postgres";
import { Pool } from "pg";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
async function main() {
  const dir = await mkdtemp(join(tmpdir(), "cerebras-preview-"));
  const pg = new EmbeddedPostgres({
    databaseDir: join(dir, "pg"),
    user: "postgres",
    password: "preview-only",
    port: 55439,
    persistent: false,
    onLog: () => {},
    onError: () => {},
  });
  await pg.initialise();
  await pg.start();
  const url = "postgresql://postgres:preview-only@127.0.0.1:55439/postgres";
  const pool = new Pool({ connectionString: url });
  await pool.query(await readFile("supabase/events-schema.sql", "utf8"));
  await pool.query(
    await readFile(
      "supabase/migrations/20260925191020_attendee_portal.sql",
      "utf8",
    ),
  );
  await pool.query(await readFile("supabase/migrations/20260926173000_credit_pairs.sql", "utf8"));
  await pool.query(
    "INSERT INTO events.attendees(email,name,status,approval_source) VALUES('alex@example.com','Alex Martin','approved','luma_csv'),('pending@example.com','Sam Dubois','pending','request')",
  );
  await pool.query(
    "INSERT INTO events.credits(code) VALUES('DEMO-CREDIT-DO-NOT-REDEEM'),('https://example.com/demo-credit')",
  );
  await pool.end();
  const app = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--webpack",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3100",
    ],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: url,
        DATABASE_SSL: "disable",
        SESSION_SECRET: "local-preview-only-secret-do-not-use-in-production",
        ADMIN_PASSWORD: "preview-coordinator-password",
      },
    },
  );
  let stopping = false;
  async function stop() {
    if (stopping) return;
    stopping = true;
    app.kill("SIGTERM");
    await pg.stop();
    await rm(dir, { recursive: true, force: true });
    process.exit(0);
  }
  process.on("SIGINT", () => void stop());
  process.on("SIGTERM", () => void stop());
  app.on("exit", () => void stop());
  console.log(
    "Preview: http://127.0.0.1:3100 | Admin password: preview-coordinator-password (local demo only)",
  );
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
