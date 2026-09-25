import type { Metadata } from "next";
import Link from "next/link";
import PresentationViewer from "./PresentationViewer";

export const metadata: Metadata = {
  title: "Cerebras Presentation | Cerebras Paris",
  description: "Cerebras introduction slides for Cerebras Paris.",
};

export default function SlidesPage() {
  return (
    <main className="slides-page">
      <header className="slides-header">
        <Link className="slides-back" href="/">← Back to Cerebras Paris</Link>
        <p>Cerebras introduction · 7 slides</p>
        <a className="slides-open" href="/cerebras-intro-slides.pdf" target="_blank" rel="noreferrer">Open presentation ↗</a>
      </header>

      <section className="slides-viewer" aria-label="Cerebras introduction presentation">
        <PresentationViewer />
      </section>
    </main>
  );
}
