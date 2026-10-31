import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const LEAGUES: Record<string,string> = {
 "Premier League":"soccer/eng.1","LaLiga":"soccer/esp.1","Serie A":"soccer/ita.1",
 "Bundesliga":"soccer/ger.1","Ligue 1":"soccer/fra.1","UEFA Champions League":"soccer/uefa.champions",
 "UEFA Europa League":"soccer/uefa.europa","MLS":"soccer/usa.1","Liga MX":"soccer/mex.1",
 "Brazil Serie A":"soccer/bra.1","Argentina Primera":"soccer/arg.1",
 "NBA":"basketball/nba","WNBA":"basketball/wnba","NHL":"hockey/nhl","MLB":"baseball/mlb","NFL":"football/nfl"
};

export async function GET(request: NextRequest) {
 const league=request.nextUrl.searchParams.get("league") ?? "Premier League";
 const path=LEAGUES[league];
 if(!path) return NextResponse.json({error:"Standings are not available for this competition."},{status:404});
 try {
  const response=await fetch("https://site.api.espn.com/apis/site/v2/sports/"+path+"/standings",{headers:{Accept:"application/json"},cache:"no-store"});
  if(!response.ok) return NextResponse.json({error:"Standings are temporarily unavailable."},{status:502});
  const data=await response.json();
  return NextResponse.json({league,children:data.children??[],standings:data.standings??null,groups:data.groups??[],season:data.season??null},{headers:{"Cache-Control":"no-store, max-age=0"}});
 } catch {
  return NextResponse.json({error:"Unable to load standings."},{status:502});
 }
}
