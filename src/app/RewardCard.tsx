"use client";

import { useState } from "react";
import { creditHref } from "@/lib/portal";

export default function RewardCard({
  label,
  value,
  kind = "link",
}: {
  label: string;
  value: string;
  kind?: "link" | "coupon";
}) {
  const [message, setMessage] = useState("");
  const target = /^[a-z][a-z0-9+.-]*:/i.test(value)
    ? value
    : `https://${value}`;
  const href = kind === "link" ? creditHref(target) : null;
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`${label} ${kind} copied.`);
    } catch {
      setMessage(
        "Copy unavailable. Select the value above to copy it manually.",
      );
    }
  }
  return (
    <section className="reward-card" aria-label={label}>
      <h4>{label}</h4>
      <code className="reward-code">{value}</code>
      <div className="reward-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={copy}
          aria-label={`Copy ${label} ${kind}`}
        >
          Copy {kind}
        </button>
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="primary-button"
          >
            Open {label} link ↗
          </a>
        )}
      </div>
      <p className="reward-copy-status" role="status">
        {message}
      </p>
    </section>
  );
}
