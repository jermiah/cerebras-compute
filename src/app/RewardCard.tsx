"use client";

import { useState } from "react";
import { creditHref } from "@/lib/portal";

export default function RewardCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const [message, setMessage] = useState("");
  const href = creditHref(value);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`${label} link copied.`);
    } catch {
      setMessage(
        "Copy unavailable. Select the full link above to copy it manually.",
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
          aria-label={`Copy ${label} link`}
        >
          Copy link
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
