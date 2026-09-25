import { createHmac, timingSafeEqual } from "node:crypto";
function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32)
    throw new Error("Set SESSION_SECRET to at least 32 random characters.");
  return s;
}
export function seal(data: Record<string, string>, ttl: number) {
  const payload = Buffer.from(
    JSON.stringify({ ...data, exp: Date.now() + ttl * 1000 }),
  ).toString("base64url");
  return `${payload}.${createHmac("sha256", secret()).update(payload).digest("base64url")}`;
}
export function unseal(
  token: string | undefined,
): Record<string, string> | null {
  if (!token || token.length > 2048) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payload, sig] = parts;
    const expected = createHmac("sha256", secret())
      .update(payload)
      .digest("base64url");
    const a = Buffer.from(sig),
      b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof data.exp !== "number" || data.exp <= Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}
export function equalSecret(a: string, b: string) {
  const hash = (s: string) => createHmac("sha256", secret()).update(s).digest();
  return timingSafeEqual(hash(a), hash(b));
}
