import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "G.O.A.T. VIEWS | Live Sports", description: "Global sports scores, fixtures and match centres." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
 return <html lang="en"><body>{children}</body></html>;
}