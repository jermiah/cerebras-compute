import Link from "next/link";
import { isAdmin } from "@/lib/session";
import { pool, store } from "@/lib/db";
import type { Attendee } from "@/lib/store";
import AdminLogin from "./AdminLogin";
import Dashboard from "./Dashboard";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Coordinator portal | Cerebras Paris",
  robots: { index: false, follow: false },
};
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const admin = await isAdmin();
  const params = await searchParams;
  let data;
  if (admin)
    try {
      const q = (params.q ?? "").slice(0, 254);
      const status = ["pending", "approved", "rejected", "claimed"].includes(
        params.status ?? "",
      )
        ? params.status!
        : "all";
      const page = Math.max(
        1,
        Math.min(10000, Number.parseInt(params.page ?? "1", 10) || 1),
      );
      const where =
        "WHERE ($1='' OR a.email ILIKE '%'||$1||'%' OR a.name ILIKE '%'||$1||'%' OR EXISTS(SELECT 1 FROM events.email_aliases x WHERE x.attendee_email=a.email AND x.email ILIKE '%'||$1||'%')) AND ($2='all' OR a.status=$2 OR ($2='claimed' AND a.coupon IS NOT NULL))";
      const [guests, counts, matching, links, audit, aliases] =
        await Promise.all([
          pool.query<Attendee>(
            `SELECT a.*,claimed_at::text FROM events.attendees a ${where} ORDER BY (status='pending') DESC,created_at DESC LIMIT 30 OFFSET $3`,
            [q, status, (page - 1) * 30],
          ),
          pool.query<{
            pending: number;
            approved: number;
            claimed: number;
            available: number;
          }>(
            "SELECT (SELECT count(*)::int FROM events.attendees WHERE status='pending') pending,(SELECT count(*)::int FROM events.attendees WHERE status='approved') approved,(SELECT count(*)::int FROM events.attendees WHERE coupon IS NOT NULL) claimed,(SELECT count(*)::int FROM events.credits WHERE assigned_to IS NULL) available",
          ),
          pool.query<{ count: number }>(
            `SELECT count(*)::int FROM events.attendees a ${where}`,
            [q, status],
          ),
          store.getLinks(),
          pool.query<{
            action: string;
            email: string | null;
            details: string;
            created_at: string;
          }>(
            "SELECT action,email,details,created_at::text FROM events.audit_log ORDER BY id DESC LIMIT 15",
          ),
          pool.query<{ email: string; attendee_email: string }>(
            "SELECT email,attendee_email FROM events.email_aliases",
          ),
        ]);
      const attendeeViews = guests.rows.map(
        ({
          email,
          name,
          status,
          coupon,
          community_step,
          approval_source,
          claimed_at,
        }) => ({
          email,
          name,
          status,
          claimed: !!coupon,
          community_step,
          approval_source,
          claimed_at,
          aliases: aliases.rows
            .filter((a) => a.attendee_email === email)
            .map((a) => a.email),
        }),
      );
      data = {
        guests: attendeeViews,
        counts: counts.rows[0],
        total: matching.rows[0].count,
        page,
        q,
        status,
        links,
        audit: audit.rows,
      };
    } catch {}
  const body = !admin ? (
    <AdminLogin />
  ) : data ? (
    <Dashboard {...data} />
  ) : (
    <section className="admin-card">
      <h1>Portal setup needed</h1>
      <p>
        The database is unavailable or the portal migration has not been
        applied. Configure DATABASE_URL and run the schema setup described in
        the README, then reload.
      </p>
    </section>
  );
  return (
    <main className="admin-page">
      <nav className="admin-nav">
        <Link href="/">← Cerebras Paris</Link>
        <span>COORDINATOR PORTAL</span>
      </nav>
      {body}
    </main>
  );
}
