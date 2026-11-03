"use client";
import { useCallback,useEffect,useState } from "react";
import { ArrowLeft,ArrowUpRight,RefreshCw,Search,Newspaper,ArrowLeftRight,Clock3 } from "lucide-react";
type Article={title:string;url:string;publishedAt:string;source:string};
type Props={type:"news"|"transfers"};
const NEWS_TOPICS=["All","Football","Basketball","Tennis","Formula 1","Cricket","Premier League","La Liga","Bundesliga","Serie A","Ligue 1","Saudi Pro League","MLS","UEFA","FIFA"];
const TRANSFER_TOPICS=["All","Premier League","La Liga","Bundesliga","Serie A","Ligue 1","Saudi Pro League","MLS","UEFA","FIFA"];
export default function EditorialPage({type}:Props){
 const [topic,setTopic]=useState("All"),[query,setQuery]=useState(""),[items,setItems]=useState<Article[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[updated,setUpdated]=useState("");
 const isTransfer=type==="transfers",topics=isTransfer?TRANSFER_TOPICS:NEWS_TOPICS;
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{const response=await fetch("/api/editorial?type="+type+"&topic="+encodeURIComponent(topic),{cache:"no-store"});if(!response.ok)throw new Error("The sports feeds are temporarily unavailable.");
   const data=await response.json();setItems(Array.isArray(data.items)?data.items:[]);setUpdated(data.updatedAt||"");
   if(!data.feedsAvailable)setError("Our publisher feeds could not be reached. Please try again shortly.");
  }catch(e){setError(e instanceof Error?e.message:"Unable to load articles.");setItems([]);}finally{setLoading(false);}
 },[type,topic]);
 useEffect(()=>{void load();},[load]);
 const visible=items.filter(item=>(item.title+" "+item.source).toLowerCase().includes(query.toLowerCase()));
 return <main className="app editorial-page">
  <header className="top"><a className="logo" href="/"><span className="logo-icon">G</span><span>G.O.A.T.<b> VIEWS</b><small>SEE THE GAME DIFFERENTLY</small></span></a>
   <nav><a href="/">Scores</a><a href="/#competitions">Competitions</a><a className={!isTransfer?"on":""} href="/sports-news">Sports News</a><a className={isTransfer?"on":""} href="/transfer-market">Transfer Market</a></nav>
   <div className="topright"><a className="backhome" href="/"><ArrowLeft size={15}/> Match centre</a></div>
  </header>
  <div className="editorial-hero"><span className="kicker"><span className="dot"/> G.O.A.T. VIEWS · {isTransfer?"GLOBAL TRANSFER DESK":"GLOBAL SPORTS DESK"}</span>
   <h1>{isTransfer?"Transfer Market":"Sports News"}</h1>
   <p>{isTransfer?"Transfer reports, rumours and confirmed deals from the global football market.":"Breaking stories, match reports and analysis from sports publishers around the world."}</p>
   <div className="editorial-stats"><span>{isTransfer?<ArrowLeftRight/>:<Newspaper/>}{isTransfer?"Transfer tracker":"Live news desk"}</span><span><Clock3/> Updated {updated?new Date(updated).toLocaleTimeString():"when feed loads"}</span></div>
  </div>
  <section className="editorial-content"><div className="editorial-toolbar"><div className="editorial-topics" aria-label="Filter articles">{topics.map(t=><button key={t} className={topic===t?"active":""} onClick={()=>setTopic(t)}>{t}</button>)}</div>
   <div className="editorial-actions"><label className="editorial-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={isTransfer?"Search player, club or transfer…":"Search sports headlines…"}/></label><button className="round" onClick={()=>void load()} aria-label="Refresh feed"><RefreshCw size={16}/></button></div>
  </div>
  {isTransfer&&<p className="editorial-note">Reports are attributed to their publishers. Rumours are not confirmed transfers unless an official club or league announcement confirms the deal.</p>}
  {loading?<div className="empty">Loading {isTransfer?"transfer reports":"sports headlines"}…</div>
   :visible.length?<div className="editorial-feed">{visible.map((item,i)=><article className="editorial-story" key={item.url||i}><div className="editorial-story-main"><span className="editorial-source">{item.source}</span><h2>{item.title}</h2><time>{item.publishedAt?new Date(item.publishedAt).toLocaleString():"Latest update"}</time></div><a href={item.url} target="_blank" rel="noopener noreferrer">Read at source <ArrowUpRight size={15}/></a></article>)}</div>
   :<div className="empty">{error||(query?"No articles match your search.":"No articles are available for this filter right now.")}</div>}
  {error&&visible.length>0&&<p className="editorial-note">{error}</p>}
  <p className="editorial-foot">Headlines are displayed with publisher attribution. Full reporting opens on the original publisher's website. G.O.A.T. VIEWS does not republish full articles.</p>
  </section><footer>© 2026 G.O.A.T. VIEWS <span>Global sports. One view.</span></footer>
 </main>;
}
