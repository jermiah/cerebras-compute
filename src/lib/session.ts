import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { seal, unseal } from "./tokens";
const MAX_AGE = 60 * 60 * 24 * 7;
async function setCookie(
  name: string,
  data: Record<string, string>,
  ttl = MAX_AGE,
) {
  (await cookies()).set(name, seal(data, ttl), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ttl,
    path: "/",
  });
}
export async function setAttendeeSession(email: string) {
  await setCookie("attendee", { role: "attendee", email });
}
export async function getAttendeeEmail() {
  const data = unseal((await cookies()).get("attendee")?.value);
  return data?.role === "attendee" ? data.email : null;
}
export async function clearAttendeeSession() {
  (await cookies()).delete("attendee");
}
function adminVersion() {
  return createHash("sha256")
    .update(process.env.ADMIN_PASSWORD ?? "")
    .digest("hex");
}
export async function setAdminSession() {
  await setCookie(
    "coordinator",
    { role: "admin", version: adminVersion() },
    60 * 60 * 8,
  );
}
export async function isAdmin() {
  const d = unseal((await cookies()).get("coordinator")?.value);
  return (
    !!process.env.ADMIN_PASSWORD &&
    d?.role === "admin" &&
    d.version === adminVersion()
  );
}
export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Coordinator sign-in required.");
}
export async function clearAdminSession() {
  (await cookies()).delete("coordinator");
}
