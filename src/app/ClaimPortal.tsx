"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Attendee } from "@/lib/store";
import {
  STEPS,
  creditHref,
  validCommunityLink,
  type CommunityLinks,
} from "@/lib/portal";
import { communityAction, claimCredits, logout } from "./actions";
import LoginForm from "./LoginForm";
export default function ClaimPortal({
  attendee,
  links,
  unavailable,
}: {
  attendee: Attendee | null;
  links: CommunityLinks;
  unavailable?: boolean;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [opened, setOpened] = useState<number | null>(null);
  useEffect(() => {
    if (attendee?.status !== "pending") return;
    const timer = setInterval(() => router.refresh(), 10000);
    return () => clearInterval(timer);
  }, [attendee?.status, router]);
  const step = (attendee?.community_step ?? 0) + 1;
  const link = STEPS[step - 1];
  async function openCommunity() {
    // Open synchronously with the click so mobile popup blockers can be detected.
    const popup = window.open("about:blank", "_blank", "width=620,height=760");
    if (popup) popup.opener = null;
    setError("");
    startTransition(async () => {
      try {
        const result = await communityAction(step, false);
        if ("error" in result) {
          popup?.close();
          setError(result.error ?? "Unable to open link.");
          return;
        }
        if (popup) popup.location.href = result.url;
        else
          setError(
            "Your browser blocked the popup. Use the community link below, then return here.",
          );
        setOpened(step);
        router.refresh();
      } catch {
        popup?.close();
        setError("Connection interrupted. Please try again.");
      }
    });
  }
  function confirm() {
    setError("");
    startTransition(async () => {
      try {
        const result = await communityAction(step, true);
        if ("error" in result) {
          setError(result.error ?? "Please try again.");
          return;
        }
        setOpened(null);
        router.refresh();
      } catch {
        setError("Connection interrupted. Please try again.");
      }
    });
  }
  function claim() {
    setError("");
    startTransition(async () => {
      try {
        const result = await claimCredits();
        if (result.error) setError(result.error);
        else {
          dialog.current?.close();
          router.refresh();
        }
      } catch {
        setError("Connection interrupted. Please try again.");
      }
    });
  }
  if (unavailable)
    return (
      <p role="alert">
        The credit portal is being set up. Please see the coordinator or try
        again shortly.
      </p>
    );
  if (!attendee) return <LoginForm />;
  const signout = (
    <form action={logout}>
      <button className="text-button">Use a different email</button>
    </form>
  );
  if (attendee.status !== "approved")
    return (
      <section className="claim-status">
        <span className="status-pill">
          {attendee.status === "pending"
            ? "Awaiting approval"
            : "Coordinator review needed"}
        </span>
        <h3>You’re on our list to review.</h3>
        <p>
          <strong>{attendee.email}</strong>
        </p>
        <p>
          Please visit the coordinator to confirm your check-in or approve this
          email. If you used another email on Luma, bring it with you.
        </p>
        <button className="primary-button" onClick={() => router.refresh()}>
          Check approval status
        </button>
        <p className="form-fine-print">
          Pending requests refresh automatically every 10 seconds.
        </p>
        {signout}
      </section>
    );
  if (attendee.coupon) {
    const href = creditHref(attendee.coupon);
    const apiHref = attendee.api_link ? creditHref(attendee.api_link) : null;
    return (
      <section className="claim-status">
        <span className="status-pill">Credit reserved</span>
        <h3>You’re ready to build.</h3>
        <p>
          This reward belongs to <strong>{attendee.email}</strong>. Returning
          here shows the same credit.
        </p>
        <code className="reward-code">{attendee.coupon}</code>
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="primary-button"
          >
            {apiHref ? "Open Codex link ↗" : "Open credit link ↗"}
          </a>
        )}
        {apiHref && (
          <a
            href={apiHref}
            target="_blank"
            rel="noopener noreferrer"
            className="primary-button"
          >
            Open API link ↗
          </a>
        )}
        {signout}
      </section>
    );
  }
  return (
    <section className="claim-status">
      <span className="status-pill">Access approved</span>
      <h3>
        Two communities.
        <br />
        One great starting point.
      </h3>
      <p>
        Hi {attendee.name || "there"}. Complete the community steps, then claim
        your credit.
      </p>
      <p>
        {attendee.community_step} of {STEPS.length} steps completed
      </p>
      <button
        className="primary-button"
        onClick={() => {
          setError("");
          dialog.current?.showModal();
        }}
      >
        Continue to community steps →
      </button>
      {signout}
      <dialog
        ref={dialog}
        className="claim-dialog"
        aria-labelledby="claim-title"
      >
        <button
          className="dialog-close"
          aria-label="Close claim steps"
          onClick={() => dialog.current?.close()}
        >
          ×
        </button>
        <p className="eyebrow">CEREBRAS PARIS · YOUR ACCESS PASS</p>
        <h2 id="claim-title">Make the connection.</h2>
        <ol className="step-list">
          {STEPS.map((s, i) => (
            <li
              key={s.key}
              className={
                i < attendee.community_step
                  ? "done"
                  : i === attendee.community_step
                    ? "current"
                    : ""
              }
            >
              <span>{i < attendee.community_step ? "✓" : i + 1}</span>
              {s.label}
              {i > attendee.community_step && <small>Locked</small>}
            </li>
          ))}
        </ol>
        {link ? (
          <div className="step-detail">
            <h3>{link.label}</h3>
            <p>
              Open the link, join or follow, then return here to confirm. We
              record your confirmation; we don’t automatically verify your
              account.
            </p>
            {validCommunityLink(link.key, links[link.key] ?? "") ? (
              <>
                <button
                  className="primary-button"
                  disabled={pending}
                  onClick={openCommunity}
                >
                  Open community ↗
                </button>
                {(opened === step || attendee.opened_step === step) && (
                  <>
                    <a
                      className="fallback-link"
                      href={links[link.key]}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open link manually ↗
                    </a>
                    <button
                      className="secondary-button"
                      disabled={pending}
                      onClick={confirm}
                    >
                      I’ve {step === STEPS.length ? "followed" : "joined"} —
                      continue →
                    </button>
                  </>
                )}
              </>
            ) : (
              <p className="notice">
                The coordinator needs to add this link. Your progress is saved.
              </p>
            )}
          </div>
        ) : (
          <div className="step-detail">
            <h3>You’re all set.</h3>
            <p>
              Claim your Codex and API links together. One reward pair per
              attendee, even if you change emails.
            </p>
            <button
              className="primary-button"
              disabled={pending}
              onClick={claim}
            >
              {pending ? "Reserving…" : "Claim my credits →"}
            </button>
          </div>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </dialog>
    </section>
  );
}
