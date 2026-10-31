import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
 const key = process.env.SPORTSDB_API_KEY;
 if (!key) return NextResponse.json({ source: "Provider not configured", matches: [], configured: false });
 try {
  const response = await fetch(`https://www.thesportsdb.com/api/v1/json/${key}/eventsday.php?d=${new Date().toISOString().slice(0,10)}&s=Soccer`, { next: { revalidate: 60 } });
  if (!response.ok) throw new Error("Sports provider request failed");
  const data = await response.json();
  const matches = (data.events ?? []).map((e: any) => ({ id: String(e.idEvent), league: e.strLeague ?? "Football", country: e.strCountry ?? "", home: e.strHomeTeam, away: e.strAwayTeam, homeScore: e.intHomeScore === null ? undefined : Number(e.intHomeScore), awayScore: e.intAwayScore === null ? undefined : Number(e.intAwayScore), status: e.strStatus ?? e.strTime ?? "Scheduled", live: e.strStatus === "Live" }));
  return NextResponse.json({ source: "TheSportsDB", matches, configured: true });
 } catch { return NextResponse.json({ source: "Sports data temporarily unavailable", matches: [], configured: true }, { status: 502 }); }
}