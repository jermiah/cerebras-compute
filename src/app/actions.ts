"use server";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { store } from "@/lib/db";
import { PortalError } from "@/lib/store";
import { normalizeEmail, validEmail } from "@/lib/portal";
import {
  clearAttendeeSession,
  getAttendeeEmail,
  setAttendeeSession,
} from "@/lib/session";
export type ClaimState = { error?: string; message?: string };
async function limit() {
  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = createHash("sha256").update(`attendee:${ip}`).digest("hex");
  if (!(await store.rateLimit(key, 100)))
    throw new PortalError(
      "Too many requests. Please try again in 15 minutes or see the coordinator.",
    );
}
function errorState(error: unknown) {
  return {
    error:
      error instanceof PortalError
        ? error.message
        : "The portal is temporarily unavailable. Please try again or see the coordinator.",
  };
}
export async function startClaim(
  _prev: ClaimState,
  form: FormData,
): Promise<ClaimState> {
  const email = normalizeEmail(String(form.get("email") ?? ""));
  const name = String(form.get("name") ?? "").trim();
  if (!validEmail(email) || !name || name.length > 120)
    return { error: "Enter your name and a valid email address." };
  try {
    await limit();
    await store.enroll(email, name);
    await setAttendeeSession(email);
  } catch (e) {
    return errorState(e);
  }
  revalidatePath("/");
  return { message: "Your details are saved." };
}
export async function communityAction(step: number, complete: boolean) {
  try {
    const email = await getAttendeeEmail();
    if (!email) throw new PortalError("Please enter your details again.");
    const url = await store.advance(email, step, complete);
    revalidatePath("/");
    return { url };
  } catch (e) {
    return errorState(e);
  }
}
export async function claimCredits(): Promise<ClaimState> {
  try {
    const email = await getAttendeeEmail();
    if (!email) throw new PortalError("Please enter your details again.");
    await store.claimCoupon(email);
    revalidatePath("/");
    return { message: "Your credit is reserved." };
  } catch (e) {
    return errorState(e);
  }
}
export async function logout() {
  await clearAttendeeSession();
  redirect("/");
}
