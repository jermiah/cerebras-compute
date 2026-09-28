import { createHash } from "node:crypto";
import { normalizeEmail } from "./portal";

// Venue Wi-Fi shares one IP. Allow 120 guests ample retries while throttling
// repeated submissions for one email separately from the shared network.
export const ATTENDEE_NETWORK_LIMIT = 3000;
export const ATTENDEE_EMAIL_LIMIT = 20;
export async function allowAttendeeSignIn(
  store: { rateLimit(key: string, max: number): Promise<boolean> },
  ip: string,
  email: string,
) {
  const hash = (parts: string[]) =>
    createHash("sha256").update(JSON.stringify(parts)).digest("hex");
  if (
    !(await store.rateLimit(hash(["attendee-v2", ip]), ATTENDEE_NETWORK_LIMIT))
  )
    return false;
  return store.rateLimit(
    hash(["attendee-email-v2", ip, normalizeEmail(email)]),
    ATTENDEE_EMAIL_LIMIT,
  );
}
