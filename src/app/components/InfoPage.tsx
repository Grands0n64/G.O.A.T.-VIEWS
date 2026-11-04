import Link from "next/link";
import type { ReactNode } from "react";
import { SITE_NAME } from "../siteConfig";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section style={{ marginTop: 26 }}>
    <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, margin: "0 0 8px", color: "#f2f6f8" }}>{title}</h2>
    {children}
  </section>;
}

export default function InfoPage({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  const link = { color: "#9ba8b3", textDecoration: "none" } as const;
  return <main style={{ maxWidth: 760, margin: "0 auto", padding: "28px 20px 60px", color: "#d3dbe0", lineHeight: 1.7 }}>
    <Link href="/" style={{ color: "#b5f34a", fontWeight: 700, textDecoration: "none", fontSize: 14 }}>← {SITE_NAME}</Link>
    <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, margin: "18px 0 6px", color: "#f2f6f8" }}>{title}</h1>
    {updated && <p style={{ color: "#81909e", fontSize: 13, marginTop: 0 }}>Last updated: {updated}</p>}
    <div style={{ fontSize: 15 }}>{children}</div>
    <div style={{ marginTop: 44, display: "flex", gap: 18, flexWrap: "wrap", fontSize: 13, borderTop: "1px solid #202d39", paddingTop: 16 }}>
      <Link href="/about" style={link}>About</Link>
      <Link href="/privacy" style={link}>Privacy Policy</Link>
      <Link href="/terms" style={link}>Terms</Link>
      <Link href="/contact" style={link}>Contact</Link>
    </div>
  </main>;
}
