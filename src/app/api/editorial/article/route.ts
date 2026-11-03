import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const ALLOWED = ["bbc.com","bbc.co.uk","espn.com","skysports.com","theguardian.com","transfermarkt.com","goal.com","cbssports.com","formula1.com","nytimes.com"];
function meta(html:string,key:string,attr="property"){
 const escaped=key.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
 const patterns=[new RegExp("<meta[^>]*"+attr+"=[\"']"+escaped+"[\"'][^>]*content=[\"']([^\"']*)[\"'][^>]*>","i"),new RegExp("<meta[^>]*content=[\"']([^\"']*)[\"'][^>]*"+attr+"=[\"']"+escaped+"[\"'][^>]*>","i")];
 for(const p of patterns){const m=html.match(p);if(m)return m[1].replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'");}
 return "";
}
export async function GET(req:NextRequest){
 const raw=req.nextUrl.searchParams.get("url")||"";
 let target:URL;try{target=new URL(raw);}catch{return NextResponse.json({error:"Invalid article URL."},{status:400});}
 if(target.protocol!=="https:"||!ALLOWED.some(domain=>target.hostname===domain||target.hostname.endsWith("."+domain)))return NextResponse.json({error:"This publisher is not supported yet."},{status:400});
 try{
  const response=await fetch(target.toString(),{headers:{"User-Agent":"Mozilla/5.0 (compatible; GOATViewsReader/1.0)","Accept":"text/html"},signal:AbortSignal.timeout(9000),redirect:"follow",next:{revalidate:1800}});
  if(!response.ok)throw new Error("Publisher page unavailable");
  const html=(await response.text()).slice(0,2_000_000);
  const title=meta(html,"og:title")||html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]*>/g,"").trim()||"Sports report";
  const description=meta(html,"og:description")||meta(html,"description","name");
  const image=meta(html,"og:image");
  const author=meta(html,"author","name")||meta(html,"article:author");
  const publishedAt=meta(html,"article:published_time");
  const caption=meta(html,"og:image:alt");
  const site=meta(html,"og:site_name")||target.hostname.replace(/^www\./,"");
  return NextResponse.json({title,description,image,author,publishedAt,caption,site,url:target.toString()},{headers:{"Cache-Control":"public, s-maxage=1800, stale-while-revalidate=3600"}});
 }catch{return NextResponse.json({error:"We couldn't load the publisher's article preview. You can still return to the news feed."},{status:502});}
}