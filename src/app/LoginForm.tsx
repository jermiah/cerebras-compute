"use client";
import { useActionState } from "react";
import { startClaim, type ClaimState } from "./actions";
export default function LoginForm() {
  const [state, action, pending] = useActionState(startClaim, {} as ClaimState);
  return (
    <form action={action} className="login-form">
      <p className="form-kicker">YOUR PERSONAL INVITATION</p>
      <h3>
        Your next idea
        <br />
        starts here.
      </h3>
      <p className="form-copy">
        Use the email you registered with on Luma. Checked-in guests can
        continue; other emails need coordinator approval.
      </p>
      <label>
        Your name
        <input
          name="name"
          autoComplete="name"
          required
          maxLength={120}
          placeholder="Alex Martin"
        />
      </label>
      <label>
        Luma email
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          maxLength={254}
          placeholder="you@example.com"
        />
      </label>
      {state.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}
      <button className="primary-button" disabled={pending}>
        {pending ? "Checking…" : "Continue to credits →"}
      </button>
      <p className="form-copy form-fine-print">
        Your name, email and progress are used to manage event access and one
        credit per attendee.
      </p>
    </form>
  );
}
