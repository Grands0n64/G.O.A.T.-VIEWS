import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const paths: Record<string,string> = {
  "Premier League":"soccer/eng.1", "LaLiga":"soccer/esp.1", "Serie A":"soccer/ita.1",
  "Bundesliga":"soccer/ger.1", "Ligue 1":"soccer/fra.1", "UEFA Champions League":"soccer/uefa.champions",
  "UEFA Europa League":"soccer/uefa.europa", "MLS":"soccer/usa.1", "Liga MX":"soccer/mex.1",
  "Brazil Serie A":"soccer/bra.1", "Argentina Primera":"soccer/arg.1",
  "NBA":"basketball/nba", "WNBA":"basketball/wnba", "NHL":"hockey/nhl", "MLB":"baseball/mlb", "NFL":"football/nfl"
};

function normalizeScheduleEvent(event: any, teamId: string) {
  const competition = event.competitions?.[0];
  const competitors = competition?.competitors ?? [];
  const home = competitors.find((x: any) => x.homeAway === "home") ?? competitors[0];
  const away = competitors.find((x: any) => x.homeAway === "away") ?? competitors[1];
  if (!home || !away) return null;
  const status = competition?.status ?? event.status ?? {};
  return {
    id: String(event.id ?? ""),
    date: event.date ?? null,
    home: home.team?.displayName ?? home.team?.name ?? "Home",
    away: away.team?.displayName ?? away.team?.name ?? "Away",
    homeScore: home.score ?? null,
    awayScore: away.score ?? null,
    completed: status.type?.completed === true || status.type?.state === "post",
    live: status.type?.state === "in",
    isUserTeamHome: String(home.team?.id ?? "") === teamId
  };
}

export async function GET(req: NextRequest) {
  const league = req.nextUrl.searchParams.get("league") ?? "Premier League";
  const id = req.nextUrl.searchParams.get("id");
  const path = paths[league];
  if (!path || !id) return NextResponse.json({ error: "Match details unavailable." }, { status: 400 });

  try {
    const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${path}/summary?event=${encodeURIComponent(id)}`, {
      headers: { Accept: "application/json" }, cache: "no-store"
    });
    if (!response.ok) return NextResponse.json({ error: "Match details are temporarily unavailable." }, { status: 502 });
    const d = await response.json();
    const competitors = d.header?.competitions?.[0]?.competitors ?? [];
    const schedules = await Promise.all(competitors.map(async (competitor: any) => {
      const teamId = String(competitor.team?.id ?? "");
      if (!teamId) return { teamId, events: [] };
      try {
        const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${path}/teams/${encodeURIComponent(teamId)}/schedule`, {
          headers: { Accept: "application/json" }, next: { revalidate: 300 }
        });
        if (!r.ok) return { teamId, events: [] };
        const payload = await r.json();
        const events = (payload.events ?? payload.schedule ?? []).map((event: any) => normalizeScheduleEvent(event, teamId)).filter(Boolean);
        const now = Date.now();
        const recent = events.filter((event: any) => event.completed && event.date && Date.parse(event.date) <= now).slice(-5).reverse();
        const upcoming = events.filter((event: any) => !event.completed && !event.live && event.date && Date.parse(event.date) > now).slice(0, 5);
        return { teamId, recent, upcoming };
      } catch {
        return { teamId, recent: [], upcoming: [] };
      }
    }));
    return NextResponse.json({
      header: d.header ?? null,
      boxscore: d.boxscore ?? null,
      plays: d.plays ?? null,
      rosters: d.rosters ?? null,
      leaders: d.leaders ?? null,
      statistics: d.statistics ?? null,
      commentary: d.commentary ?? null,
      keyEvents: d.keyEvents ?? null,
      teamSchedules: schedules
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ error: "Could not load match details." }, { status: 502 });
  }
}