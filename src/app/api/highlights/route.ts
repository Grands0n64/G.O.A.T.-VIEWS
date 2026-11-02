import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

type HighlightlyItem = {
  id?: number;
  type?: string;
  title?: string;
  description?: string;
  imgUrl?: string;
  embedUrl?: string;
  source?: string;
  channel?: string;
  category?: string;
  match?: {
    date?: string;
    homeTeam?: { name?: string };
    awayTeam?: { name?: string };
    league?: { name?: string };
  };
};

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const safeEmbedUrl = (value: unknown): string | null => {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
};

export async function GET(req: NextRequest) {
  const apiKey = process.env.HIGHLIGHTLY_API_KEY;
  const home = req.nextUrl.searchParams.get("home") ?? "";
  const away = req.nextUrl.searchParams.get("away") ?? "";
  const league = req.nextUrl.searchParams.get("league") ?? "";
  const date = req.nextUrl.searchParams.get("date") ?? "";
  const sport = (req.nextUrl.searchParams.get("sport") ?? "football").toLowerCase();

  if (!apiKey) {
    return NextResponse.json({ configured: false, keyFound: false, videos: [], scope: "league" });
  }
  if (sport !== "football") {
    return NextResponse.json({
      configured: true, videos: [], scope: "league",
      error: "This highlights route is currently configured for the football API."
    }, { status: 400 });
  }

  const params = new URLSearchParams();
  if (league) params.set("leagueName", league);

  // A date belongs to a specific fixture. Do not let a match-centre date
  // accidentally turn the competition-wide "Latest highlights" feed into
  // a single-day search.
  if (home && away && date && /^\d{4}-\d{2}-\d{2}/.test(date)) {
    params.set("date", date.slice(0, 10));
  }
  if (home) params.set("homeTeamName", home);
  if (away) params.set("awayTeamName", away);
  params.set("timezone", "Europe/London");
  params.set("limit", "40");
  params.set("offset", "0");

  if (!league && !(home && away)) {
    return NextResponse.json({ configured: true, videos: [], scope: "league" });
  }

  try {
    const response = await fetch("https://soccer.highlightly.net/highlights?" + params.toString(), {
      headers: { "x-rapidapi-key": apiKey, Accept: "application/json" },
      next: { revalidate: 60 }
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      return NextResponse.json({
        configured: true, videos: [], scope: "league",
        error: "Highlightly returned " + response.status + (detail ? ": " + detail : "")
      }, { status: 502 });
    }

    const payload = await response.json();
    const items: HighlightlyItem[] = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload) ? payload : [];
    const homeKey = normalize(home);
    const awayKey = normalize(away);

    // Only use clips Highlightly has verified and supplied with an HTTPS
    // embed URL. A normal source URL is not an in-page player URL.
    const embedded = items
      .filter((item) => (item.type ?? "").toUpperCase() === "VERIFIED")
      .map((item) => ({ item, embedUrl: safeEmbedUrl(item.embedUrl) }))
      .filter((entry): entry is { item: HighlightlyItem; embedUrl: string } => !!entry.embedUrl);

    const exact = embedded.filter(({ item }) => {
      const matchHome = normalize(item.match?.homeTeam?.name ?? "");
      const matchAway = normalize(item.match?.awayTeam?.name ?? "");
      if (!homeKey || !awayKey || !matchHome || !matchAway) return false;
      return (matchHome.includes(homeKey) || homeKey.includes(matchHome)) &&
        (matchAway.includes(awayKey) || awayKey.includes(matchAway));
    });

    const selected = (home && away && exact.length ? exact : embedded).slice(0, 8);
    const videos = selected.map(({ item, embedUrl }) => ({
      id: String(item.id ?? embedUrl),
      title: item.title ?? "Official sports highlight",
      src: embedUrl,
      thumbnail: item.imgUrl,
      competition: item.match?.league?.name ?? league,
      date: item.match?.date,
      source: item.source,
      channel: item.channel,
      category: item.category,
      verified: true
    }));

    return NextResponse.json({
      configured: true,
      videos,
      scope: home && away && exact.length ? "match" : "league",
      provider: "Highlightly",
      diagnostics: {
        received: items.length,
        verified: items.filter((item) => (item.type ?? "").toUpperCase() === "VERIFIED").length,
        withEmbedUrl: embedded.length
      },
      plan: payload?.plan ?? null
    });
  } catch (error) {
    return NextResponse.json({
      configured: true, videos: [], scope: "league",
      error: error instanceof Error ? error.message : "Could not load Highlightly videos."
    }, { status: 502 });
  }
}
