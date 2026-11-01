"use client";
import { useEffect, useState } from "react";
import { LEAGUES } from "../leagues";

// football leagues grouped by country, everything else under "Other sports"
const groups: { label: string; leagues: string[] }[] = (() => {
  const map = new Map<string, string[]>();
  for (const item of LEAGUES) {
    const key = item.sport === "Football" ? item.country : "Other sports";
    map.set(key, [...(map.get(key) ?? []), item.league]);
  }
  return Array.from(map, ([label, leagues]) => ({ label, leagues }));
})();

export default function CompetitionStandings() {
  const [league, setLeague] = useState("Premier League"), [data, setData] = useState<any>(null), [error, setError] = useState(""), [loading, setLoading] = useState(false);
  useEffect(() => {
    let live = true;
    setLoading(true); setError("");
    fetch("/api/standings?league=" + encodeURIComponent(league), { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (live) { setData(d); setError(d.error ?? ""); } })
      .catch(() => live && setError("Standings unavailable."))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [league]);
  const blocks = data?.children?.length ? data.children : [{ name: league, standings: data?.standings }];
  const tables = blocks.flatMap((group: any) => group.standings?.entries?.length ? [{ name: group.name, entries: group.standings.entries }] : []);
  const gd = (value: any) => (typeof value === "number" && value > 0 ? "+" + value : value ?? "—");
  return <section className="panel standings">
    <div className="sectiontitle">
      <div><h2>League tables & standings</h2><p>Competition rankings</p></div>
      <select value={league} onChange={(e) => setLeague(e.target.value)}>
        {groups.map((group) => <optgroup key={group.label} label={group.label}>{group.leagues.map((name) => <option key={name} value={name}>{name}</option>)}</optgroup>)}
      </select>
    </div>
    {loading ? <p>Loading table…</p> : error ? <p>{error}</p> : tables.length ? tables.map((table: any) => <div key={table.name}>
      <h3>{table.name}</h3>
      <div className="tablewrap"><table>
        <thead><tr><th>#</th><th>Team</th><th>GP</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead>
        <tbody>{table.entries.map((entry: any, i: number) => {
          const stats = Object.fromEntries((entry.stats ?? []).map((s: any) => [s.name, s.value]));
          return <tr key={entry.team?.id ?? i}>
            <td>{stats.rank ?? i + 1}</td>
            <td>{entry.team?.displayName ?? entry.team?.name ?? "—"}</td>
            <td>{stats.gamesPlayed ?? stats.games ?? "—"}</td>
            <td>{stats.wins ?? "—"}</td>
            <td>{stats.ties ?? stats.draws ?? "—"}</td>
            <td>{stats.losses ?? "—"}</td>
            <td>{gd(stats.pointDifferential)}</td>
            <td>{stats.points ?? "—"}</td>
          </tr>;
        })}</tbody>
      </table></div>
    </div>) : <p>No published table for this competition. Cups and some tournaments have no league table.</p>}
  </section>;
}
