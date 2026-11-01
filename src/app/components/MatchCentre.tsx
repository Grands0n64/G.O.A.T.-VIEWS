"use client";

import { useEffect, useMemo, useState } from "react";

type Props = { id: string; league: string; home: string; away: string; homeScore: number | null; awayScore: number | null; status: string; venue: string | null; onClose: () => void };
type RecordValue = Record<string, any>;
type Tab = "Overview" | "Statistics" | "Lineups" | "Commentary" | "Team form";

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.events)) return value.events;
  if (Array.isArray(value?.athletes)) return value.athletes;
  return [];
}
function safeText(value: any, fallback = "—"): string {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((x) => safeText(x, "")).filter(Boolean).join(", ") || fallback;
  if (typeof value === "object") {
    for (const key of ["displayValue", "value", "displayName", "fullName", "name", "abbreviation", "shortName", "text"]) {
      if (value[key] !== undefined && value[key] !== value) return safeText(value[key], fallback);
    }
  }
  return fallback;
}
function label(value: any): string {
  return safeText(value, "").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").replace(/^./, (c) => c.toUpperCase());
}
function teamName(value: any, fallback: string) {
  return safeText(value?.team?.displayName ?? value?.team?.name ?? value?.displayName ?? value?.name ?? value, fallback);
}
function formatDate(value: any) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
function eventLabel(event: any) {
  const raw = safeText(event.type?.text ?? event.type?.name ?? event.type ?? event.shortText ?? event.text ?? event.description, "Match event");
  return raw;
}
function eventMinute(event: any) {
  return safeText(event.clock?.displayValue ?? event.time?.displayValue ?? event.time ?? event.period?.displayValue ?? event.minute, "");
}
function collectStats(teams: any[], competitors: any[]) {
  const source = teams.length ? teams : competitors;
  if (source.length < 2) return [];
  const left = source[0], right = source[1];
  const leftStats = asArray(left.statistics ?? left.stats);
  const rightStats = asArray(right.statistics ?? right.stats);
  return leftStats.map((item: any) => {
    const key = item.name ?? item.abbreviation ?? item.label;
    const other = rightStats.find((candidate: any) => (candidate.name ?? candidate.abbreviation ?? candidate.label) === key);
    return {
      name: label(item.label ?? item.name ?? item.abbreviation),
      home: safeText(item.displayValue ?? item.value ?? item),
      away: safeText(other?.displayValue ?? other?.value ?? other, "—")
    };
  }).filter((item: any) => item.name && item.name !== "—");
}
function TeamStatistics({ rows }: { rows: any[] }) {
  if (!rows.length) return <p className="mc-empty">Team statistics have not been supplied for this fixture.</p>;
  return <div className="mc-stats">{rows.map((row, index) => <div className="mc-stat" key={row.name + index}><b>{row.home}</b><span>{row.name}</span><b>{row.away}</b></div>)}</div>;
}
function Timeline({ events }: { events: any[] }) {
  const sorted = [...events].sort((a, b) => {
    const minute = (event: any) => Number.parseInt(eventMinute(event).replace(/[^0-9]/g, ""), 10) || 0;
    return minute(a) - minute(b);
  });
  if (!sorted.length) return <p className="mc-empty">No verified goal, card or substitution events were supplied for this match.</p>;
  return <div className="mc-timeline">{sorted.map((event, index) => {
    const description = safeText(event.text ?? event.description ?? event.shortText ?? eventLabel(event), "");
    const detail = safeText(event.participants ?? event.athletes ?? event.player, "");
    return <article className="mc-event" key={event.id ?? index}><time>{eventMinute(event) || "—"}</time><i/><div><b>{eventLabel(event)}</b><p>{description}</p>{detail !== "—" && <small>{detail}</small>}</div></article>;
  })}</div>;
}
function Lineups({ rosters, competitors }: { rosters: any; competitors: any[] }) {
  const raw = asArray(rosters?.teams ?? rosters);
  const groups = raw.length ? raw : competitors.map((competitor: any) => ({ team: competitor.team, roster: competitor.roster ?? competitor.athletes ?? [] }));
  const sides = groups.map((group: any) => ({
    name: teamName(group, "Team"),
    players: asArray(group.roster ?? group.athletes ?? group.players)
  })).filter((group: any) => group.players.length);
  if (!sides.length) return <p className="mc-empty">Starting lineups and substitutes have not been supplied for this match.</p>;
  return <div className="mc-lineups">{sides.map((side: any, index: number) => <section key={side.name + index}><h4>{side.name}</h4>{side.players.map((player: any, playerIndex: number) => <div className="mc-player" key={player.athlete?.id ?? player.id ?? playerIndex}><span>{safeText(player.athlete ?? player, "Player")}</span><small>{safeText(player.position?.abbreviation ?? player.position?.displayName ?? player.position ?? player.jersey, "")}</small></div>)}</section>)}</div>;
}
function PlayerStatistics({ groups }: { groups: any[] }) {
  const blocks = groups.flatMap((group: any) => asArray(group.statistics).map((category: any) => ({
    team: teamName(group, "Team"),
    title: label(category.name ?? category.displayName ?? "Player statistics"),
    labels: asArray(category.labels ?? category.keys),
    athletes: asArray(category.athletes)
  })).filter((category: any) => category.athletes.length));
  if (!blocks.length) return <p className="mc-empty">Individual player statistics and ratings are not available for this match.</p>;
  return <>{blocks.map((block: any, index: number) => <section className="mc-playerstats" key={block.team + index}><h4>{block.team} · {block.title}</h4><div className="mc-table-scroll"><table><thead><tr><th>Player</th>{block.labels.map((name: any, i: number) => <th key={i}>{label(name)}</th>)}</tr></thead><tbody>{block.athletes.map((athlete: any, i: number) => <tr key={athlete.athlete?.id ?? i}><td>{safeText(athlete.athlete ?? athlete, "Player")}</td>{asArray(athlete.stats).map((stat: any, j: number) => <td key={j}>{safeText(stat)}</td>)}</tr>)}</tbody></table></div></section>)}</>;
}
function TeamForm({ schedules, teams }: { schedules: any[]; teams: any[] }) {
  if (!schedules.length) return <p className="mc-empty">Recent results and upcoming fixtures are not available from the competition feed.</p>;
  return <div className="mc-lineups">{schedules.map((schedule: any, index: number) => {
    const name = teamName(teams[index], "Team");
    return <section key={schedule.teamId || index}><h4>{name}</h4><b className="mc-form-heading">Recent results</b>{(schedule.recent ?? []).map((match: any) => <div className="mc-player" key={match.id}><span>{match.home} {match.homeScore ?? "—"} – {match.awayScore ?? "—"} {match.away}</span><small>{formatDate(match.date)}</small></div>)}{!(schedule.recent ?? []).length && <p className="mc-muted">No recent results supplied.</p>}<b className="mc-form-heading">Upcoming fixtures</b>{(schedule.upcoming ?? []).map((match: any) => <div className="mc-player" key={match.id}><span>{match.home} v {match.away}</span><small>{formatDate(match.date)}</small></div>)}{!(schedule.upcoming ?? []).length && <p className="mc-muted">No upcoming fixtures supplied.</p>}</section>;
  })}</div>;
}

export default function MatchCentre({ id, league, home, away, homeScore: initialHomeScore, awayScore: initialAwayScore, status: initialStatus, venue: initialVenue, onClose }: Props) {
  const [data, setData] = useState<RecordValue | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [tab, setTab] = useState<Tab>("Overview");
  useEffect(() => {
    let active = true;
    setBusy(true); setError(""); setData(null); setTab("Overview");
    fetch("/api/match?league=" + encodeURIComponent(league) + "&id=" + encodeURIComponent(id), { cache: "no-store" })
      .then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Match information is unavailable."); return payload; })
      .then((payload) => { if (active) setData(payload); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Match information is unavailable."); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [id, league]);

  const competition = data?.header?.competitions?.[0] ?? {};
  const competitors = Array.isArray(competition.competitors) ? competition.competitors : [];
  const homeTeam = competitors.find((item: any) => item.homeAway === "home") ?? competitors[0];
  const awayTeam = competitors.find((item: any) => item.homeAway === "away") ?? competitors[1];
  const homeName = teamName(homeTeam, home);
  const awayName = teamName(awayTeam, away);
  const status = safeText(competition.status?.type?.shortDetail ?? competition.status?.type?.detail ?? competition.status?.type?.description, initialStatus || "Match details");
  const homeScore = safeText(homeTeam?.score, initialHomeScore === null ? "—" : String(initialHomeScore));
  const awayScore = safeText(awayTeam?.score, initialAwayScore === null ? "—" : String(initialAwayScore));
  const venue = safeText(competition.venue?.fullName ?? competition.venue?.address?.city, initialVenue || "");
  const teams = asArray(data?.boxscore?.teams);
  const playerGroups = asArray(data?.boxscore?.players);
  const statRows = useMemo(() => collectStats(teams, competitors), [data]);
  const events = useMemo(() => {
    const combined = [...asArray(data?.plays), ...asArray(data?.keyEvents), ...asArray(data?.commentary)];
    const seen = new Set<string>();
    return combined.filter((event: any) => {
      const key = String(event.id ?? event.text ?? event.description ?? "");
      if (!key || seen.has(key)) return false;
      seen.add(key); return true;
    });
  }, [data]);
  const tabs: Tab[] = ["Overview", "Statistics", "Lineups", "Commentary", "Team form"];
  const numericHome = Number(homeScore), numericAway = Number(awayScore);
  const isFinal = competition.status?.type?.completed === true || /final|full time|\bft\b/i.test(status);
  const result = isFinal && Number.isFinite(numericHome) && Number.isFinite(numericAway)
    ? numericHome === numericAway ? "The match finished level." : `${numericHome > numericAway ? homeName : awayName} won the match.`
    : "Match information and verified events are shown below as the provider supplies them.";
  const teamSchedules = asArray(data?.teamSchedules);

  return <div className="mc-backdrop" onClick={onClose}><main className="mc-modal mc-fullpage" role="main" aria-label="Match details" onClick={(event) => event.stopPropagation()}>
    <div className="mc-topbar"><span>G.O.A.T. <b>VIEWS</b> <i>/</i> {league.toUpperCase()} / MATCH DETAILS</span><button onClick={onClose} aria-label="Back to scores">← Back</button></div>
    <div className="mc-page-layout">
      <div className="mc-primary">
        <header className="mc-hero"><div className="mc-league">{league} {competition?.date ? "· " + formatDate(competition.date) : ""}</div><div className="mc-scoreboard">
          <div className="mc-side"><span className="mc-crest">{homeName.slice(0, 3)}</span><b>{homeName}</b></div>
          <div className="mc-score"><strong>{homeScore}</strong><span>:</span><strong>{awayScore}</strong><small>{status}</small></div>
          <div className="mc-side mc-away"><span className="mc-crest">{awayName.slice(0, 3)}</span><b>{awayName}</b></div>
        </div><div className="mc-venue">{[venue, competition?.venue?.address?.city].filter(Boolean).join(" · ")}</div></header>
        <nav className="mc-tabs" aria-label="Match sections">{tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</nav>
        <div className="mc-content">
          {busy && <p className="mc-loading">Loading verified match information…</p>}
          {error && <p className="mc-empty">{error} The scoreboard information is retained above.</p>}
          {tab === "Overview" && <><section className="mc-section"><h3>Match summary</h3><p className="mc-analysis">{result}</p><div className="mc-info-grid"><div><small>Competition</small><b>{league}</b></div><div><small>Match status</small><b>{status}</b></div><div><small>Venue</small><b>{venue || "Not supplied"}</b></div><div><small>Referee</small><b>{safeText(competition?.officials?.[0]?.fullName, "Not supplied")}</b></div></div></section><section className="mc-section"><h3>Match timeline</h3><Timeline events={events}/></section><section className="mc-section"><h3>Team statistics</h3><TeamStatistics rows={statRows}/></section></>}
          {tab === "Statistics" && <><section className="mc-section"><h3>Team statistics</h3><TeamStatistics rows={statRows}/></section><section className="mc-section"><h3>Player statistics & ratings</h3><PlayerStatistics groups={playerGroups}/></section></>}
          {tab === "Lineups" && <section className="mc-section"><h3>Starting lineups & substitutes</h3><Lineups rosters={data?.rosters} competitors={competitors}/></section>}
          {tab === "Commentary" && <section className="mc-section"><h3>Match commentary & incidents</h3><Timeline events={events}/></section>}
          {tab === "Team form" && <section className="mc-section"><h3>Previous results & upcoming fixtures</h3><TeamForm schedules={teamSchedules} teams={[homeTeam, awayTeam]}/></section>}
        </div>
      </div>
      <aside className="mc-aside"><section className="mc-aside-card"><h3>Match information</h3><div><small>Competition</small><b>{league}</b></div><div><small>Kick-off</small><b>{formatDate(competition?.date ?? data?.header?.competitions?.[0]?.date)}</b></div><div><small>Venue</small><b>{venue || "Not supplied"}</b></div><div><small>Attendance</small><b>{safeText(competition?.attendance, "Not supplied")}</b></div></section><section className="mc-aside-card"><h3>Match coverage</h3><p>Statistics, lineups, commentary and incidents appear when verified match data is available. Unpublished information is labelled rather than invented.</p></section></aside>
    </div>
  </main></div>;
}
