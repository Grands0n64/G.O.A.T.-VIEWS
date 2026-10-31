"use client";
import {useEffect,useState} from "react";
type Props={id:string;league:string;home:string;away:string;onClose:()=>void};
export default function MatchCentre({id,league,home,away,onClose}:Props){
 const [data,setData]=useState<any>(null),[error,setError]=useState(""),[busy,setBusy]=useState(true);
 useEffect(()=>{let active=true;fetch("/api/match?league="+encodeURIComponent(league)+"&id="+encodeURIComponent(id),{cache:"no-store"}).then(r=>r.json()).then(d=>{if(active){setData(d);setError(d.error??"");}}).catch(()=>active&&setError("Match information is unavailable.")).finally(()=>active&&setBusy(false));return()=>{active=false}},[id,league]);
 const sections=[["Match statistics",data?.boxscore?.players],["Team statistics",data?.boxscore?.teams],["Player leaders",data?.leaders],["Lineups",data?.rosters],["Match timeline",data?.plays?.items??data?.plays],["Commentary",data?.commentary?.items??data?.commentary]];
 return <div className="modalback" onClick={onClose}><section className="matchmodal" onClick={e=>e.stopPropagation()}><button className="modalclose" onClick={onClose}>✕</button><p className="kicker">MATCH CENTRE</p><h2>{home} <span>vs</span> {away}</h2>{busy?<p>Loading match information…</p>:error?<p className="empty">{error}</p>:sections.map(([title,value])=><div className="detailsection" key={String(title)}><h3>{title}</h3>{value?<pre>{JSON.stringify(value,null,2)}</pre>:<p>Not provided for this match.</p>}</div>)}</section></div>
}