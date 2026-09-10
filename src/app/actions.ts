"use server";

import { redirect } from "next/navigation";
import { claimCoupon, findAttendee, normalizeEmail } from "@/lib/db";
import { clearAttendeeSession, setAttendeeSession } from "@/lib/session";

export type ClaimState = { error?: string };

/** One simple gate: an approved email receives one unused credit. */
export async function claimCredits(_prev: ClaimState, form: FormData): Promise<ClaimState> {
  const email = normalizeEmail(String(form.get("email") ?? ""));
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Please enter a valid email address." };
  if (!(await findAttendee(email))) {
    return { error: "This email is not on the approved guest list. Please check with the event team." };
  }
  const attendee = await claimCoupon(email);
  if (!attendee) return { error: "All Codex credits have now been claimed. Please see the event team for help." };
  await setAttendeeSession(email);
  redirect("/");
}

export async function logout() {
  await clearAttendeeSession();
  redirect("/");
}
