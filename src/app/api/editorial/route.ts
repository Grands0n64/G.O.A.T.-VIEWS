import {NextRequest,NextResponse} from "next/server";
export const dynamic="force-dynamic";
export const revalidate=180;
type Story={title:string;url:string;description:string;publishedAt:string;source:string};
function decode(s:string){return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)));}
function clean(s:string){return decode(s).replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();}
function tag(x:string,n:string){const m=x.match(new RegExp("<"+n+"(?:\\s[^>]*)?>([\\s\\S]*?)</"+n+">","i"));return m?clean(m[1]):"";}
function parse(xml:string):Story[]{return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map(m=>{
 const x=m[1],link=x.match(/<link(?:\s[^>]*)?>([\s\S]*?)<\/link>/i)||x.match(/<link[^>]+href=["']([^"']+)["']/i);
 let url="";try{const u=new URL(decode(link?.[1]||"").trim());if(u.protocol==="https:")url=u.toString();}catch{}
 const source=x.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
 return {title:tag(x,"title"),url,description:tag(x,"description"),publishedAt:tag(x,"pubDate"),source:source?clean(source[1]):"Sports publisher"};
 }).filter(x=>x.title&&x.url&&!/^Google News$/i.test(x.title));}
const queries:Record<string,string>={
 "All Sports":"latest sports news football basketball tennis cricket formula 1",
 "All Clubs":"football club news latest updates transfers injuries suspensions managers official announcements all teams worldwide",
 "Football":"football soccer news latest transfers clubs results injuries managers",
 "Basketball":"basketball NBA WNBA news latest",
 "Tennis":"tennis ATP WTA news latest",
 "Formula 1":"Formula 1 F1 latest news",
 "Cricket":"cricket latest news",
 "Premier League":"Premier League football clubs news",
 "La Liga":"La Liga Barcelona Real Madrid Atletico news",
 "Bundesliga":"Bundesliga Bayern Munich Borussia Dortmund news",
 "Serie A":"Serie A Inter Milan Juventus Napoli news",
 "Ligue 1":"Ligue 1 PSG Marseille news",
 "Saudi Pro League":"Saudi Pro League Al Hilal Al Nassr Al Ittihad Al Ahli news",
 "MLS":"MLS Inter Miami LAFC LA Galaxy news",
 "UEFA":"UEFA Champions League Europa League Conference League news",
 "FIFA":"FIFA World Cup international football news",
 "Barcelona":"FC Barcelona latest news",
 "Real Madrid":"Real Madrid latest news",
 "Atletico Madrid":"Atletico Madrid latest news",
 "Manchester City":"Manchester City latest news",
 "Manchester United":"Manchester United latest news",
 "Liverpool":"Liverpool FC latest news",
 "Arsenal":"Arsenal FC latest news",
 "Chelsea":"Chelsea FC latest news",
 "Tottenham":"Tottenham Hotspur latest news",
 "Newcastle United":"Newcastle United latest news",
 "Bayern Munich":"Bayern Munich latest news",
 "Borussia Dortmund":"Borussia Dortmund latest news",
 "Paris Saint-Germain":"Paris Saint-Germain PSG latest news",
 "Juventus":"Juventus latest news",
 "Inter Milan":"Inter Milan latest news",
 "AC Milan":"AC Milan latest news",
 "Al Nassr":"Al Nassr latest news",
 "Al Hilal":"Al Hilal latest news",
 "Inter Miami":"Inter Miami latest news"
};
const publishers=[
 {name:"BBC Sport",url:"https://feeds.bbci.co.uk/sport/football/rss.xml"},
 {name:"Sky Sports",url:"https://www.skysports.com/rss/12040"},
 {name:"The Guardian",url:"https://www.theguardian.com/football/rss"}
];
async function fetchFeed(url:string){const r=await fetch(url,{headers:{"User-Agent":"Mozilla/5.0 (compatible; GOATViews/1.0)","Accept":"application/rss+xml, application/xml, text/xml"},signal:AbortSignal.timeout(8000),cache:"no-store"});if(!r.ok)throw new Error("Feed unavailable");return parse(await r.text());}
export async function GET(req:NextRequest){
 const type=req.nextUrl.searchParams.get("type")==="transfers"?"transfers":"news";
 const topic=req.nextUrl.searchParams.get("topic")||"All Sports";
 const custom=req.nextUrl.searchParams.get("q")?.trim().slice(0,100)||"";
 const query=custom?(type==="transfers"?custom+" football transfer news confirmed deals rumours":custom+" football club sport news latest updates"):(type==="transfers"?(topic==="All Sports"||topic==="Football"?"football transfer news latest confirmed deals rumours":(queries[topic]||topic)+" football transfers"):queries[topic]||queries["All Sports"]);
 const googleUrl="https://news.google.com/rss/search?q="+encodeURIComponent(query+" when:7d")+"&hl=en-US&gl=US&ceid=US:en";
 const tasks=[fetchFeed(googleUrl),...(type==="news"&&(topic==="All Sports"||topic==="Football")?publishers.map(p=>fetchFeed(p.url)):[])];
 const results=await Promise.allSettled(tasks);
 let all=results.flatMap(x=>x.status==="fulfilled"?x.value:[]);
 const now=Date.now(),cutoff=now-7*24*60*60*1000;
 all=all.filter(x=>{const t=Date.parse(x.publishedAt);return !Number.isFinite(t)||t>=cutoff;});
 const unique=new Map<string,Story>();for(const x of all){if(!unique.has(x.url))unique.set(x.url,x);}
 const latest=[...unique.values()].sort((a,b)=>(Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0)).slice(0,70);
 const resolved=await Promise.all(latest.map(async x=>{
  if(!new URL(x.url).hostname.endsWith("news.google.com"))return x;
  try{const r=await fetch(x.url,{redirect:"follow",headers:{"User-Agent":"Mozilla/5.0 (compatible; GOATViews/1.0)"},signal:AbortSignal.timeout(4500),cache:"no-store"});const u=new URL(r.url);if(!u.hostname.endsWith("news.google.com"))return {...x,url:u.toString()};return x;}catch{return x;}
 }));
 return NextResponse.json({type,topic,items:resolved,feedsAvailable:results.filter(x=>x.status==="fulfilled").length,updatedAt:new Date().toISOString(),window:"7 days"},{headers:{"Cache-Control":"no-store, max-age=0"}});
}