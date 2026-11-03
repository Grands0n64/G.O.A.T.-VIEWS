import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 600;
type Source = { name: string; url: string };
const TRANSFER_SOURCES: Source[] = [
 {name:"Sky Sports",url:"https://www.skysports.com/rss/11095"},
 {name:"BBC Sport",url:"https://feeds.bbci.co.uk/sport/football/rss.xml"},
 {name:"The Guardian",url:"https://www.theguardian.com/football/rss"},
 {name:"Transfermarkt",url:"https://www.transfermarkt.com/rss/news"},
 {name:"ESPN",url:"https://news.google.com/rss/search?q=site%3Aespn.com%2Fsoccer+transfer&hl=en-US&gl=US&ceid=US:en"},
 {name:"ESPN",url:"https://news.google.com/rss/search?q=site%3Aespn.com+football+transfer+news&hl=en-US&gl=US&ceid=US:en"}
];
const NEWS_SOURCES: Source[] = [
 {name:"Sky Sports",url:"https://www.skysports.com/rss/12040"},
 {name:"BBC Sport",url:"https://feeds.bbci.co.uk/sport/rss.xml"},
 {name:"The Guardian",url:"https://www.theguardian.com/sport/rss"},
 {name:"ESPN",url:"https://news.google.com/rss/search?q=site%3Aespn.com+sports&hl=en-US&gl=US&ceid=US:en"},
 {name:"CBS Sports",url:"https://www.cbssports.com/rss/headlines/"},
 {name:"Formula 1",url:"https://www.formula1.com/en/latest/all.xml"}
];
function decode(value:string){return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)));}
function clean(value:string){return decode(value).replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();}
function value(xml:string,name:string){const m=xml.match(new RegExp("<"+name+"(?:\\s[^>]*)?>([\\s\\S]*?)</"+name+">","i"));return m?clean(m[1]):"";}
function parse(xml:string,source:Source){
 const rss=[...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map(m=>m[1]);
 const atom=[...xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi)].map(m=>m[1]);
 return [...rss,...atom].map(item=>{
  const linkTag=item.match(/<link(?:\s[^>]*?)?>([\s\S]*?)<\/link>/i);
  const atomLink=item.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i);
  let url="";try{const parsed=new URL(decode((linkTag?.[1]||atomLink?.[1]||"").trim()),source.url);if(parsed.protocol==="https:"||parsed.protocol==="http:")url=parsed.toString();}catch{}
  return {title:value(item,"title"),url,publishedAt:value(item,"pubDate")||value(item,"published")||value(item,"updated"),source:source.name};
 }).filter(x=>x.title&&x.url);
}
const TERMS:Record<string,string[]> = {
 "Premier League":["premier league","arsenal","chelsea","liverpool","manchester","tottenham","newcastle","aston villa"],
 "La Liga":["la liga","real madrid","barcelona","atletico madrid"],"Bundesliga":["bundesliga","bayern","dortmund","leverkusen"],
 "Serie A":["serie a","inter","milan","juventus","napoli","roma"],"Ligue 1":["ligue 1","psg","paris saint-germain","marseille","monaco"],
 "Saudi Pro League":["saudi","al-hilal","al nassr","al-ittihad","al-ahli"],"MLS":["mls","major league soccer","inter miami","la galaxy"],
 "UEFA":["uefa","champions league","europa league","conference league"],"FIFA":["fifa","world cup","club world cup"],
 "Basketball":["basketball","nba","wnba"],"Tennis":["tennis","atp","wta","grand slam"],"Formula 1":["formula 1","formula one","f1","grand prix"],"Cricket":["cricket","ipl","test match","t20"]
};
export async function GET(req:NextRequest){
 const type=req.nextUrl.searchParams.get("type")==="transfers"?"transfers":"news";
 const topic=req.nextUrl.searchParams.get("topic")||"All";
 const feeds=type==="transfers"?TRANSFER_SOURCES:NEWS_SOURCES;
 const q=(type==="transfers"?"football transfers ":"sports news ")+(topic==="All"?"":topic+" " )+"(site:espn.com OR site:bbc.com OR site:skysports.com OR site:theguardian.com OR site:transfermarkt.com)";
 const sources=[...feeds,{name:"Sports publishers",url:"https://news.google.com/rss/search?q="+encodeURIComponent(q)+"&hl=en-US&gl=US&ceid=US:en"}];
 const settled=await Promise.allSettled(sources.map(async source=>{
  const response=await fetch(source.url,{headers:{"User-Agent":"Mozilla/5.0 (compatible; GOATViewsSportsDesk/1.0)",Accept:"application/rss+xml, application/atom+xml, application/xml, text/xml"},signal:AbortSignal.timeout(7000),next:{revalidate:600}});
  if(!response.ok)throw new Error("Feed unavailable");return parse(await response.text(),source);
 }));
 const all=settled.flatMap(x=>x.status==="fulfilled"?x.value:[]);
 const filtered=topic==="All"?all:all.filter(x=>(TERMS[topic]||[]).some(term=>x.title.toLowerCase().includes(term)));
 const unique=new Map<string,typeof all[number]>();for(const item of filtered)if(!unique.has(item.url))unique.set(item.url,item);
 const items=[...unique.values()].sort((a,b)=>(Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0)).slice(0,60);
 return NextResponse.json({type,topic,items,sourcesChecked:sources.length,feedsAvailable:settled.filter(x=>x.status==="fulfilled").length,updatedAt:new Date().toISOString()},{headers:{"Cache-Control":"public, s-maxage=600, stale-while-revalidate=1200"}});
}
