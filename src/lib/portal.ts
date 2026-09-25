export const STEPS = [
  {
    key: "cerebras_discord",
    label: "Join Cerebras Discord",
    host: ["discord.gg", "discord.com"],
  },
  {
    key: "quicksort_linkedin",
    label: "Follow Quicksort on LinkedIn",
    host: ["linkedin.com", "www.linkedin.com"],
  },
] as const;
export type CommunityLinks = Record<string, string>;
export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export const validEmail = (value: string) =>
  value.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
export function validCommunityLink(key: string, value: string) {
  const step = STEPS.find((s) => s.key === key);
  try {
    const url = new URL(value);
    return (
      !!step &&
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      (step.host as readonly string[]).includes(url.hostname)
    );
  } catch {
    return false;
  }
}
export function creditHref(value: string): string | null {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
