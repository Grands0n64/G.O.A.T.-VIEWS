import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "G.O.A.T. VIEWS | Live Sports",
  description: "Global sports scores, fixtures and match centres.",
  other: { "fo-verify": "0c90fee2-e602-42be-b2f5-3755ca3c6974" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
