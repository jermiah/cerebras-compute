import { findAttendee, getSetting, store } from "@/lib/db";
import { getAttendeeEmail } from "@/lib/session";
import Image from "next/image";
import ClaimPortal from "./ClaimPortal";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [eventName, description] = await Promise.all([
    getSetting("event_name", "Cerebras Café Compute | Paris"),
    getSetting(
      "description",
      "An exclusive evening for AI engineers, researchers, founders, and builders to explore, experiment, and build with some of the latest AI technologies.",
    ),
  ]);
  const email = await getAttendeeEmail();
  let attendee = null;
  let links = {};
  let unavailable = false;
  try {
    [attendee, links] = await Promise.all([
      email ? findAttendee(email) : Promise.resolve(null),
      store.getLinks(),
    ]);
  } catch {
    unavailable = true;
  }

  return (
    <main className="event-page">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <nav className="event-nav" aria-label="Event identity">
        <span className="partner-logo partner-logo-cerebras">
          <Image
            src="/cerebras-logo.png"
            alt="Cerebras"
            width={674}
            height={296}
            priority
          />
        </span>
        <span className="wordmark">
          café compute <small>Paris · France</small>
        </span>
        <span className="partner-logo partner-logo-openai">
          <Image
            src="/openai-logo.png"
            alt="OpenAI"
            width={270}
            height={135}
            priority
          />
        </span>
      </nav>

      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">
            <span /> A small gathering with big ideas
          </p>
          <h1>{eventName}</h1>
          <p className="hero-intro">
            <strong>$15,500 in AI Compute Credits for Builders</strong>
          </p>
          <p className="event-description">
            OpenAI + Cerebras credits for the first 75 registered participants.{" "}
            <strong>
              3 selected builders will receive OpenAI Codex Pro access.
            </strong>
          </p>
          {description && <p className="event-description">{description}</p>}
          <div className="event-organizers">
            <p>
              Organized by{" "}
              <a
                href="https://www.cerebras.ai/?utm_source=luma"
                target="_blank"
                rel="noopener noreferrer"
              >
                Cerebras
              </a>{" "}
              and{" "}
              <a
                href="https://openai.com/?utm_source=luma"
                target="_blank"
                rel="noopener noreferrer"
              >
                OpenAI
              </a>
            </p>
            <p>
              Co-hosted by{" "}
              <a
                href="https://www.aicollective.com/?utm_source=luma"
                target="_blank"
                rel="noopener noreferrer"
              >
                AI Collective Paris
              </a>{" "}
              and{" "}
              <a
                href="https://www.quicksort.fr/?utm_source=luma"
                target="_blank"
                rel="noopener noreferrer"
              >
                QuickSort
              </a>
            </p>
          </div>
          <a className="slides-link" href="/slides">
            View the Cerebras presentation <span>↗</span>
          </a>
          <div className="city-line" aria-label="Paris to the world">
            <span>PAR</span>
            <b>✦</b>
            <span>Build</span>
            <b>✦</b>
            <span>Share</span>
          </div>
        </div>

        <div className="coffee-scene">
          <div className="sun" />
          <div className="orbit orbit-one">✦</div>
          <div className="orbit orbit-two">☕</div>
          <div className="orbit orbit-three">✦</div>
          <div className="frog-frame">
            <Image
              className="frog-illustration"
              src="/cafe-compute-frog.png"
              alt="A cheerful frog enjoying coffee at Cerebras Paris"
              width={1254}
              height={1254}
              priority
            />
          </div>
          <div className="speech-bubble">
            did someone say
            <br />
            <strong>free credits?</strong>
          </div>
          <div className="vibe-stamp">
            <span>✓</span> Official vibe
            <br />
            inspector
          </div>
          <div className="bean bean-one" />
          <div className="bean bean-two" />
          <div className="bean bean-three" />
          <p>The frog has entered the chat.</p>
        </div>
      </section>

      <section className="portal-grid">
        <div className="ticket-panel">
          <div className="ticket-topline">
            <span>YOUR TABLE IS RESERVED</span>
            <span>01 / 01</span>
          </div>
          <div className="ticket-heading">
            <span className="ticket-stamp">CC</span>
            <div>
              <p>Access pass</p>
              <h2>Claim your credits</h2>
            </div>
          </div>
          <ClaimPortal
            attendee={attendee ?? null}
            links={links}
            unavailable={unavailable}
          />
        </div>

        <aside className="menu-panel">
          <p className="menu-kicker">AN EVENING FOR BUILDERS</p>
          <h2>
            Bring your laptop.
            <br />
            Build something together.
          </h2>
          <ul className="menu-list">
            <li>
              <span aria-hidden="true">☕</span>
              <div>
                <strong>Food, drinks & conversation</strong>
                <small>
                  Doors open at 6:45 PM. Meet fellow builders before the demos
                  begin.
                </small>
              </div>
            </li>
            <li>
              <span aria-hidden="true">⚡</span>
              <div>
                <strong>Live demos & technical discussions</strong>
                <small>
                  Explore Cerebras inference, OpenAI Codex and QuickSort
                  research.
                </small>
              </div>
            </li>
            <li>
              <span aria-hidden="true">⌘</span>
              <div>
                <strong>Hands-on building</strong>
                <small>
                  Experiment with agents, coding tools, voice AI or your own
                  ideas alongside engineers in the room.
                </small>
              </div>
            </li>
          </ul>
          <p className="menu-footer">
            A focused, interactive builder session designed around live
            experimentation, technical conversations and collaboration. Seats
            are intentionally limited to keep the experience interactive and
            conversation-driven.
          </p>
        </aside>
      </section>

      <section className="agenda-card" aria-label="Event schedule">
        <div className="agenda-topline">
          <span>RUN OF SHOW · PARIS EDITION</span>
          <span>6:45 PM — 9:00 PM · PARIS TIME</span>
        </div>
        <div className="agenda-heading">
          <span className="agenda-stamp">✦</span>
          <div>
            <p>Schedule</p>
            <h2>Agenda for the evening</h2>
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
                <span className="agenda-time">6:45 PM</span>
              </td>
              <td className="agenda-title">
                <strong>Doors Open</strong>
                <small>
                  Food, drinks, and networking with fellow builders.
                </small>
              </td>
              <td className="agenda-icon" aria-hidden="true">
                ☕
              </td>
            </tr>
            <tr>
              <td>
                <span className="agenda-time">7:00 PM</span>
              </td>
              <td className="agenda-title">
                <strong>Welcome &amp; Introduction</strong>
                <small>
                  Opening remarks and introduction to Cerebras, OpenAI, AI
                  Collective, and QuickSort with our humanoid.
                </small>
              </td>
              <td className="agenda-icon" aria-hidden="true">
                ✦
              </td>
            </tr>
            <tr>
              <td>
                <span className="agenda-time">7:15 PM</span>
              </td>
              <td className="agenda-title">
                <strong>Cerebras Demo + Live Q&amp;A</strong>
                <small>
                  Explore Cerebras inference, live demos, and what ultra-fast
                  inference enables for AI applications.
                </small>
                <small className="agenda-speaker">
                  Dmitry Gaynullin, Cerebras · 20 minutes
                </small>
              </td>
              <td className="agenda-icon" aria-hidden="true">
                ⚡
              </td>
            </tr>
            <tr>
              <td>
                <span className="agenda-time">7:35 PM</span>
              </td>
              <td className="agenda-title">
                <strong>OpenAI Demo + Q&amp;A</strong>
                <small>
                  Live demonstration and discussion around building with Codex.
                </small>
                <small className="agenda-speaker">
                  OpenAI speaker · 15 minutes
                </small>
              </td>
              <td className="agenda-icon" aria-hidden="true">
                ⌘
              </td>
            </tr>
            <tr>
              <td>
                <span className="agenda-time">7:50 PM</span>
              </td>
              <td className="agenda-title">
                <strong>QuickSort Research Spotlight</strong>
                <small>
                  A short technical session highlighting AI research on
                  compressing KV cache.
                </small>
                <small className="agenda-speaker">10 minutes</small>
              </td>
              <td className="agenda-icon" aria-hidden="true">
                ✳
              </td>
            </tr>
            <tr>
              <td>
                <span className="agenda-time">8:00 PM</span>
              </td>
              <td className="agenda-title">
                <strong>Build Time</strong>
                <small>
                  Bring out your laptop and start building. Experiment with
                  Cerebras, OpenAI, agents, coding tools, voice AI, or your own
                  ideas alongside other engineers in the room.
                </small>
              </td>
              <td className="agenda-icon" aria-hidden="true">
                ↗
              </td>
            </tr>
            <tr>
              <td>
                <span className="agenda-time">8:45 PM</span>
              </td>
              <td className="agenda-title">
                <strong>Open Networking</strong>
                <small>
                  Connect with speakers, engineers, founders, and fellow
                  builders.
                </small>
              </td>
              <td className="agenda-icon" aria-hidden="true">
                ✦
              </td>
            </tr>
            <tr>
              <td>
                <span className="agenda-time">9:00 PM</span>
              </td>
              <td className="agenda-title">
                <strong>Event Ends</strong>
                <small>Thank you for building with us.</small>
              </td>
              <td className="agenda-icon" aria-hidden="true">
                ☕
              </td>
            </tr>
          </tbody>
        </table>

        <div className="agenda-footer-note">
          <span>
            All times are local to Paris. Bring your laptop for the build
            session.
          </span>
          <span>Cerebras Café Compute | Paris</span>
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
        <p className="faq-intro">
          Bring the rest to the room—these are the useful starting points for
          the conversation.
        </p>
        <div className="faq-list">
          <details>
            <summary>
              <span>01</span>
              <strong>What makes Cerebras different?</strong>
            </summary>
            <p>
              Cerebras is built around wafer-scale computing: instead of
              treating AI work as a collection of smaller accelerators, it
              brings a very large amount of compute, memory, and communication
              fabric together on one wafer-scale processor.
            </p>
          </details>
          <details>
            <summary>
              <span>02</span>
              <strong>Why does Cerebras feel so fast?</strong>
            </summary>
            <p>
              It&apos;s not only about raw compute. AI workloads spend a great
              deal of time moving data, so keeping compute, memory, and
              communication close together can reduce that overhead and make
              responses feel more immediate.
            </p>
          </details>
          <details>
            <summary>
              <span>03</span>
              <strong>Why does inference speed matter for agents?</strong>
            </summary>
            <p>
              Agents often work in a loop: reason, use a tool, observe, and
              reason again. Faster model steps leave more room in the same time
              budget for planning, verification, and better tool use—not just a
              quicker final answer.
            </p>
          </details>
          <details>
            <summary>
              <span>04</span>
              <strong>How is Cerebras related to OpenAI?</strong>
            </summary>
            <p>
              They work at different layers of the stack. OpenAI develops models
              and products; Cerebras provides specialized AI compute and
              inference infrastructure. Cerebras also offers an API that is
              mostly compatible with OpenAI client libraries.
            </p>
          </details>
          <details>
            <summary>
              <span>05</span>
              <strong>What&apos;s the simplest way to try it?</strong>
            </summary>
            <p>
              Start with a small project or an existing OpenAI-style
              application, point it at the Cerebras API, and test a real task.
              The best first experiment is something you can compare against
              your current workflow.
            </p>
          </details>
          <details>
            <summary>
              <span>06</span>
              <strong>What should I benchmark?</strong>
            </summary>
            <p>
              Look beyond tokens per second: compare time to first token,
              end-to-end latency, quality on your real task, reliability under
              concurrency, and cost per successful outcome.
            </p>
          </details>
        </div>
      </section>

      <footer className="event-footer">
        <span>CEREBRAS CAFÉ COMPUTE | PARIS</span>
        <span className="partner-lockup">
          <small>with</small>
          <Image
            src="/cerebras-logo.png"
            alt="Cerebras"
            width={85}
            height={39}
            className="cerebras-logo"
          />
        </span>
        <a href="/admin">Coordinator portal ↗</a>
      </footer>
    </main>
  );
}
