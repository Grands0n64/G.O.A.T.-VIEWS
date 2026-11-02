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
  if (sport !== "football" && sport !== "basketball") {
    return NextResponse.json({ configured: true, videos: [], scope: "league", error: "Unsupported sport." }, { status: 400 });
  }

  const baseUrl = sport === "basketball"
    ? "https://basketball.highlightly.net"
    : "https://soccer.highlightly.net";

  const params = new URLSearchParams();
  if (league) params.set("leagueName", league);
  if (date && /^\d{4}-\d{2}-\d{2}/.test(date)) params.set("date", date.slice(0, 10));
  if (home) params.set("homeTeamName", home);
  if (away) params.set("awayTeamName", away);
  params.set("limit", "40");

  if (!league && !date && !home && !away) {
    return NextResponse.json({ configured: true, videos: [], scope: "league" });
  }

  try {
    const response = await fetch(baseUrl + "/highlights?" + params.toString(), {
      headers: { "x-rapidapi-key": apiKey, Accept: "application/json" },
      next: { revalidate: 60 }
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      return NextResponse.json({
        configured: true,
        videos: [],
        scope: "league",
        error: "Highlightly returned " + response.status + (detail ? ": " + detail : "")
      }, { status: 502 });
    }

    const payload = await response.json();
    const items: HighlightlyItem[] = Array.isArray(payload?.data) ? payload.data : [];
    const homeKey = normalize(home);
    const awayKey = normalize(away);

    const mapped = items
      .filter((item) => item.type === "VERIFIED")
      .map((item) => ({ item, embedUrl: safeEmbedUrl(item.embedUrl) }))
      .filter((entry): entry is { item: HighlightlyItem; embedUrl: string } => !!entry.embedUrl);

    const exact = mapped.filter(({ item }) => {
      const matchHome = normalize(item.match?.homeTeam?.name ?? "");
      const matchAway = normalize(item.match?.awayTeam?.name ?? "");
      if (!homeKey || !awayKey || !matchHome || !matchAway) return false;
      return (matchHome.includes(homeKey) || homeKey.includes(matchHome)) &&
        (matchAway.includes(awayKey) || awayKey.includes(matchAway));
    });

    const selected = (exact.length ? exact : mapped).slice(0, 8);
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
      verified: item.type === "VERIFIED"
    }));

    return NextResponse.json({
      configured: true,
      videos,
      scope: exact.length ? "match" : "league",
      provider: "Highlightly",
      plan: payload?.plan ?? null
    });
  } catch (error) {
    return NextResponse.json({
      configured: true,
      videos: [],
      scope: "league",
      error: error instanceof Error ? error.message : "Could not load Highlightly videos."
    }, { status: 502 });
  }
}
