import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 600;
type Source = { name: string; url: string };
const transferFeeds: Source[] = [
 { name: "Sky Sports", url: "https://www.skysports.com/rss/11095" },
 { name: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/football/rss.xml" },
 { name: "The Guardian", url: "https://www.theguardian.com/football/rss" },
 { name: "Transfermarkt", url: "https://www.transfermarkt.com/rss/news" },
 { name: "ESPN", url: "https://news.google.com/rss/search?q=site%3Aespn.com%2Fsoccer+transfer&hl=en-US&gl=US&ceid=US:en" },
 { name: "Goal", url: "https://www.goal.com/feeds/en/news" }
];
const newsFeeds: Source[] = [
 { name: "ESPN", url: "https://news.google.com/rss/search?q=site%3Aespn.com+sports&hl=en-US&gl=US&ceid=US:en" },
 { name: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/rss.xml" },
 { name: "Sky Sports", url: "https://www.skysports.com/rss/12040" },
 { name: "The Guardian", url: "https://www.theguardian.com/sport/rss" },
 { name: "CBS Sports", url: "https://www.cbssports.com/rss/headlines/" },
 { name: "Formula 1", url: "https://www.formula1.com/en/latest/all.xml" },
 { name: "The Athletic", url: "https://www.nytimes.com/athletic/rss/news/" }
];
function decode(s: string) { return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))); }
function clean(s: string) { return decode(s).replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim(); }
function getTag(xml: string, name: string) { const m=xml.match(new RegExp("<"+name+"(?:\\s[^>]*)?>([\\s\\S]*?)</"+name+">","i")); return m?clean(m[1]):""; }
function parse(xml: string, source: Source) {
 const entries=[...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map(m=>m[1]);
 const atom=[...xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi)].map(m=>m[1]);
 return [...entries,...atom].map(item=>{
  const l=item.match(/<link(?:\s[^>]*?)?>([\s\S]*?)<\/link>/i)||item.match(/<link[^>]+href=["\']([^"\']+)["\']/i);
  let url=""; try { const u=new URL(decode(l?.[1]||"").trim(),source.url); if(u.protocol==="https:"||u.protocol==="http:")url=u.toString(); } catch {}
  const sourceMatch=item.match(/<source[^>]*>([\\s\\S]*?)<\\/source>/i);
  const sourceName=sourceMatch?clean(sourceMatch[1]):source.name;
  const description=getTag(item,"description")||getTag(item,"summary")||getTag(item,"content:encoded");
  return { title:getTag(item,"title"), url, description, publishedAt:getTag(item,"pubDate")||getTag(item,"published")||getTag(item,"updated"), source:sourceName };
 }).filter(x=>x.title&&x.url);
}
const topicTerms: Record<string,string[]> = {
 "Premier League":["premier league","arsenal","chelsea","liverpool","manchester","tottenham","newcastle"],
 "La Liga":["la liga","real madrid","barcelona","atletico madrid"], "Bundesliga":["bundesliga","bayern","dortmund","leverkusen"],
 "Serie A":["serie a","inter","milan","juventus","napoli"], "Ligue 1":["ligue 1","psg","paris saint-germain","marseille"],
 "Saudi Pro League":["saudi pro league","al-hilal","al nassr","al-ittihad","al-ahli"], "MLS":["mls","major league soccer","inter miami","la galaxy"],
 "UEFA":["uefa","champions league","europa league","conference league"], "FIFA":["fifa","world cup","club world cup"],
 "Basketball":["basketball","nba","wnba"], "Tennis":["tennis","atp","wta"], "Formula 1":["formula 1","formula one","f1","grand prix"], "Cricket":["cricket","ipl","t20"]
};
export async function GET(req: NextRequest) {
 const type=req.nextUrl.searchParams.get("type")==="transfers"?"transfers":"news";
 const topic=req.nextUrl.searchParams.get("topic")||"All";
 const feeds=type==="transfers"?transferFeeds:newsFeeds;
 const q=(type==="transfers"?"football transfer news ":"sports news ")+(topic==="All"?"":topic+" ")+"(site:espn.com OR site:bbc.com OR site:skysports.com OR site:theguardian.com OR site:transfermarkt.com)";
 const sources=[...feeds,{name:"Sports publishers",url:"https://news.google.com/rss/search?q="+encodeURIComponent(q)+"&hl=en-US&gl=US&ceid=US:en"}];
 const results=await Promise.allSettled(sources.map(async source=>{
  const res=await fetch(source.url,{headers:{"User-Agent":"Mozilla/5.0 (compatible; GOATViews/1.0)","Accept":"application/rss+xml, application/atom+xml, application/xml, text/xml"},signal:AbortSignal.timeout(7000),next:{revalidate:600}});
  if(!res.ok)throw new Error("Feed unavailable"); return parse(await res.text(),source);
 }));
 const all=results.flatMap(r=>r.status==="fulfilled"?r.value:[]);
 const filtered=topic==="All"?all:all.filter(a=>(topicTerms[topic]||[]).some(term=>a.title.toLowerCase().includes(term)));
 const unique=new Map<string,typeof all[number]>(); for(const a of filtered)if(!unique.has(a.url))unique.set(a.url,a);
 const rawItems=[...unique.values()].sort((a,b)=>(Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0)).slice(0,60);
 const items=await Promise.all(rawItems.map(async item=>{
  if(!new URL(item.url).hostname.endsWith("news.google.com"))return item;
  try{
   const resolved=await fetch(item.url,{redirect:"follow",headers:{"User-Agent":"Mozilla/5.0 (compatible; GOATViews/1.0)"},signal:AbortSignal.timeout(5000)});
   const finalUrl=new URL(resolved.url);
   if(finalUrl.hostname.endsWith("news.google.com"))return null;
   return {...item,url:finalUrl.toString()};
  }catch{return null;}
 }));
 const validItems=items.filter((item):item is NonNullable<typeof item>=>Boolean(item));
 return NextResponse.json({type,topic,items:validItems,feedsAvailable:results.filter(r=>r.status==="fulfilled").length,updatedAt:new Date().toISOString()},{headers:{"Cache-Control":"public, s-maxage=600, stale-while-revalidate=1200"}});
}