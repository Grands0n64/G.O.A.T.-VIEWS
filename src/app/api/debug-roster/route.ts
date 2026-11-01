import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const paths: Record<string, string> = {
  "Premier League": "soccer/eng.1",
  "LaLiga": "soccer/esp.1",
  "Serie A": "soccer/ita.1",
  "Bundesliga": "soccer/ger.1",
  "Ligue 1": "soccer/fra.1",
  "UEFA Champions League": "soccer/uefa.champions",
  "UEFA Europa League": "soccer/uefa.europa",
  "MLS": "soccer/usa.1",
  "Liga MX": "soccer/mex.1",
  "Brazil Serie A": "soccer/bra.1",
  "Argentina Primera": "soccer/arg.1"
};

export async function GET(req: NextRequest) {
  const league = req.nextUrl.searchParams.get("league") ?? "Premier League";
  const id = req.nextUrl.searchParams.get("id");
  const path = paths[league];
  if (!path || !id) return NextResponse.json({ error: "Use ?league=Premier League&id=MATCHID" });
  const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${path}/summary?event=${encodeURIComponent(id)}`, { cache: "no-store" });
  const d = await res.json();
  const rosters = (d.rosters ?? []).map((r: any) => ({
    team: r.team?.displayName,
    homeAway: r.homeAway,
    formation: r.formation,
    rosterCount: (r.roster ?? []).length,
    firstTwoPlayers: (r.roster ?? []).slice(0, 2)
  }));
  const goals = (d.keyEvents ?? []).filter((e: any) => e.scoringPlay).slice(0, 2);
  return NextResponse.json({ rosters, goals, keyEventsCount: (d.keyEvents ?? []).length });
}
