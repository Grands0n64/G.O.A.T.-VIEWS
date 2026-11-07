import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "G.O.A.T. VIEWS | Live Sports",
  description: "Global sports scores, fixtures and match centres.",
  other: { "fo-verify": "0c90fee2-e602-42be-b2f5-3755ca3c6974" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<Script src="https://czernik.org/14/541cd9ea1ae61a25e2f532c9ea722993" strategy="afterInteractive" data-cfasync="false" /><Script src="https://capitalhospitals.org/1/4a4b2ee96dc059ea883d95dd0c24c1bf" strategy="afterInteractive" data-cfasync="false" /></body></html>;
}
