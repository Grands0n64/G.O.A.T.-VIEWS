import { NextRequest, NextResponse } from "next/server";
export const dynamic="force-dynamic";
const paths:Record<string,string>={"Premier League":"soccer/eng.1","LaLiga":"soccer/esp.1","Serie A":"soccer/ita.1","Bundesliga":"soccer/ger.1","Ligue 1":"soccer/fra.1","UEFA Champions League":"soccer/uefa.champions","UEFA Europa League":"soccer/uefa.europa","MLS":"soccer/usa.1","Liga MX":"soccer/mex.1","NBA":"basketball/nba","WNBA":"basketball/wnba","NHL":"hockey/nhl","MLB":"baseball/mlb","NFL":"football/nfl"};
export async function GET(req:NextRequest){
 const league=req.nextUrl.searchParams.get("league")??"Premier League",id=req.nextUrl.searchParams.get("id");
 const path=paths[league];if(!path||!id)return NextResponse.json({error:"Match details unavailable."},{status:400});
 try{
  const r=await fetch("https://site.api.espn.com/apis/site/v2/sports/"+path+"/summary?event="+encodeURIComponent(id),{cache:"no-store"});
  if(!r.ok)return NextResponse.json({error:"Match details unavailable."},{status:502});
  const d=await r.json();
  return NextResponse.json({header:d.header??null,boxscore:d.boxscore??null,plays:d.plays??null,rosters:d.rosters??null,leaders:d.leaders??null,statistics:d.statistics??null,commentary:d.commentary??null});
 }catch{return NextResponse.json({error:"Could not load match details."},{status:502});}
}