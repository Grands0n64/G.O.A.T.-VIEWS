"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, CalendarDays, ChevronRight, CircleDot, Flame, Menu, Search, Star, Trophy, Tv, RefreshCw } from "lucide-react";
import CompetitionStandings from "./components/CompetitionStandings";
import { LEAGUES } from "./leagues";
import { matchPath } from "./slug";

type Match = {
 id:string; sport:string; league:string; country:string; home:string; away:string;
 homeScore:number|null; awayScore:number|null; status:string; live:boolean; completed:boolean;
 startTime:string|null; venue:string|null; broadcast:string|null; url:string|null;
};
type Feed = { date:string; matches:Match[]; liveCount:number; completedCount:number; scheduledCount:number; competitionsChecked:number; competitionsUnavailable:number; coverageNote:string };
const sports=["Football","Basketball","Hockey","Baseball","American Football"];
const leagueOrder=LEAGUES.map(l=>l.league);
function localDate(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");}
export default function Home(){
 const router=useRouter();
 const [sport,setSport]=useState("Football"),[league,setLeague]=useState("All"),[search,setSearch]=useState(""),[liveOnly,setLiveOnly]=useState(false),[saved,setSaved]=useState<string[]>([]),[date,setDate]=useState(localDate),[feed,setFeed]=useState<Feed|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[lastUpdated,setLastUpdated]=useState("");
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{const response=await fetch(`/api/sports?date=${date}&sport=${encodeURIComponent(sport)}`,{cache:"no-store"});if(!response.ok)throw new Error("Sports data provider is temporarily unavailable.");const data=await response.json();setFeed(data);setLastUpdated(new Date().toLocaleTimeString());}
  catch(e){setError(e instanceof Error?e.message:"Unable to load sports data.");}
  finally{setLoading(false);}
 },[date,sport]);
 useEffect(()=>{void load();const timer=setInterval(()=>void load(),60000);return()=>clearInterval(timer);},[load]);
 const competitions=useMemo(()=>{const present=new Set((feed?.matches??[]).map(m=>m.league));return ["All",...leagueOrder.filter(l=>present.has(l)||l==="Saudi Pro League")];},[feed]);
 useEffect(()=>{if(feed&&league!=="All"&&!competitions.includes(league))setLeague("All");},[feed,competitions,league]);
 const visible=useMemo(()=> (feed?.matches??[]).filter(g=>(league==="All"||g.league===league)&&(!liveOnly||g.live)&&(`${g.home} ${g.away} ${g.league}`.toLowerCase().includes(search.toLowerCase()))),[feed,league,liveOnly,search]);
 const today=date===localDate();
 const footerLink={color:"inherit",textDecoration:"none",marginRight:16} as const;
 return <main className="app"><header className="top"><a className="logo" href="#"><span className="logo-icon">G</span><span>G.O.A.T.<b> VIEWS</b><small>SEE THE GAME DIFFERENTLY</small></span></a><nav><a className="on" href="#scores">Scores</a><a href="#competitions">Competitions</a><a href="#stories">Stories</a></nav><div className="topright"><button className="round" aria-label="Refresh scores" onClick={()=>void load()}><RefreshCw size={17}/></button><Link className="signin" href="/login">Sign in</Link><button className="round mobile"><Menu/></button></div></header>
 <div className="sportnav">{sports.map((s,i)=><button key={s} className={sport===s?"sport active":"sport"} onClick={()=>{setSport(s);setLeague("All");setLiveOnly(false);}}><span>{["⚽","🏀","🏒","⚾","🏈"][i]}</span>{s}</button>)}<button className={league==="Saudi Pro League"?"sport active":"sport"} onClick={()=>{setSport("Football");setLeague("Saudi Pro League");setLiveOnly(false);}}>🇸🇦 Saudi Pro League</button></div>
 <div className="layout"><aside className="side"><p className="label">YOUR SPORTS</p><a className="sideactive" href="#scores"><Activity/> Match centre <i>LIVE</i></a><a href="#competitions"><Trophy/> Competitions</a><a href="#stories"><Tv/> Highlights</a><a href="#scores"><CalendarDays/> Fixtures</a><p className="label extra">QUICK FILTERS</p><a className="fav" href="#scores" onClick={()=>setLiveOnly(true)}><CircleDot size={15}/> Live matches</a><a className="fav" href="#scores" onClick={()=>setLiveOnly(false)}>All matches</a><div className="sidepromo"><Flame/><b>All the action.<br/>One destination.</b><span>Live scores and fixtures from supported competitions around the world.</span></div></aside>
 <section className="main"><div className="heading"><div><span className="kicker"><span className="dot"/> GLOBAL SPORTS CENTRE</span><h1>Scores & Fixtures</h1><p>Follow the action across the world of sport.</p></div><label className="date"><CalendarDays size={17}/><input aria-label="Choose match date" type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div>
 <div className="banner"><div><span className="banner-tag"><Flame size={13}/> YOUR WORLD OF SPORT</span><h2>Every game.<br/><em>Every moment.</em></h2><p>Live scores, fixtures and the moments that matter.</p><a href="#scores">Explore matches <ChevronRight size={16}/></a></div><div className="ball-art"><div className="orbit o1"/><div className="orbit o2"/><div className="ball">🏆</div><span>GAME<br/>ON</span></div></div>
 <div className="stats"><div><b>{feed?.liveCount??"—"}</b><span>LIVE NOW</span></div><div><b>{feed?.scheduledCount??"—"}</b><span>UPCOMING</span></div><div><b>{feed?.completedCount??"—"}</b><span>COMPLETED</span></div><div><b>{feed?.matches.length??"—"}</b><span>MATCHES FOUND</span></div></div>
 <div className="sectiontitle" id="scores"><div><h2>{today?"Today's matches":`Matches · ${date}`}</h2><p>{loading?"Updating scores…":`Last updated ${lastUpdated||"—"}`}</p></div><button className={liveOnly?"livefilter selected":"livefilter"} onClick={()=>setLiveOnly(!liveOnly)}><CircleDot size={15}/> Live now</button></div>
 <div className="filters"><div className="leagues">{competitions.map(c=><button key={c} className={league===c?"chip picked":"chip"} onClick={()=>setLeague(c)}>{c.replace("UEFA ","")}</button>)}</div><label className="search"><Search size={16}/><input placeholder="Search teams or leagues" value={search} onChange={e=>setSearch(e.target.value)}/></label></div>
 {error&&<div className="empty">{error} Please refresh in a moment.</div>}
 <div className="cards">{loading&&!feed?<div className="empty">Loading matches…</div>:visible.length?visible.map(g=>{const href=matchPath(g);return <article className="game" key={g.league+g.id} onClick={()=>router.push(href)}><div className="gameleague"><span>🏆</span><b>{g.league}</b><small>{g.country||g.sport}</small><button aria-label="Favourite match" onClick={e=>{e.stopPropagation();setSaved(v=>v.includes(g.id)?v.filter(x=>x!==g.id):[...v,g.id]);}}><Star size={16} fill={saved.includes(g.id)?"currentColor":"none"}/></button></div><Link href={href} onClick={e=>e.stopPropagation()} aria-label={`${g.home} vs ${g.away}`} style={{color:"inherit",textDecoration:"none",display:"block"}}><div className="teams"><div className="team"><span className="crest">{g.home[0]}</span><b>{g.home}</b></div><div className="score"><strong>{g.homeScore??"–"}</strong><span>:</span><strong>{g.awayScore??"–"}</strong><small className={g.live?"red":g.completed?"":" "}>{g.live?"LIVE":g.status}</small></div><div className="team away"><b>{g.away}</b><span className="crest">{g.away[0]}</span></div><span className="more">{g.live?"●":""}</span></div>{g.venue&&<div className="matchmeta">{g.venue}</div>}</Link></article>}):!error?<div className="empty">{feed?.matches.length===0?"There are no listed matches for this sport on the selected date.":"No matches match these filters."}</div>:null}</div>
 <p className="disclaimer">Live scores and fixtures are displayed when available. Some competitions may have no scheduled matches on the selected date.</p>
 <CompetitionStandings/>
 <div className="bottomgrid" id="competitions"><section className="panel"><div className="sectiontitle"><div><h2>Competitions</h2><p>Leagues with matches on this date</p></div></div>{competitions.slice(1).map(c=><button className="comp" key={c} onClick={()=>{setLeague(c);document.getElementById("scores")?.scrollIntoView({behavior:"smooth"});}}><span>🏆</span>{c}<ChevronRight size={16}/></button>)}</section><section className="panel" id="stories"><div className="sectiontitle"><div><h2>Match centre</h2><p>Live data and match updates</p></div></div><div className="story"><Tv/><div><b>Live scoreboards</b><p>Scores, match status and fixture times from connected feeds.</p></div></div><div className="story"><Trophy/><div><b>Competition coverage</b><p>Coverage depends on the leagues published by the data source.</p></div></div><div className="story"><Star/><div><b>Favourites</b><p>Star matches to keep them highlighted during this session.</p></div></div></section></div>
 </section></div><footer><span>© 2026 G.O.A.T. VIEWS · Global sports. One view.</span><span><Link href="/about" style={footerLink}>About</Link><Link href="/privacy" style={footerLink}>Privacy</Link><Link href="/terms" style={footerLink}>Terms</Link><Link href="/contact" style={{...footerLink,marginRight:0}}>Contact</Link></span></footer></main>
}
