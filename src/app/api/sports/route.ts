import { NextRequest, NextResponse } from "next/server";
import { LEAGUES, type League } from "../../leagues";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

function normalize(event: any, source: League) {
  const competition = event.competitions?.[0];
  const competitors = competition?.competitors ?? [];
  const home = competitors.find((team: any) => team.homeAway === "home") ?? competitors[0];
  const away = competitors.find((team: any) => team.homeAway === "away") ?? competitors[1];
  if (!home || !away) return null;
  const status = competition?.status ?? event.status ?? {};
  const state = status.type?.state ?? "pre";
  const detail = status.type?.shortDetail ?? status.type?.detail ?? status.type?.description ?? "Scheduled";
  return {
    id: String(event.id),
    sport: source.sport,
    league: source.league,
    country: source.country || event.season?.name || "",
    home: home.team?.displayName ?? home.team?.name ?? "Home",
    away: away.team?.displayName ?? away.team?.name ?? "Away",
    homeScore: home.score === undefined || home.score === null || home.score === "" ? null : Number(home.score),
    awayScore: away.score === undefined || away.score === null || away.score === "" ? null : Number(away.score),
    status: detail,
    live: state === "in",
    completed: state === "post",
    startTime: event.date ?? null,
    venue: competition?.venue?.fullName ?? null
  };
}

async function loadLeague(source: League, compactDate: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${source.path}/scoreboard?dates=${compactDate}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 30 },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`${source.league}: provider returned ${response.status}`);
    const data = await response.json();
    return (data.events ?? []).map((event: any) => normalize(event, source)).filter(Boolean);
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const sportFilter = request.nextUrl.searchParams.get("sport") ?? "All";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Date must use YYYY-MM-DD." }, { status: 400 });
  }
  const compactDate = date.replaceAll("-", "");
  const sources = LEAGUES.filter((source) => sportFilter === "All" || source.sport === sportFilter);

  // ask the leagues in groups so the provider is not hit with everything at once
  const results: PromiseSettledResult<any[]>[] = [];
  for (let i = 0; i < sources.length; i += 40) {
    const group = sources.slice(i, i + 40);
    results.push(...(await Promise.allSettled(group.map((source) => loadLeague(source, compactDate)))));
  }

  const seen = new Set<string>();
  const matches = results
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((match: any) => {
      const key = match.league + ":" + match.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  const failed = results.filter((result) => result.status === "rejected").length;

  matches.sort((a: any, b: any) => {
    if (a.live !== b.live) return a.live ? -1 : 1;
    return String(a.startTime ?? "").localeCompare(String(b.startTime ?? ""));
  });
  return NextResponse.json({
    date,
    matches,
    liveCount: matches.filter((match: any) => match.live).length,
    completedCount: matches.filter((match: any) => match.completed).length,
    scheduledCount: matches.filter((match: any) => !match.live && !match.completed).length,
    competitionsChecked: sources.length,
    competitionsUnavailable: failed,
    coverageNote: "Live scores and fixtures are returned only where the public scoreboard feed provides them. This is not a licensed global data feed."
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
