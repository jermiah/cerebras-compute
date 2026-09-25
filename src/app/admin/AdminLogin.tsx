"use client";
import { useActionState } from "react";
import { adminLogin, type AdminResult } from "./actions";
export default function AdminLogin() {
  const [state, action, pending] = useActionState(
    adminLogin,
    {} as AdminResult,
  );
  return (
    <form className="admin-card admin-login" action={action}>
      <p className="eyebrow">COORDINATOR ACCESS</p>
      <h1>
        A smooth welcome,
        <br />
        from your phone.
      </h1>
      <p>
        Sign in to import guests, approve requests and manage event credits.
      </p>
      <label>
        Coordinator password
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
        />
      </label>
      {state.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}
      <button className="primary-button" disabled={pending}>
        {pending ? "Signing in…" : "Sign in →"}
      </button>
    </form>
  );
}
