import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cafe Compute Delhi | Codex Credits",
  description: "Your invitation to Cafe Compute Delhi and your reserved Codex credits.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
