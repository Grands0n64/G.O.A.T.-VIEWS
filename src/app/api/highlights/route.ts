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
    league?: { id?: number; name?: string };
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

async function getHighlights(apiKey: string, query: URLSearchParams) {
  const response = await fetch("https://soccer.highlightly.net/highlights?" + query.toString(), {
    headers: { "x-rapidapi-key": apiKey, Accept: "application/json" },
    next: { revalidate: 60 }
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 200);
    throw new Error("Highlightly returned " + response.status + (detail ? ": " + detail : ""));
  }
  const payload = await response.json();
  return {
    items: (Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []) as HighlightlyItem[],
    plan: payload?.plan ?? null
  };
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.HIGHLIGHTLY_API_KEY;
  const home = req.nextUrl.searchParams.get("home") ?? "";
  const away = req.nextUrl.searchParams.get("away") ?? "";
  const league = req.nextUrl.searchParams.get("league") ?? "";
  const date = req.nextUrl.searchParams.get("date") ?? "";
  const sport = (req.nextUrl.searchParams.get("sport") ?? "football").toLowerCase();

  if (!apiKey) return NextResponse.json({ configured: false, keyFound: false, videos: [], scope: "league" });
  if (sport !== "football") {
    return NextResponse.json({ configured: true, videos: [], scope: "league", error: "This highlights route is currently configured for the football API." }, { status: 400 });
  }

  if (!league && !(home && away)) return NextResponse.json({ configured: true, videos: [], scope: "league" });

  const common = new URLSearchParams();
  if (home && away && date && /^\d{4}-\d{2}-\d{2}/.test(date)) common.set("date", date.slice(0, 10));
  if (home) common.set("homeTeamName", home);
  if (away) common.set("awayTeamName", away);
  common.set("timezone", "Europe/London");
  common.set("limit", "40");
  common.set("offset", "0");

  try {
    const leagueKey = normalize(league);
    const names = leagueKey.includes("world cup") || leagueKey === "fifa"
      ? ["World Cup", "FIFA World Cup", league]
      : [league];

    let items: HighlightlyItem[] = [];
    let plan: unknown = null;
    let successfulQueries = 0;
    const seenQueries = new Set<string>();

    // Competition display labels and API league names do not always match.
    // Try known World Cup naming variants instead of treating one empty
    // response as proof that the tournament has no highlights.
    for (const name of names) {
      if (!name || seenQueries.has(normalize(name))) continue;
      seenQueries.add(normalize(name));
      const query = new URLSearchParams(common);
      query.set("leagueName", name);
      const result = await getHighlights(apiKey, query);
      successfulQueries++;
      if (!plan) plan = result.plan;
      const keySet = new Set(items.map((item) => String(item.id)));
      for (const item of result.items) {
        const id = String(item.id ?? "");
        if (!id || !keySet.has(id)) items.push(item);
      }
      if (result.items.length > 0) break;
    }

    const homeKey = normalize(home);
    const awayKey = normalize(away);
    // Highlightly documents both VERIFIED and UNVERIFIED clips. The
    // embedUrl is the actual signal that an in-page player URL is supplied;
    // filtering to VERIFIED alone incorrectly hides otherwise embeddable clips.
    const embedded = items
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
      verified: (item.type ?? "").toUpperCase() === "VERIFIED"
    }));

    return NextResponse.json({
      configured: true,
      videos,
      scope: home && away && exact.length ? "match" : "league",
      provider: "Highlightly",
      diagnostics: {
        queriesTried: successfulQueries,
        received: items.length,
        verified: items.filter((item) => (item.type ?? "").toUpperCase() === "VERIFIED").length,
        withEmbedUrl: embedded.length,
        apiPlanMessage: (plan as { message?: string } | null)?.message ?? null
      },
      plan
    });
  } catch (error) {
    return NextResponse.json({
      configured: true, videos: [], scope: "league",
      error: error instanceof Error ? error.message : "Could not load Highlightly videos."
    }, { status: 502 });
  }
}
