import { findAttendee, getSetting } from "@/lib/db";
import { getAttendeeEmail } from "@/lib/session";
import Image from "next/image";
import LoginForm from "./LoginForm";
import { logout } from "./actions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [eventName, description, perks] = await Promise.all([
    getSetting("event_name", "Cafe Compute Delhi"),
    getSetting("description", "A Delhi coffee break for people who make things happen."),
    getSetting("perks", "Burrito bowl, Diet Coke, coffee & mojito — on the house."),
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
        <span className="wordmark"><i>C</i> cafe compute</span>
        <span className="nav-location">Delhi · India</span>
      </nav>

      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow"><span /> A small gathering with big ideas</p>
          <h1>{eventName}</h1>
          <p className="hero-intro">Make yourself at home. Your table, your taste, and your <em>Codex credits</em> are waiting.</p>
          {description && <p className="event-description">{description}</p>}
          <div className="city-line" aria-label="Delhi to the world">
            <span>DEL</span><b>✦</b><span>Build</span><b>✦</b><span>Share</span>
          </div>
        </div>

        <div className="coffee-scene">
          <div className="sun" />
          <div className="orbit orbit-one">✦</div><div className="orbit orbit-two">☕</div><div className="orbit orbit-three">✦</div>
          <div className="portrait-frame"><Image className="portrait-photo" src="/shresth-frog-cafe.png" alt="Shresth and the Cafe Compute frog co-host" width={1254} height={1254} priority /></div>
          <div className="speech-bubble">did someone say<br /><strong>free credits?</strong></div>
          <div className="vibe-stamp"><span>✓</span> Official vibe<br />inspector</div>
          <div className="bean bean-one" /><div className="bean bean-two" /><div className="bean bean-three" />
          <p>Shresth has entered the chat.</p>
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
              {isLink ? (
                <a className="code claim-link" href={claimHref} target="_blank" rel="noreferrer">Open claim link <span>↗</span></a>
              ) : (
                <div className="code">{rawCoupon}</div>
              )}
              <p className="coupon-note">This {isLink ? "link" : "code"} is now reserved only for you. Keep it close.</p>
              <form action={logout}><button className="text-button">Not you? Sign out</button></form>
            </section>
          ) : (
            <LoginForm />
          )}
        </div>

        <aside className="menu-panel">
          <p className="menu-kicker">COMPLIMENTARY CAFE MENU</p>
          <h2>Good ideas need good fuel.</h2>
          <ul className="menu-list">
            <li><span className="menu-number">01</span><div><strong>Burrito bowl</strong><small>A bright, satisfying lunch break.</small></div><b>🌯</b></li>
            <li><span className="menu-number">02</span><div><strong>Diet Coke</strong><small>Cold, crisp, classic.</small></div><b>◌</b></li>
            <li><span className="menu-number">03</span><div><strong>Fresh coffee</strong><small>For the next excellent question.</small></div><b>☕</b></li>
            <li><span className="menu-number">04</span><div><strong>Mojito</strong><small>Minty reset, zero rush.</small></div><b>✳</b></li>
          </ul>
          <p className="menu-footer">{perks}</p>
        </aside>
      </section>

      <footer className="event-footer">
        <span>OPENAI × CAFE COMPUTE</span>
        <span className="partner-lockup"><small>with</small><span className="cerebras-crop"><Image src="/cerebras-logo.png" alt="Cerebras" width={630} height={487} /></span></span>
        <span>DELHI</span>
      </footer>
    </main>
  );
}
