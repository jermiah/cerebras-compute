"use client";

import { useActionState } from "react";
import { claimCredits, type ClaimState } from "./actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState(claimCredits, {} as ClaimState);

  return (
    <form action={action} className="login-form">
      <p className="form-kicker">YOUR PERSONAL INVITATION</p>
      <h3>Find your place<br />at the table.</h3>
      <p className="form-copy">Enter the email you registered with. If you&apos;re approved, we&apos;ll reveal your reserved Codex credit right here.</p>
      <label>
        Email
      <input type="email" name="email" autoFocus required placeholder="you@example.com" />
      </label>
      {state.error && <p className="error">{state.error}</p>}
      <button className="primary-button" disabled={pending}>{pending ? "Checking your invite…" : "Find my credits  ↗"}</button>
      <p className="form-copy form-fine-print">No email, no verification code — just your event email.</p>
    </form>
  );
}
