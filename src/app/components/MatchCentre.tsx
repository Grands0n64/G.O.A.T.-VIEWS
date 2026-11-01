"use client";

import { useEffect, useMemo, useState } from "react";

type Props = { id: string; league: string; home: string; away: string; onClose: () => void };
type AnyRecord = Record<string, any>;
type Tab = "Overview" | "Statistics" | "Lineups" | "Commentary";

const text = (v: any, fallback = "—"): string => {
  if (v === null || v === undefined || v === "") return fallback;
  if (typeof v === "string" || typeof v === "number") return String(v);
  return v.displayName ?? v.fullName ?? v.name ?? fallback;
};
const nice = (v: any): string => String(v ?? "").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").replace(/^./, c => c.toUpperCase());
const team = (v: any, fallback: string) => text(v?.team ?? v, fallback);

function TeamStats({ teams }: { teams: any[] }) {
  if (!Array.isArray(teams) || teams.length < 2) return <p className="mc-empty">Match statistics are not available for this fixture.</p>;
  const left = teams[0], right = teams[1];
  const a = Array.isArray(left.statistics) ? left.statistics : [];
  const b = Array.isArray(right.statistics) ? right.statistics : [];
  const rows = a.map((s: any) => {
    const other = b.find((x: any) => x.name === s.name || x.abbreviation === s.abbreviation);
    return { name: nice(s.label ?? s.name ?? s.abbreviation), a: text(s.displayValue ?? s.value), b: text(other?.displayValue ?? other?.value) };
  });
  if (!rows.length) return <p className="mc-empty">Match statistics are not available for this fixture.</p>;
  return <div className="mc-stats">{rows.map((r: any, i: number) => <div className="mc-stat" key={r.name + i}><b>{r.a}</b><span>{r.name}</span><b>{r.b}</b></div>)}</div>;
}
function Timeline({ plays }: { plays: any }) {
  const items = Array.isArray(plays) ? plays : Array.isArray(plays?.items) ? plays.items : [];
  if (!items.length) return <p className="mc-empty">No event timeline has been published for this match.</p>;
  return <div className="mc-timeline">{items.map((p: any, i: number) => {
    const description = p.text ?? p.description ?? p.type?.text ?? p.type?.name;
    if (!description) return null;
    return <div className="mc-event" key={p.id ?? i}><time>{p.clock?.displayValue ?? p.time ?? p.period?.displayValue ?? "•"}</time><i/><p>{description}</p></div>;
  })}</div>;
}
function Lineups({ rosters }: { rosters: any }) {
  const groups = Array.isArray(rosters) ? rosters : Array.isArray(rosters?.teams) ? rosters.teams : [];
  const teams = groups.map((g: any) => ({ name: team(g, "Team"), players: Array.isArray(g.roster) ? g.roster : Array.isArray(g.athletes) ? g.athletes : [] })).filter((g: any) => g.players.length);
  if (!teams.length) return <p className="mc-empty">Lineups have not been published for this match.</p>;
  return <div className="mc-lineups">{teams.map((g: any, i: number) => <section key={g.name + i}><h4>{g.name}</h4>{g.players.map((p: any, j: number) => <div className="mc-player" key={p.athlete?.id ?? p.id ?? j}><span>{text(p.athlete ?? p)}</span><small>{text(p.position?.abbreviation ?? p.position?.displayName ?? p.position ?? p.jersey, "")}</small></div>)}</section>)}</div>;
}
function Commentary({ data }: { data: any }) {
  const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  if (!items.length) return <p className="mc-empty">Commentary is not available for this match.</p>;
  return <div className="mc-commentary">{items.map((x: any, i: number) => <article key={x.id ?? i}><time>{x.time ?? x.clock?.displayValue ?? ""}</time><p>{x.text ?? x.description ?? x.headline ?? ""}</p></article>)}</div>;
}
function PlayerStats({ groups }: { groups: any[] }) {
  const blocks = (Array.isArray(groups) ? groups : []).flatMap((g: any) => (Array.isArray(g.statistics) ? g.statistics : []).filter((c: any) => Array.isArray(c.athletes) && c.athletes.length).map((c: any) => ({ team: team(g, "Team"), title: nice(c.name ?? c.displayName ?? "Players"), keys: c.labels ?? c.keys ?? [], athletes: c.athletes })));
  if (!blocks.length) return <p className="mc-empty">Individual player statistics are not available for this match.</p>;
  return <>{blocks.map((b: any, i: number) => <section className="mc-playerstats" key={b.team + b.title + i}><h4>{b.team} · {b.title}</h4><div className="mc-table-scroll"><table><thead><tr><th>Player</th>{b.keys.map((k: any, j: number) => <th key={j}>{nice(k)}</th>)}</tr></thead><tbody>{b.athletes.map((a: any, j: number) => <tr key={a.athlete?.id ?? j}><td>{text(a.athlete)}</td>{(a.stats ?? []).map((s: any, k: number) => <td key={k}>{text(s)}</td>)}</tr>)}</tbody></table></div></section>)}</>;
}

export default function MatchCentre({ id, league, home, away, onClose }: Props) {
  const [data, setData] = useState<AnyRecord | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [tab, setTab] = useState<Tab>("Overview");
  useEffect(() => {
    let active = true;
    setBusy(true); setError(""); setData(null); setTab("Overview");
    fetch("/api/match?league=" + encodeURIComponent(league) + "&id=" + encodeURIComponent(id), { cache: "no-store" })
      .then(async r => { const value = await r.json(); if (!r.ok) throw new Error(value.error ?? "Match information is unavailable."); return value; })
      .then(value => { if (active) setData(value); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : "Match information is unavailable."); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [id, league]);
  const competition = data?.header?.competitions?.[0] ?? {};
  const competitors = competition.competitors ?? [];
  const homeTeam = competitors.find((x: any) => x.homeAway === "home") ?? competitors[0];
  const awayTeam = competitors.find((x: any) => x.homeAway === "away") ?? competitors[1];
  const status = competition.status?.type?.shortDetail ?? competition.status?.type?.detail ?? data?.header?.season?.name ?? "Match details";
  const homeScore = homeTeam?.score ?? "—", awayScore = awayTeam?.score ?? "—";
  const venue = competition.venue?.fullName ?? competition.venue?.address?.city ?? "";
  const teams = data?.boxscore?.teams ?? [];
  const players = data?.boxscore?.players ?? [];
  const tabs: Tab[] = ["Overview", "Statistics", "Lineups", "Commentary"];
  return <div className="mc-backdrop" onClick={onClose}><section className="mc-modal" role="dialog" aria-modal="true" aria-label="Match centre" onClick={e => e.stopPropagation()}>
    <div className="mc-topbar"><span>G.O.A.T. <b>VIEWS</b> <i>/</i> MATCH CENTRE</span><button onClick={onClose} aria-label="Close match details">✕</button></div>
    <div className="mc-hero"><div className="mc-league">{league}</div><div className="mc-scoreboard">
      <div className="mc-side"><span className="mc-crest">{(homeTeam?.team?.displayName ?? home)[0]}</span><b>{homeTeam?.team?.displayName ?? home}</b></div>
      <div className="mc-score"><strong>{homeScore}</strong><span>:</span><strong>{awayScore}</strong><small>{status}</small></div>
      <div className="mc-side mc-away"><span className="mc-crest">{(awayTeam?.team?.displayName ?? away)[0]}</span><b>{awayTeam?.team?.displayName ?? away}</b></div>
    </div>{venue && <div className="mc-venue">⌖ {venue}</div>}</div>
    <nav className="mc-tabs" aria-label="Match sections">{tabs.map(t => <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t}</button>)}</nav>
    <div className="mc-content">{busy ? <p className="mc-empty">Loading match centre…</p> : error ? <p className="mc-empty">{error}</p> : <>
      {tab === "Overview" && <><section className="mc-section"><h3>Match timeline</h3><Timeline plays={data?.plays}/></section><section className="mc-section"><h3>Match statistics</h3><TeamStats teams={teams}/></section></>}
      {tab === "Statistics" && <><section className="mc-section"><h3>Team statistics</h3><TeamStats teams={teams}/></section><section className="mc-section"><h3>Player statistics</h3><PlayerStats groups={players}/></section></>}
      {tab === "Lineups" && <section className="mc-section"><h3>Starting lineups</h3><Lineups rosters={data?.rosters}/></section>}
      {tab === "Commentary" && <section className="mc-section"><h3>Live commentary</h3><Commentary data={data?.commentary}/></section>}
    </>}</div>
  </section></div>;
}
