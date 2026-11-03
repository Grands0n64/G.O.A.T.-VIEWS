import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 900;

function decode(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}
function clean(value: string) {
  return decode(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
function tag(xml: string, name: string) {
  const match = xml.match(new RegExp("<" + name + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + name + ">", "i"));
  return match ? clean(match[1]) : "";
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") === "transfers" ? "transfers" : "news";
  const query = type === "transfers"
    ? "football transfer market confirmed transfers rumours Saudi Pro League MLS Premier League UEFA FIFA"
    : "world sports news football basketball tennis Formula 1 cricket";
  const url = "https://news.google.com/rss/search?q=" + encodeURIComponent(query) + "&hl=en&gl=US&ceid=US:en";
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "GOATViews/1.0", Accept: "application/rss+xml, application/xml, text/xml" },
      next: { revalidate: 900 }
    });
    if (!response.ok) throw new Error("RSS source unavailable");
    const xml = await response.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 24).map((match) => {
      const item = match[1];
      const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/i);
      const sourceMatch = item.match(/<source(?:\s[^>]*)?>([\s\S]*?)<\/source>/i);
      return {
        title: tag(item, "title"),
        url: linkMatch ? decode(linkMatch[1].trim()) : "",
        publishedAt: tag(item, "pubDate"),
        source: sourceMatch ? clean(sourceMatch[1]) : "News publisher",
        summary: tag(item, "description")
      };
    }).filter((item) => item.title && /^https?:\/\//i.test(item.url));
    return NextResponse.json({ type, items, updatedAt: new Date().toISOString() }, {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" }
    });
  } catch {
    return NextResponse.json({ type, items: [], error: "The headlines feed is temporarily unavailable." }, { status: 502 });
  }
}
