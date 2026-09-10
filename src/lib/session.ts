import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-me";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function sign(payload: string) {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

function encode(data: Record<string, string>) {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(token: string | undefined): Record<string, string> | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
}

async function setCookie(name: string, value: string) {
  (await cookies()).set(name, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  });
}

// Attendee session
export async function setAttendeeSession(email: string) {
  await setCookie("attendee", encode({ email }));
}
export async function getAttendeeEmail(): Promise<string | null> {
  return decode((await cookies()).get("attendee")?.value)?.email ?? null;
}
export async function clearAttendeeSession() {
  (await cookies()).delete("attendee");
}

