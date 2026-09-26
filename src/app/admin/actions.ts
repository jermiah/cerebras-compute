"use server";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { pool, store } from "@/lib/db";
import {
  requireAdmin,
  setAdminSession,
  clearAdminSession,
} from "@/lib/session";
import { equalSecret } from "@/lib/tokens";
import {
  normalizeEmail,
  validEmail,
  validCommunityLink,
  STEPS,
} from "@/lib/portal";
import { previewCsv, readCreditCsv, type CsvMapping } from "@/lib/csv";
import { PortalError } from "@/lib/store";
export type AdminResult = { error?: string; message?: string };
function failure(error: unknown): AdminResult {
  return {
    error:
      error instanceof PortalError
        ? error.message
        : "Unable to complete this action. Check your connection and portal configuration, then retry.",
  };
}
function refresh() {
  revalidatePath("/admin");
  revalidatePath("/");
}
export async function adminLogin(
  _prev: AdminResult,
  form: FormData,
): Promise<AdminResult> {
  try {
    const password = String(form.get("password") ?? "");
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected || expected.length < 16)
      return {
        error:
          "Set a coordinator password of at least 16 characters on the server.",
      };
    const ip =
      (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "local";
    if (
      !(await store.rateLimit(
        createHash("sha256").update(`admin:${ip}`).digest("hex"),
        10,
      ))
    )
      return { error: "Too many sign-in attempts. Try again in 15 minutes." };
    if (!password || password.length > 512 || !equalSecret(password, expected))
      return { error: "Incorrect coordinator password." };
    await setAdminSession();
  } catch (e) {
    const code =
      e && typeof e === "object" && "code" in e ? String(e.code) : "unknown";
    console.error("Coordinator login failed", {
      code,
      sessionSecretConfigured: (process.env.SESSION_SECRET?.length ?? 0) >= 32,
      databaseConfigured: !!process.env.DATABASE_URL,
      connectionTimeout:
        e instanceof Error && /timeout|terminated/.test(e.message),
    });
    return failure(e);
  }
  redirect("/admin");
}
export async function adminLogout() {
  await clearAdminSession();
  redirect("/admin");
}
export async function importCsv(
  text: string,
  mapping: CsvMapping,
): Promise<AdminResult> {
  await requireAdmin();
  try {
    const preview = previewCsv(text, mapping);
    if (!preview.guests.length)
      return { error: "No eligible checked-in attendees found." };
    const result = await store.importGuests(preview.guests);
    refresh();
    return {
      message: `${result.approved} attendee records imported or updated. ${result.protectedRejections} previously rejected records kept blocked. Existing claims were preserved.`,
    };
  } catch (e) {
    return e instanceof Error &&
      !(e instanceof PortalError) &&
      /CSV|column|rows|Upload/.test(e.message)
      ? { error: e.message }
      : failure(e);
  }
}
export async function approveGuest(
  email: string,
  name: string,
  original: string,
): Promise<AdminResult> {
  await requireAdmin();
  email = normalizeEmail(email);
  original = normalizeEmail(original);
  if (
    !validEmail(email) ||
    (original && !validEmail(original)) ||
    name.length > 120
  )
    return {
      error: "Enter a valid email and a name of at most 120 characters.",
    };
  try {
    await store.approve(email, name.trim(), original);
    refresh();
    return {
      message: original
        ? "Email linked and attendee approved. Both emails share the same credit."
        : "Attendee approved. They can now continue.",
    };
  } catch (e) {
    return failure(e);
  }
}
export async function rejectGuest(email: string): Promise<AdminResult> {
  await requireAdmin();
  try {
    await store.reject(normalizeEmail(email));
    refresh();
    return {
      message:
        "Attendee access rejected. Existing credits will not be reassigned.",
    };
  } catch (e) {
    return failure(e);
  }
}
export async function uploadCredits(form: FormData): Promise<AdminResult> {
  await requireAdmin();
  const file = form.get("credits");
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv"))
    return { error: "Choose a CSV file containing credit links." };
  if (file.size > 500000) return { error: "Choose a CSV smaller than 500 KB." };
  let links: string[];
  try {
    links = readCreditCsv(await file.text());
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unable to read CSV." };
  }
  try {
    const added = await store.addCredits(links);
    refresh();
    return {
      message: `${added} credit links added. Duplicate and already assigned links were skipped.`,
    };
  } catch (e) {
    return failure(e);
  }
}
export async function saveLinks(
  links: Record<string, string>,
): Promise<AdminResult> {
  await requireAdmin();
  for (const s of STEPS) {
    const url = (links[s.key] ?? "").trim();
    if (url && !validCommunityLink(s.key, url))
      return {
        error: `Use a valid HTTPS ${s.label.includes("Discord") ? "Discord invite" : "LinkedIn page"} URL for ${s.label}.`,
      };
  }
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    for (const s of STEPS)
      await c.query(
        "INSERT INTO events.settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        [s.key, (links[s.key] ?? "").trim()],
      );
    await c.query(
      "INSERT INTO events.audit_log(action) VALUES('community_links_updated')",
    );
    await c.query("COMMIT");
    refresh();
    return { message: "Community links saved." };
  } catch (e) {
    await c.query("ROLLBACK");
    return failure(e);
  } finally {
    c.release();
  }
}
