import type { Metadata } from "next";
import "./globals.css";
import "./portal.css";

export const metadata: Metadata = {
  title: "Cerebras Café Compute | Paris",
  description:
    "$15,500 in AI compute credits for builders. Join Cerebras, OpenAI, AI Collective Paris and QuickSort for live demos, hands-on building and networking.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
