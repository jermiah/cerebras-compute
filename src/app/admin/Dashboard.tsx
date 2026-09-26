"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { STEPS, type CommunityLinks } from "@/lib/portal";
import { readCsv, previewCsv, type CsvMapping } from "@/lib/csv";
import {
  adminLogout,
  importCsv,
  approveGuest,
  rejectGuest,
  uploadCredits,
  saveLinks,
  type AdminResult,
} from "./actions";
type Guest = {
  email: string;
  name: string;
  status: string;
  claimed: boolean;
  community_step: number;
  approval_source: string;
  claimed_at: string | null;
  aliases: string[];
};
type Props = {
  guests: Guest[];
  counts: {
    pending: number;
    approved: number;
    claimed: number;
    available: number;
  };
  total: number;
  page: number;
  q: string;
  status: string;
  links: CommunityLinks;
  audit: {
    action: string;
    email: string | null;
    details: string;
    created_at: string;
  }[];
};
export default function Dashboard(props: Props) {
  const router = useRouter();
  const [tab, setTab] = useState("guests");
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<AdminResult>({});
  const [csv, setCsv] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<CsvMapping>({
    email: "",
    name: "",
    checkin: "",
    filtered: false,
  });
  const [preview, setPreview] = useState<ReturnType<typeof previewCsv> | null>(
    null,
  );
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [original, setOriginal] = useState("");
  const [links, setLinks] = useState(props.links);
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 15000);
    return () => clearInterval(timer);
  }, [router]);
  function run(action: () => Promise<AdminResult>, success?: () => void) {
    setNotice({});
    startTransition(async () => {
      try {
        const result = await action();
        setNotice(result);
        if (!result.error) {
          success?.();
          router.refresh();
        }
      } catch {
        setNotice({
          error:
            "Your session may have expired or the connection was interrupted. Reload and try again.",
        });
      }
    });
  }
  async function chooseFile(file: File | undefined) {
    setPreview(null);
    setCsv("");
    setHeaders([]);
    setNotice({});
    if (!file) return;
    if (file.size > 500000) {
      setNotice({ error: "Choose a CSV smaller than 500 KB." });
      return;
    }
    try {
      const text = await file.text();
      const parsed = readCsv(text);
      setCsv(text);
      setHeaders(parsed.headers);
      const find = (re: RegExp) => parsed.headers.find((h) => re.test(h)) ?? "";
      setMapping({
        email: find(/^(email|email address|guest email)$/i),
        name: find(/^(name|full name|guest name)$/i),
        checkin: find(/check.?in|checked.?in/i),
        filtered: false,
      });
    } catch (e) {
      setNotice({
        error: e instanceof Error ? e.message : "Unable to read file.",
      });
    }
  }
  function updateMap(next: Partial<CsvMapping>) {
    setMapping({ ...mapping, ...next });
    setPreview(null);
  }
  const pageHref = (n: number) =>
    `/admin?q=${encodeURIComponent(props.q)}&status=${props.status}&page=${n}`;
  return (
    <>
      <header className="admin-header">
        <div>
          <p className="eyebrow">CEREBRAS PARIS · EVENT DESK</p>
          <h1>
            Welcome people.
            <br />
            Keep things moving.
          </h1>
        </div>
        <form action={adminLogout}>
          <button className="secondary-button">Sign out</button>
        </form>
      </header>
      <section className="admin-stats" aria-label="Event totals">
        {[
          ["Awaiting approval", props.counts.pending],
          ["Approved", props.counts.approved],
          ["Credits claimed", props.counts.claimed],
          ["Credits available", props.counts.available],
        ].map(([label, value]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>
      <nav className="admin-tabs" aria-label="Portal sections">
        {[
          ["guests", "Guests & approvals"],
          ["import", "Import Luma CSV"],
          ["credits", "Credit pool"],
          ["settings", "Community links"],
          ["activity", "Activity"],
        ].map(([id, label]) => (
          <button
            key={id}
            aria-current={tab === id ? "page" : undefined}
            onClick={() => {
              setTab(id);
              setNotice({});
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      {notice.error && (
        <p className="notice error" role="alert">
          {notice.error}
        </p>
      )}
      {notice.message && (
        <p className="notice success" role="status">
          {notice.message}
        </p>
      )}
      {tab === "guests" && (
        <>
          <section className="admin-card">
            <h2>Approve an email</h2>
            <p>
              Confirm the person’s attendance in person. For an alternate email,
              link their original record to keep one credit per attendee.
            </p>
            <form
              className="admin-form"
              onSubmit={(e) => {
                e.preventDefault();
                run(
                  () => approveGuest(email, name, original),
                  () => {
                    setEmail("");
                    setName("");
                    setOriginal("");
                  },
                );
              }}
            >
              <label>
                Email to approve
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={254}
                />
              </label>
              <label>
                Name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={120}
                />
              </label>
              <label>
                Original attendee email (optional)
                <input
                  type="email"
                  value={original}
                  onChange={(e) => setOriginal(e.target.value)}
                  placeholder="Link an alternate email"
                />
              </label>
              <button className="primary-button" disabled={pending}>
                Approve email →
              </button>
            </form>
          </section>
          <section className="admin-card">
            <div className="section-heading">
              <h2>Guest list</h2>
              <span>{props.total} matching guests</span>
            </div>
            <form className="guest-search" action="/admin">
              <label className="sr-only" htmlFor="guest-q">
                Search guests
              </label>
              <input
                id="guest-q"
                name="q"
                defaultValue={props.q}
                placeholder="Search name or email"
              />
              <label className="sr-only" htmlFor="guest-filter">
                Filter status
              </label>
              <select
                id="guest-filter"
                name="status"
                defaultValue={props.status}
              >
                <option value="all">All guests</option>
                <option value="pending">Awaiting approval</option>
                <option value="approved">Approved</option>
                <option value="claimed">Claimed</option>
                <option value="rejected">Rejected</option>
              </select>
              <button className="secondary-button">Search</button>
            </form>
            <div className="guest-list">
              {!props.guests.length && (
                <p>
                  No matching guests. Import your Luma CSV or approve someone
                  above.
                </p>
              )}
              {props.guests.map((g) => (
                <article key={g.email} className="guest-row">
                  <div>
                    <h3>{g.name || "Name not provided"}</h3>
                    <p>{g.email}</p>
                    {g.aliases.length > 0 && (
                      <small>Also: {g.aliases.join(", ")}</small>
                    )}
                    <div className="guest-tags">
                      <span className="status-pill">{g.status}</span>
                      <span>
                        {g.claimed
                          ? "Credit claimed"
                          : `${g.community_step}/${STEPS.length} community steps`}
                      </span>
                      <small>{g.approval_source.replaceAll("_", " ")}</small>
                    </div>
                  </div>
                  <div className="guest-buttons">
                    {g.status !== "approved" && (
                      <button
                        className="secondary-button"
                        disabled={pending}
                        onClick={() =>
                          run(() => approveGuest(g.email, g.name, ""))
                        }
                      >
                        Approve
                      </button>
                    )}
                    <button
                      className="text-button"
                      onClick={() => {
                        setEmail(g.email);
                        setName(g.name);
                        setOriginal("");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Link alternate email
                    </button>
                    {g.status !== "rejected" && (
                      <button
                        className="text-button danger"
                        disabled={pending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Reject access for ${g.email}? Any issued credit remains reserved.`,
                            )
                          )
                            run(() => rejectGuest(g.email));
                        }}
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
            <nav className="pagination" aria-label="Guest pages">
              {props.page > 1 && (
                <Link href={pageHref(props.page - 1)}>← Previous</Link>
              )}
              <span>Page {props.page}</span>
              {props.page * 30 < props.total && (
                <Link href={pageHref(props.page + 1)}>Next →</Link>
              )}
            </nav>
          </section>
        </>
      )}
      {tab === "import" && (
        <section className="admin-card">
          <p className="eyebrow">NO PAID LUMA API NEEDED</p>
          <h2>From check-in to ready to build.</h2>
          <p>
            In Luma: Manage → Guests → Checked In → Download CSV → Download
            Filtered Guests. You can also import an unfiltered file if it
            includes check-in status.
          </p>
          <label className="upload-box">
            Choose Luma CSV
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => void chooseFile(e.target.files?.[0])}
            />
            <small>
              Up to 500 KB / 5,000 rows. Uploading again preserves claims and
              progress.
            </small>
          </label>
          {headers.length > 0 && (
            <>
              <div className="admin-form">
                {(
                  [
                    ["email", "Email column"],
                    ["name", "Name column (optional)"],
                    ["checkin", "Check-in column"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <select
                      value={mapping[key]}
                      onChange={(e) => updateMap({ [key]: e.target.value })}
                    >
                      <option value="">Select column</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={mapping.filtered}
                  onChange={(e) => updateMap({ filtered: e.target.checked })}
                />
                I exported only checked-in guests from Luma. Approve every valid
                email in this file.
              </label>
              <button
                className="secondary-button"
                onClick={() => {
                  try {
                    setPreview(previewCsv(csv, mapping));
                    setNotice({});
                  } catch (e) {
                    setNotice({
                      error:
                        e instanceof Error ? e.message : "Unable to preview.",
                    });
                  }
                }}
              >
                Preview import
              </button>
            </>
          )}
          {preview && (
            <div className="import-preview">
              <h3>{preview.guests.length} eligible emails</h3>
              <p>
                {preview.total} rows · {preview.unchecked} not checked in ·{" "}
                {preview.invalid} invalid emails · {preview.duplicates}{" "}
                duplicate rows
              </p>
              <ul>
                {preview.guests.slice(0, 8).map((g) => (
                  <li key={g.email}>
                    {g.name || "Guest"} — {g.email}
                  </li>
                ))}
              </ul>
              {preview.guests.length > 8 && (
                <p>…and {preview.guests.length - 8} more</p>
              )}
              <p>
                Existing claims and progress stay intact. Manually rejected
                guests remain blocked. Missing rows do not remove attendees.
              </p>
              <button
                className="primary-button"
                disabled={pending || !preview.guests.length}
                onClick={() =>
                  run(
                    () => importCsv(csv, mapping),
                    () => setPreview(null),
                  )
                }
              >
                {pending ? "Importing…" : "Confirm import →"}
              </button>
            </div>
          )}
        </section>
      )}
      {tab === "credits" && (
        <section className="admin-card">
          <h2>Stock the credit pool.</h2>
          <p>
            Upload a CSV with one column named <strong>link</strong> and one
            full credit URL per row. Each unique link adds one credit to the
            pool.
          </p>
          <p>
            <a href="/credit-links-template.csv" download>
              Download CSV template
            </a>
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const data = new FormData(form);
              run(
                () => uploadCredits(data),
                () => form.reset(),
              );
            }}
          >
            <label className="upload-box">
              Choose credit links CSV
              <input
                name="credits"
                type="file"
                accept=".csv,text/csv"
                required
                disabled={pending}
              />
              <small>
                Up to 500 KB / 5,000 links. Duplicate links are skipped.
              </small>
            </label>
            <button className="primary-button" disabled={pending}>
              {pending ? "Uploading…" : "Upload credits CSV →"}
            </button>
          </form>
        </section>
      )}
      {tab === "settings" && (
        <section className="admin-card">
          <h2>The next connections.</h2>
          <p>
            Attendees open each link and confirm they joined or followed. This
            version records self-confirmation, not automatic membership
            verification. Blank links keep that step locked.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => saveLinks(links));
            }}
          >
            {STEPS.map((s) => (
              <label key={s.key}>
                {s.label}
                <input
                  type="url"
                  value={links[s.key] ?? ""}
                  onChange={(e) =>
                    setLinks({ ...links, [s.key]: e.target.value })
                  }
                  placeholder="https://…"
                />
              </label>
            ))}
            <button className="primary-button" disabled={pending}>
              Save community links
            </button>
          </form>
        </section>
      )}
      {tab === "activity" && (
        <section className="admin-card">
          <h2>Recent activity</h2>
          <p>Latest 15 coordinator actions and attendee milestones.</p>
          {props.audit.length ? (
            props.audit.map((a, i) => (
              <article className="audit-row" key={i}>
                <strong>{a.action.replaceAll("_", " ")}</strong>
                <span>{a.email}</span>
                <small>{a.details}</small>
                <time>{a.created_at}</time>
              </article>
            ))
          ) : (
            <p>No activity yet.</p>
          )}
        </section>
      )}
    </>
  );
}
