import { findAttendee, getSetting } from "@/lib/db";
import { getAttendeeEmail } from "@/lib/session";
import Image from "next/image";
import LoginForm from "./LoginForm";
import { logout } from "./actions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [eventName, description] = await Promise.all([
    getSetting("event_name", "Cerebras Paris"),
    getSetting("description", "A Paris coffee break for people who make things happen."),
  ]);
  const email = await getAttendeeEmail();
  const attendee = email ? await findAttendee(email) : undefined;
  const rawCoupon = (attendee?.coupon ?? "").trim();
  const isLink = /^https?:\/\//i.test(rawCoupon) || rawCoupon.includes("chatgpt.com") || /^[a-z0-9-]+\.[a-z]{2,}\//i.test(rawCoupon);
  const claimHref = rawCoupon.startsWith("http://") || rawCoupon.startsWith("https://") ? rawCoupon : `https://${rawCoupon}`;

  return (
    <main className="event-page">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <nav className="event-nav" aria-label="Event identity">
        <span className="partner-logo partner-logo-cerebras">
          <Image src="/cerebras-logo.png" alt="Cerebras" width={674} height={296} priority />
        </span>
        <span className="wordmark">cerebras paris <small>Paris · France</small></span>
        <span className="partner-logo partner-logo-openai">
          <Image src="/openai-logo.png" alt="OpenAI" width={270} height={135} priority />
        </span>
      </nav>

      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow"><span /> A small gathering with big ideas</p>
          <h1>{eventName}</h1>
          <p className="hero-intro">Make yourself at home. Grab a coffee as you arrive, then settle in for <em>Codex credits</em> and good ideas.</p>
          {description && <p className="event-description">{description}</p>}
          <a className="slides-link" href="/slides">View the Cerebras presentation <span>↗</span></a>
          <div className="city-line" aria-label="Paris to the world">
            <span>PAR</span><b>✦</b><span>Build</span><b>✦</b><span>Share</span>
          </div>
        </div>

        <div className="coffee-scene">
          <div className="sun" />
          <div className="orbit orbit-one">✦</div><div className="orbit orbit-two">☕</div><div className="orbit orbit-three">✦</div>
          <div className="frog-frame"><Image className="frog-illustration" src="/cafe-compute-frog.png" alt="A cheerful frog enjoying coffee at Cerebras Paris" width={1254} height={1254} priority /></div>
          <div className="speech-bubble">did someone say<br /><strong>free credits?</strong></div>
          <div className="vibe-stamp"><span>✓</span> Official vibe<br />inspector</div>
          <div className="bean bean-one" /><div className="bean bean-two" /><div className="bean bean-three" />
          <p>The frog has entered the chat.</p>
        </div>
      </section>

      <section className="portal-grid">
        <div className="ticket-panel">
          <div className="ticket-topline"><span>YOUR TABLE IS RESERVED</span><span>01 / 01</span></div>
          <div className="ticket-heading"><span className="ticket-stamp">CC</span><div><p>Access pass</p><h2>Claim your credits</h2></div></div>
          {attendee ? (
            <section className="coupon coupon-reveal">
              <p className="signed-in">Welcome back, <strong>{attendee.email}</strong></p>
              <p className="coupon-label">Your reserved Codex credit</p>
              <div className="code" style={{ display: "grid", gap: "12px", textAlign: "center", padding: "18px 14px", wordBreak: "break-all", fontSize: "clamp(13px, 1.8vw, 17px)", letterSpacing: "normal", userSelect: "all" }}>
                <span style={{ fontWeight: 700, color: "var(--ink)", fontFamily: "ui-monospace, monospace" }}>{rawCoupon}</span>
                {isLink && (
                  <div>
                    <a 
                      className="primary-button" 
                      href={claimHref} 
                      target="_blank" 
                      rel="noreferrer"
                      style={{ 
                        display: "inline-flex", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        gap: "6px", 
                        padding: "10px 20px", 
                        minHeight: "40px", 
                        width: "auto", 
                        textDecoration: "none" 
                      }}
                    >
                      Open claim link <span>↗</span>
                    </a>
                  </div>
                )}
              </div>
              <p className="coupon-note">This {isLink ? "link" : "code"} is now reserved only for you. Keep it close.</p>
              <form action={logout}><button className="text-button">Not you? Sign out</button></form>
            </section>
          ) : (
            <LoginForm />
          )}
        </div>

        <aside className="menu-panel">
          <p className="menu-kicker">SAMPLE MENU · TO BE CONFIRMED</p>
          <h2>Good ideas need good fuel.</h2>
          <ul className="menu-list">
            <li><span className="menu-number">01</span><div><strong>Burrito bowl</strong><small>Choose one bowl for lunch.</small></div><b>🌯</b></li>
            <li><span className="menu-number">02</span><div><strong>Diet Coke</strong><small>Cold, crisp, classic.</small></div><b>◌</b></li>
            <li><span className="menu-number">03</span><div><strong>Mojito</strong><small>Minty reset, zero rush.</small></div><b>✳</b></li>
            <li><span className="menu-number">04</span><div><strong>Iced latte</strong><small>Chilled coffee, café-style.</small></div><b>🧊</b></li>
            <li><span className="menu-number">05</span><div><strong>Cold coffee</strong><small>Cool fuel for the build.</small></div><b>☕</b></li>
          </ul>
          <p className="menu-footer"><strong>Coffee will be ready as you arrive.</strong> For lunch, please pick one bowl and one drink so there&apos;s enough for everyone.</p>
        </aside>
      </section>

      <section className="agenda-card" aria-label="Event schedule">
        <div className="agenda-topline">
          <span>RUN OF SHOW · PARIS EDITION</span>
          <span>11:30 — 16:00 · PARIS TIME</span>
        </div>
        <div className="agenda-heading">
          <span className="agenda-stamp">✦</span>
          <div>
            <p>Schedule</p>
            <h2>Agenda for the day</h2>
          </div>
        </div>

        <table className="agenda-table">
          <thead>
            <tr>
              <th style={{ width: "190px" }}>Timing</th>
              <th>Session & Details</th>
              <th style={{ textAlign: "right" }}></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <span className="agenda-time">11:30 AM — 12:00 PM</span>
              </td>
              <td className="agenda-title">
                <strong>Welcome, Intro & Cerebras Showcase</strong>
                <small>Grab a coffee, settle in, and see something built with Cerebras. We&apos;ll also invite everyone to try Cerebras Qwen 3.8 27B for development during the event.</small>
              </td>
              <td className="agenda-icon">☕</td>
            </tr>
            <tr>
              <td>
                <span className="agenda-time">12:00 — 12:30 PM</span>
              </td>
              <td className="agenda-title">
                <strong>Virtual Session with the Cerebras Team</strong>
                <small>Join a live virtual conversation with the Cerebras team, ask questions, and get inspired for the build.</small>
              </td>
              <td className="agenda-icon">⚡</td>
            </tr>
            <tr>
              <td>
                <span className="agenda-time">12:30 — 01:30 PM</span>
              </td>
              <td className="agenda-title">
                <strong>Lunch & Build Together</strong>
                <small>Pick up your bowl and one drink, then use the hour to build, explore Cerebras Qwen 3.8 27B, and meet fellow makers.</small>
              </td>
              <td className="agenda-icon">🤖</td>
            </tr>
            <tr>
              <td>
                <span className="agenda-time">01:30 — 02:30 PM</span>
              </td>
              <td className="agenda-title">
                <strong>Community Lightning Demos</strong>
                <small>Short demos from the community: share what you&apos;re making, what you learned, or what surprised you.</small>
              </td>
              <td className="agenda-icon">🌯</td>
            </tr>
            <tr>
              <td>
                <span className="agenda-time">02:30 — 04:00 PM</span>
              </td>
              <td className="agenda-title">
                <strong>Open Build, Show & Tell + Networking</strong>
                <small>Keep building, share feedback, and connect with the people turning ideas into demos.</small>
              </td>
              <td className="agenda-icon">✳</td>
            </tr>
          </tbody>
        </table>

        <div className="agenda-footer-note">
          <span>⚡ <b>Draft Paris schedule</b> · Date, venue, sessions and catering to be confirmed.</span>
          <span>Cerebras Paris</span>
        </div>
      </section>

      <section className="faq-card" aria-labelledby="faq-title">
        <div className="faq-heading">
          <span className="faq-stamp">?</span>
          <div>
            <p>Open questions</p>
            <h2 id="faq-title">A few things people ask.</h2>
          </div>
        </div>
        <p className="faq-intro">Bring the rest to the room—these are the useful starting points for the conversation.</p>
        <div className="faq-list">
          <details>
            <summary><span>01</span><strong>What makes Cerebras different?</strong></summary>
            <p>Cerebras is built around wafer-scale computing: instead of treating AI work as a collection of smaller accelerators, it brings a very large amount of compute, memory, and communication fabric together on one wafer-scale processor.</p>
          </details>
          <details>
            <summary><span>02</span><strong>Why does Cerebras feel so fast?</strong></summary>
            <p>It&apos;s not only about raw compute. AI workloads spend a great deal of time moving data, so keeping compute, memory, and communication close together can reduce that overhead and make responses feel more immediate.</p>
          </details>
          <details>
            <summary><span>03</span><strong>Why does inference speed matter for agents?</strong></summary>
            <p>Agents often work in a loop: reason, use a tool, observe, and reason again. Faster model steps leave more room in the same time budget for planning, verification, and better tool use—not just a quicker final answer.</p>
          </details>
          <details>
            <summary><span>04</span><strong>How is Cerebras related to OpenAI?</strong></summary>
            <p>They work at different layers of the stack. OpenAI develops models and products; Cerebras provides specialized AI compute and inference infrastructure. Cerebras also offers an API that is mostly compatible with OpenAI client libraries.</p>
          </details>
          <details>
            <summary><span>05</span><strong>What&apos;s the simplest way to try it?</strong></summary>
            <p>Start with a small project or an existing OpenAI-style application, point it at the Cerebras API, and test a real task. The best first experiment is something you can compare against your current workflow.</p>
          </details>
          <details>
            <summary><span>06</span><strong>What should I benchmark?</strong></summary>
            <p>Look beyond tokens per second: compare time to first token, end-to-end latency, quality on your real task, reliability under concurrency, and cost per successful outcome.</p>
          </details>
        </div>
      </section>

      <footer className="event-footer">
        <span>CEREBRAS PARIS</span>
        <span className="partner-lockup">
          <small>with</small>
          <Image src="/cerebras-logo.png" alt="Cerebras" width={85} height={39} className="cerebras-logo" />
        </span>
        <span>PARIS</span>
      </footer>
    </main>
  );
}
