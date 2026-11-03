import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 600;

type Feed = { name: string; url: string };
const transferFeeds: Feed[] = [
  { name: "Sky Sports", url: "https://www.skysports.com/rss/11095" },
  { name: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/football/rss.xml" },
  { name: "The Guardian", url: "https://www.theguardian.com/football/rss" },
  { name: "Transfermarkt", url: "https://www.transfermarkt.com/rss/news" },
  { name: "ESPN", url: "https://news.google.com/rss/search?q=site%3Aespn.com%2Fsoccer+transfer&hl=en-US&gl=US&ceid=US:en" },
  { name: "ESPN", url: "https://news.google.com/rss/search?q=site%3Aespn.com+football+transfer+news&hl=en-US&gl=US&ceid=US:en" }
];
const sportsFeeds: Feed[] = [
  { name: "Sky Sports", url: "https://www.skysports.com/rss/12040" },
  { name: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/rss.xml" },
  { name: "The Guardian", url: "https://www.theguardian.com/sport/rss" },
  { name: "ESPN", url: "https://news.google.com/rss/search?q=site%3Aespn.com+sports&hl=en-US&gl=US&ceid=US:en" },
  { name: "CBS Sports", url: "https://www.cbssports.com/rss/headlines/" },
  { name: "Formula 1", url: "https://www.formula1.com/en/latest/all.xml" },
  { name: "The Athletic", url: "https://www.nytimes.com/athletic/rss/news/" }
];
const terms: Record<string,string[]> = {
 "Football":["football","soccer"],"Football":["football","soccer","premier league","la liga","bundesliga","serie a","ligue 1"],"Basketball":["basketball","nba","wnba"],"Tennis":["tennis","atp","wta"],
 "Formula 1":["formula 1","formula one","f1","grand prix"],"Cricket":["cricket","ipl","t20"],
 "Premier League":["premier league","arsenal","chelsea","liverpool","manchester","tottenham","newcastle"],
 "La Liga":["la liga","real madrid","barcelona","atletico madrid"],"Bundesliga":["bundesliga","bayern","dortmund","leverkusen"],
 "Serie A":["serie a","inter milan","juventus","napoli","roma"],"Ligue 1":["ligue 1","psg","paris saint-germain","marseille"],
 "Saudi Pro League":["saudi pro league","al-hilal","al nassr","al-ittihad","al-ahli"],"MLS":["mls","major league soccer","inter miami","la galaxy"],
 "UEFA":["uefa","champions league","europa league","conference league"],"FIFA":["fifa","world cup","club world cup"]
};
function decode(s:string){return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)));}
function field(xml:string,name:string){const m=xml.match(new RegExp("<"+name+"(?:\\s[^>]*)?>([\\s\\S]*?)</"+name+">","i"));return m?decode(m[1]).replace(/<[^>]*>/g," ").replace(/\\s+/g," ").trim():"";}
async function readFeed(feed:Feed){
 const res=await fetch(feed.url,{headers:{"User-Agent":"Mozilla/5.0 (compatible; GOATViews/1.0)"},signal:AbortSignal.timeout(6500),next:{revalidate:600}});
 if(!res.ok)throw new Error("Feed unavailable");
 const xml=await res.text();
 return [...xml.matchAll(/<item(?:\\s[^>]*)?>([\\s\\S]*?)<\\/item>/gi)].map(m=>{
  const item=m[1],link=item.match(/<link>([\\s\\S]*?)<\\/link>/i)?.[1]?.trim()||"";
  const publisher=field(item,"source");
  let url="";try{const parsed=new URL(decode(link),feed.url);if(["https:","http:"].includes(parsed.protocol))url=parsed.href;}catch{}
  return {title:field(item,"title"),url,publishedAt:field(item,"pubDate"),source:publisher||feed.name};
 }).filter(x=>x.title&&x.url);
}
export async function GET(req:NextRequest){
 const type=req.nextUrl.searchParams.get("type")==="transfers"?"transfers":"news";
 const topic=req.nextUrl.searchParams.get("topic")||"All";
 const feeds=type==="transfers"?transferFeeds:sportsFeeds;
 const query=(type==="transfers"?"football transfers ":"sports news ")+(topic==="All"?"":topic+" ")+"(site:espn.com OR site:bbc.com OR site:skysports.com OR site:theguardian.com OR site:transfermarkt.com)";
 const allFeeds=[...feeds,{name:"Sports publishers",url:"https://news.google.com/rss/search?q="+encodeURIComponent(query)+"&hl=en-US&gl=US&ceid=US:en"}];
 const results=await Promise.allSettled(allFeeds.map(readFeed));
 const all=results.flatMap(r=>r.status==="fulfilled"?r.value:[]);
 const keywords=terms[topic]||[];
 const filtered=topic==="All"?all:all.filter(a=>keywords.some(k=>a.title.toLowerCase().includes(k)));
 const unique=new Map<string,typeof all[number]>();
 for(const item of filtered)if(!unique.has(item.url))unique.set(item.url,item);
 const items=[...unique.values()].sort((a,b)=>(Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0)).slice(0,60);
 return NextResponse.json({type,topic,items,feedsAvailable:results.filter(r=>r.status==="fulfilled").length,updatedAt:new Date().toISOString()},{headers:{"Cache-Control":"public, s-maxage=600, stale-while-revalidate=1200"}});
}