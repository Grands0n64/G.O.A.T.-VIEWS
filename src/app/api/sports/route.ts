import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SOURCES = [
  { sport: "Football", path: "soccer/eng.1", league: "Premier League" },
  { sport: "Football", path: "soccer/esp.1", league: "LaLiga" },
  { sport: "Football", path: "soccer/ita.1", league: "Serie A" },
  { sport: "Football", path: "soccer/ger.1", league: "Bundesliga" },
  { sport: "Football", path: "soccer/fra.1", league: "Ligue 1" },
  { sport: "Football", path: "soccer/uefa.champions", league: "UEFA Champions League" },
  { sport: "Football", path: "soccer/uefa.europa", league: "UEFA Europa League" },
  { sport: "Football", path: "soccer/usa.1", league: "MLS" },
  { sport: "Football", path: "soccer/mex.1", league: "Liga MX" },
  { sport: "Football", path: "soccer/bra.1", league: "Brazil Serie A" },
  { sport: "Football", path: "soccer/arg.1", league: "Argentina Primera" },
  { sport: "Basketball", path: "basketball/nba", league: "NBA" },
  { sport: "Basketball", path: "basketball/wnba", league: "WNBA" },
  { sport: "Hockey", path: "hockey/nhl", league: "NHL" },
  { sport: "Baseball", path: "baseball/mlb", league: "MLB" },
  { sport: "American Football", path: "football/nfl", league: "NFL" }
] as const;

function normalize(event: any, source: (typeof SOURCES)[number]) {
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
    league: event.league?.name ?? source.league,
    country: event.season?.name ?? "",
    home: home.team?.displayName ?? home.team?.name ?? "Home",
    away: away.team?.displayName ?? away.team?.name ?? "Away",
    homeScore: home.score === undefined || home.score === null || home.score === "" ? null : Number(home.score),
    awayScore: away.score === undefined || away.score === null || away.score === "" ? null : Number(away.score),
    status: detail,
    live: state === "in",
    completed: state === "post",
    startTime: event.date ?? null,
    venue: competition?.venue?.fullName ?? null,
  };
}

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const sportFilter = request.nextUrl.searchParams.get("sport") ?? "All";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Date must use YYYY-MM-DD." }, { status: 400 });
  }
  const compactDate = date.replaceAll("-", "");
  const sources = SOURCES.filter((source) => sportFilter === "All" || source.sport === sportFilter);
  const results = await Promise.allSettled(sources.map(async (source) => {
    const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${source.path}/scoreboard?dates=${compactDate}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 30 }
    });
    if (!response.ok) throw new Error(`${source.league}: provider returned ${response.status}`);
    const data = await response.json();
    return (data.events ?? []).map((event: any) => normalize(event, source)).filter(Boolean);
  }));
  const matches = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
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
