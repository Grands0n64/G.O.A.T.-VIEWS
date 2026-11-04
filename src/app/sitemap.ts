import type { MetadataRoute } from "next";
import { SITE_URL } from "./siteConfig";
import { matchPath } from "./slug";

export const dynamic = "force-dynamic";

const ymd = (offsetDays: number) => new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = ["", "/about", "/privacy", "/terms", "/contact"].map((path) => ({
    url: SITE_URL + path,
    lastModified: now,
    changeFrequency: (path ? "monthly" : "hourly") as "monthly" | "hourly",
    priority: path ? 0.3 : 1
  }));

  // yesterday, today and tomorrow's football matches
  const matches: MetadataRoute.Sitemap = [];
  try {
    for (const offset of [-1, 0, 1]) {
      const res = await fetch(`${SITE_URL}/api/sports?date=${ymd(offset)}&sport=Football`, { next: { revalidate: 3600 } });
      if (!res.ok) continue;
      const data = await res.json();
      for (const m of data.matches ?? []) {
        matches.push({ url: SITE_URL + matchPath(m), lastModified: now, changeFrequency: "hourly", priority: 0.7 });
      }
    }
  } catch {
    // the static pages are still returned
  }
  return [...pages, ...matches].slice(0, 5000);
}
