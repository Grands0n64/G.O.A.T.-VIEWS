"use client";

import { useEffect, useState } from "react";

type Props = { id: string; league: string; home: string; away: string; onClose: () => void };
type AnyRecord = Record<string, any>;

function label(value: unknown): string {
  return String(value ?? "").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").replace(/^./, c => c.toUpperCase());
}
function display(value: any): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value.displayName) return value.displayName;
  if (value.fullName) return value.fullName;
  if (value.name) return value.name;
  return "—";
}
function teamName(team: any, fallback: string): string {
  return team?.team?.displayName ?? team?.team?.name ?? team?.displayName ?? team?.name ?? fallback;
}
function StatTable({ rows, left, right }: { rows: { name: string; a: string; b: string }[]; left: string; right: string }) {
  if (!rows.length) return <p className="match-empty">Statistics have not been supplied for this match.</p>;
  return <div className="match-table-wrap"><table className="match-table"><thead><tr><th>{left}</th><th>Statistic</th><th>{right}</th></tr></thead><tbody>{rows.map((r, i) => <tr key={r.name + i}><td>{r.a}</td><th>{r.name}</th><td>{r.b}</td></tr>)}</tbody></table></div>;
}
function TeamStats({ teams }: { teams: any[] }) {
  if (!Array.isArray(teams) || teams.length < 2) return <p className="match-empty">Team statistics have not been supplied for this match.</p>;
  const first = teams[0], second = teams[1];
  const get = (entry: any) => Array.isArray(entry?.statistics) ? entry.statistics : [];
  const a = get(first), b = get(second);
  const rows = a.map((stat: any) => {
    const other = b.find((item: any) => item.name === stat.name || item.abbreviation === stat.abbreviation);
    return { name: label(stat.label ?? stat.name ?? stat.abbreviation), a: display(stat.displayValue ?? stat.value), b: display(other?.displayValue ?? other?.value) };
  });
  return <StatTable rows={rows} left={teamName(first, "Home")} right={teamName(second, "Away")} />;
}
function PlayerStats({ groups }: { groups: any[] }) {
  const blocks: any[] = [];
  for (const group of Array.isArray(groups) ? groups : []) {
    const team = teamName(group, "Team");
    for (const category of Array.isArray(group?.statistics) ? group.statistics : []) {
      const athletes = Array.isArray(category?.athletes) ? category.athletes : [];
      if (athletes.length) blocks.push({ team, category: label(category.name ?? category.displayName ?? "Player statistics"), keys: category.labels ?? category.keys ?? [], athletes });
    }
  }
  if (!blocks.length) return <p className="match-empty">Individual player statistics have not been supplied for this match.</p>;
  return <>{blocks.map((block, index) => <div className="match-subsection" key={block.team + block.category + index}><h4>{block.team} · {block.category}</h4><div className="match-table-wrap"><table className="match-table"><thead><tr><th>Player</th>{block.keys.map((key: any, i: number) => <th key={i}>{label(key)}</th>)}</tr></thead><tbody>{block.athletes.map((entry: any, i: number) => <tr key={entry.athlete?.id ?? i}><td>{display(entry.athlete)}</td>{(entry.stats ?? []).map((stat: any, j: number) => <td key={j}>{display(stat)}</td>)}</tr>)}</tbody></table></div></div>)}</>;
}
function Lineups({ rosters }: { rosters: any }) {
  const groups = Array.isArray(rosters) ? rosters : Array.isArray(rosters?.teams) ? rosters.teams : [];
  const blocks = groups.map((group: any) => {
    const entries = Array.isArray(group?.roster) ? group.roster : Array.isArray(group?.athletes) ? group.athletes : [];
    return { name: teamName(group, "Team"), entries };
  }).filter((group: any) => group.entries.length);
  if (!blocks.length) return <p className="match-empty">Lineups have not been supplied for this match.</p>;
  return <div className="match-lineups">{blocks.map((group: any, i: number) => <div key={group.name + i}><h4>{group.name}</h4>{group.entries.map((entry: any, j: number) => <div className="match-player" key={entry.athlete?.id ?? entry.id ?? j}><span>{display(entry.athlete ?? entry)}</span><small>{display(entry.position?.abbreviation ?? entry.position?.displayName ?? entry.position ?? entry.jersey)}</small></div>)}</div>)}</div>;
}
function Timeline({ plays }: { plays: any }) {
  const items = Array.isArray(plays) ? plays : Array.isArray(plays?.items) ? plays.items : [];
  if (!items.length) return <p className="match-empty">A match timeline has not been supplied.</p>;
  return <div className="match-timeline">{items.map((play: any, i: number) => {
    const clock = play.clock?.displayValue ?? play.time ?? play.period?.displayValue ?? "";
    const text = play.text ?? play.description ?? play.type?.text ?? play.type?.name ?? "";
    if (!text) return null;
    return <div className="match-event" key={play.id ?? i}><time>{clock || "—"}</time><span>{text}</span></div>;
  })}</div>;
}
function Commentary({ commentary }: { commentary: any }) {
  const items = Array.isArray(commentary) ? commentary : Array.isArray(commentary?.items) ? commentary.items : [];
  if (!items.length) return <p className="match-empty">Live commentary is not available for this match.</p>;
  return <div className="match-commentary">{items.map((item: any, i: number) => <article key={item.id ?? i}><small>{item.time ?? item.clock?.displayValue ?? item.date ?? ""}</small><p>{item.text ?? item.description ?? item.headline ?? ""}</p></article>)}</div>;
}
function Leaders({ leaders }: { leaders: any }) {
  const groups = Array.isArray(leaders) ? leaders : [];
  const entries = groups.flatMap((group: any) => (group.leaders ?? []).map((item: any) => ({ category: group.displayName ?? group.name ?? "Leader", athlete: item.athlete, value: item.displayValue ?? item.value ?? item.statistics?.[0]?.displayValue })));
  if (!entries.length) return <p className="match-empty">Player leaders have not been supplied for this match.</p>;
  return <div className="match-table-wrap"><table className="match-table"><thead><tr><th>Category</th><th>Player</th><th>Value</th></tr></thead><tbody>{entries.map((entry: any, i: number) => <tr key={i}><td>{label(entry.category)}</td><td>{display(entry.athlete)}</td><td>{display(entry.value)}</td></tr>)}</tbody></table></div>;
}

export default function MatchCentre({ id, league, home, away, onClose }: Props) {
  const [data, setData] = useState<AnyRecord | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    let active = true;
    setBusy(true); setError(""); setData(null);
    fetch("/api/match?league=" + encodeURIComponent(league) + "&id=" + encodeURIComponent(id), { cache: "no-store" })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Match information is unavailable.");
        return result;
      })
      .then(result => { if (active) setData(result); })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Match information is unavailable."); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [id, league]);
  const teams = data?.boxscore?.teams ?? [];
  const players = data?.boxscore?.players ?? [];
  return <div className="modalback" onClick={onClose}><section className="matchmodal" onClick={event => event.stopPropagation()}>
    <button className="modalclose" onClick={onClose}>Close ✕</button>
    <p className="kicker">MATCH CENTRE</p><h2>{home} <span>vs</span> {away}</h2>
    {busy ? <p>Loading match information…</p> : error ? <p className="match-empty">{error}</p> : <>
      <section className="detailsection"><h3>Team statistics</h3><TeamStats teams={teams}/></section>
      <section className="detailsection"><h3>Player statistics</h3><PlayerStats groups={players}/></section>
      <section className="detailsection"><h3>Player leaders</h3><Leaders leaders={data?.leaders}/></section>
      <section className="detailsection"><h3>Lineups</h3><Lineups rosters={data?.rosters}/></section>
      <section className="detailsection"><h3>Match timeline</h3><Timeline plays={data?.plays}/></section>
      <section className="detailsection"><h3>Commentary</h3><Commentary commentary={data?.commentary}/></section>
    </>}
  </section></div>;
}
