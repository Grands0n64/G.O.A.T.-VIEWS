"use client";

import { useEffect, useMemo, useState } from "react";

type Props = { id: string; league: string; home: string; away: string; homeScore: number | null; awayScore: number | null; status: string; venue: string | null; onClose: () => void };
type RecordValue = Record<string, any>;
type Tab = "Overview" | "Statistics" | "Lineups" | "Commentary" | "Team form";
type KitColors = { shirt: string; trim: string; text: string };

const REFRESH_MS = 20000;

/* Force the exact kit for a team (lowercase team name). Example:
   "chelsea": { shirt: "#034694", trim: "#ffffff" },
   "manchester united": { shirt: "#da291c", trim: "#ffffff" }, */
const KIT_OVERRIDES: Record<string, { shirt: string; trim: string }> = {};

/* ---------- helpers ---------- */
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
function num(value: any): number {
  const n = Number.parseFloat(safeText(value, "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
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
  return safeText(event.type?.text ?? event.type?.name ?? event.type ?? event.shortText ?? event.text ?? event.description, "Match event");
}
function eventMinute(event: any) {
  return safeText(event.clock?.displayValue ?? event.time?.displayValue ?? event.time ?? event.period?.displayValue ?? event.minute, "");
}
// "45'+2'" -> 45.02, "67'" -> 67
function minuteValue(event: any) {
  const m = eventMinute(event).match(/(\d+)(?:\D*\+\s*(\d+))?/);
  if (!m) return 0;
  return Number(m[1]) + (m[2] ? Number(m[2]) / 100 : 0);
}
function eventKind(event: any): "goal" | "yellow" | "red" | "sub" | "other" {
  const t = (eventLabel(event) + " " + safeText(event.text, "")).toLowerCase();
  if (/yellow/.test(t)) return "yellow";
  if (/red card|straight red|second yellow/.test(t)) return "red";
  if (/substitution/.test(t)) return "sub";
  if (/goal|scored|penalty - scored/.test(t) && !/no goal|disallowed|saved|missed/.test(t)) return "goal";
  return "other";
}
const ICON: Record<string, string> = { goal: "⚽", yellow: "🟨", red: "🟥", sub: "🔁", other: "•" };

/* ---------- kit colours ---------- */
function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function colourDistance(a: string, b: string) {
  const x = hexToRgb(a), y = hexToRgb(b);
  if (!x || !y) return 999;
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}
function readableOn(hex: string) {
  const c = hexToRgb(hex);
  if (!c) return "#ffffff";
  return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2] > 150 ? "#111111" : "#ffffff";
}
function withHash(value: any) {
  const s = safeText(value, "").replace("#", "");
  return /^[0-9a-f]{6}$/i.test(s) ? "#" + s : "";
}
function buildKits(homeTeam: any, awayTeam: any) {
  const pick = (t: any) => {
    const override = KIT_OVERRIDES[teamName(t, "").toLowerCase()];
    if (override) return { main: override.shirt, alt: override.trim };
    return { main: withHash(t?.team?.color) || "#3a4a56", alt: withHash(t?.team?.alternateColor) || "#ffffff" };
  };
  const h = pick(homeTeam), a = pick(awayTeam);
  let awayShirt = a.main, awayTrim = a.alt;
  if (colourDistance(h.main, a.main) < 90) {
    if (colourDistance(h.main, a.alt) >= 90) { awayShirt = a.alt; awayTrim = a.main; }
    else { awayShirt = readableOn(h.main) === "#ffffff" ? "#f2f2f2" : "#222222"; awayTrim = a.main; }
  }
  const gkOptions = ["#f5c242", "#2ecc71", "#ff7a45", "#8e5cf6", "#e91e63", "#00bcd4"];
  const gkShirt = gkOptions.find((c) => colourDistance(c, h.main) > 110 && colourDistance(c, awayShirt) > 110) ?? "#f5c242";
  const mk = (shirt: string, trim: string): KitColors => ({ shirt, trim, text: readableOn(shirt) });
  return { home: mk(h.main, h.alt), away: mk(awayShirt, awayTrim), gk: mk(gkShirt, "#111111") };
}

/* ---------- live rating (calculated from live player stats) ---------- */
function statMap(player: any): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of asArray(player?.stats)) {
    const key = s?.name ?? s?.abbreviation;
    if (key) out[key] = num(s.value ?? s.displayValue);
  }
  return out;
}
const didSub = (v: any) => v === true || v?.didSub === true;

function playerRating(player: any, started: boolean, s: Record<string, number>): number | null {
  const pick = (...keys: string[]) => { for (const k of keys) if (s[k] !== undefined) return s[k]; return 0; };
  const played = started || didSub(player.subbedIn) || pick("appearances") > 0;
  if (!played) return null;
  const pos = safeText(player.position?.abbreviation, "").toUpperCase();
  const isGK = /^G/.test(pos);
  const isDef = /^(D|CD|LB|RB|SW|WB)/.test(pos);
  let r = 6.0;
  r += pick("totalGoals", "goals") * 1.2;
  r += pick("goalAssists", "assists") * 0.8;
  r += pick("shotsOnTarget") * 0.2;
  r += Math.max(0, pick("totalShots", "shots") - pick("shotsOnTarget")) * 0.05;
  r += pick("saves") * 0.2;
  r += pick("foulsSuffered") * 0.05;
  r -= pick("foulsCommitted") * 0.05;
  r -= pick("offsides") * 0.05;
  r -= pick("yellowCards") * 0.4;
  r -= pick("redCards") * 2;
  r -= pick("ownGoals") * 1;
  if (isGK) r -= pick("goalsConceded") * 0.3;
  else if (isDef) r -= pick("goalsConceded") * 0.1;
  return Math.max(3, Math.min(10, Math.round(r * 10) / 10));
}
const ratingClass = (r: number) => (r >= 7.5 ? "great" : r >= 6.5 ? "good" : r >= 5.5 ? "ok" : "poor");

/* ---------- build lineups from rosters ---------- */
type Side = { homeAway: string; teamId: string; team: string; formation: string; players: any[] };
function buildSides(rosters: any, matchStarted: boolean): Side[] {
  return asArray(rosters).map((group: any, index: number) => ({
    homeAway: group.homeAway ?? (index === 0 ? "home" : "away"),
    teamId: String(group.team?.id ?? ""),
    team: teamName(group, "Team"),
    formation: safeText(group.formation, ""),
    players: asArray(group.roster).map((p: any, i: number) => {
      const stats = statMap(p);
      const starter = p.starter === true;
      return {
        key: String(p.athlete?.id ?? index + "-" + i),
        name: safeText(p.athlete?.shortName ?? p.athlete?.displayName ?? p.athlete?.fullName, "Player"),
        fullName: safeText(p.athlete?.displayName ?? p.athlete?.fullName ?? p.athlete?.shortName, "Player"),
        espnPhoto: p.athlete?.headshot?.href ?? "",
        photoList: [] as string[],
        kit: null as KitColors | null,
        jersey: safeText(p.jersey ?? p.athlete?.jersey, ""),
        pos: safeText(p.position?.abbreviation ?? p.position?.displayName, ""),
        place: num(p.formationPlace),
        starter,
        stats,
        goals: stats.totalGoals ?? stats.goals ?? 0,
        yellow: stats.yellowCards ?? 0,
        red: stats.redCards ?? 0,
        subbedOut: didSub(p.subbedOut),
        subbedIn: didSub(p.subbedIn),
        rating: matchStarted ? playerRating(p, starter, stats) : null
      };
    })
  }));
}
function formationRows(starters: any[], formation: string): any[][] {
  const parts = formation.split("-").map((n) => Number.parseInt(n, 10)).filter((n) => n > 0);
  const sorted = [...starters].sort((a, b) => a.place - b.place);
  if (!parts.length || sorted.some((p) => !p.place) || parts.reduce((a, b) => a + b, 0) !== sorted.length - 1) return [sorted];
  const rows: any[][] = [sorted.slice(0, 1)];
  let i = 1;
  for (const n of parts) { rows.push(sorted.slice(i, i + n)); i += n; }
  return rows;
}

/* ---------- team stats ---------- */
function collectStats(teams: any[], homeId: string) {
  if (teams.length < 2) return [];
  const left = teams.find((t: any) => String(t.team?.id) === homeId) ?? teams[0];
  const right = teams.find((t: any) => t !== left) ?? teams[1];
  const leftStats = asArray(left.statistics ?? left.stats);
  const rightStats = asArray(right.statistics ?? right.stats);
  return leftStats.map((item: any) => {
    const key = item.name ?? item.abbreviation ?? item.label;
    const other = rightStats.find((c: any) => (c.name ?? c.abbreviation ?? c.label) === key);
    const h = safeText(item.displayValue ?? item.value, "—");
    const a = safeText(other?.displayValue ?? other?.value, "—");
    return { name: label(item.label ?? item.name ?? item.abbreviation), home: h, away: a, h: num(h), a: num(a) };
  }).filter((row: any) => row.name && row.home !== "—");
}

/* ---------- small components ---------- */
function initials(name: string) {
  const parts = name.replace(/[^\p{L}\s'-]/gu, "").split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function Avatar({ srcs, name, jersey, size, zoom = 1, fallbackText }: { srcs: string[]; name: string; jersey: string; size: number; zoom?: number; fallbackText?: string }) {
  const list = srcs.filter(Boolean);
  const signature = list.join("|");
  const [index, setIndex] = useState(0);
  useEffect(() => { setIndex(0); }, [signature]);
  if (index >= list.length) {
    return <span className="mc-jersey" style={{ width: size, height: size, fontSize: Math.round(size / 2.6) }}>{fallbackText ?? (jersey || name.slice(0, 1))}</span>;
  }
  return <span style={{ display: "block", width: size, height: size, borderRadius: "50%", overflow: "hidden", border: "2px solid #fff", background: "#2a3944" }}>
    <img
      key={list[index]}
      src={list[index]}
      alt={name}
      loading="lazy"
      onError={() => setIndex((i) => i + 1)}
      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", transform: `scale(${zoom})`, transformOrigin: "50% 18%", display: "block" }}
    />
  </span>;
}

// player face on top of a shirt in the team's colours
function Kit({ p, scale = 1 }: { p: any; scale?: number }) {
  const k: KitColors = p.kit ?? { shirt: "#3a4a56", trim: "#ffffff", text: "#ffffff" };
  const w = 58 * scale, h = 68 * scale, head = 36 * scale;
  return <div style={{ position: "relative", width: w, height: h }}>
    <svg viewBox="0 0 60 52" width={w} height={(w * 52) / 60} style={{ position: "absolute", left: 0, bottom: 0 }} aria-hidden="true">
      <path d="M18 2 L4 10 L9 24 L16 21 L16 50 L44 50 L44 21 L51 24 L56 10 L42 2 Q30 13 18 2 Z" fill={k.shirt} stroke="rgba(0,0,0,.35)" strokeWidth="1" />
      <path d="M4 10 L9 24" stroke={k.trim} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M56 10 L51 24" stroke={k.trim} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M18 2 Q30 13 42 2" fill="none" stroke={k.trim} strokeWidth="2.6" />
      <text x="30" y="40" textAnchor="middle" fontSize="15" fontWeight="800" fill={k.text} fontFamily="Space Grotesk, sans-serif">{p.jersey}</text>
    </svg>
    <div style={{ position: "absolute", left: (w - head) / 2, top: 0 }}>
      <Avatar srcs={p.photoList} name={p.name} jersey={p.jersey} size={head} zoom={1.3} fallbackText={initials(p.fullName)} />
    </div>
  </div>;
}

function StatBars({ rows, limit }: { rows: any[]; limit?: number }) {
  if (!rows.length) return <p className="mc-empty">Team statistics are not published for this match yet.</p>;
  return <div className="mc-bars">{rows.slice(0, limit ?? rows.length).map((row, i) => {
    const total = row.h + row.a;
    const hp = total > 0 ? (row.h / total) * 100 : 50;
    return <div className="mc-bar" key={row.name + i}>
      <div className="mc-bar-head"><b>{row.home}</b><span>{row.name}</span><b>{row.away}</b></div>
      <div className="mc-bar-track"><i className="h" style={{ width: hp + "%" }} /><i className="a" style={{ width: 100 - hp + "%" }} /></div>
    </div>;
  })}</div>;
}

function Timeline({ events, homeId, order = "asc" }: { events: any[]; homeId: string; order?: "asc" | "desc" }) {
  const sorted = [...events].sort((a, b) => (order === "asc" ? 1 : -1) * (minuteValue(a) - minuteValue(b)));
  if (!sorted.length) return <p className="mc-empty">No goals, cards or substitutions have been published for this match yet.</p>;
  return <div className="mc-timeline">{sorted.map((event, index) => {
    const kind = eventKind(event);
    const side = event.team?.id !== undefined ? (String(event.team.id) === homeId ? "home" : "away") : "";
    const detail = safeText(event.participants ?? event.athletes ?? event.player, "");
    return <article className={"mc-event " + side + " " + kind} key={event.id ?? index}>
      <time>{eventMinute(event) || "—"}</time><span className="mc-ico">{ICON[kind]}</span>
      <div><b>{eventLabel(event)}</b><p>{safeText(event.text ?? event.description ?? event.shortText, "")}</p>{detail !== "—" && <small>{detail}</small>}</div>
    </article>;
  })}</div>;
}

function Commentary({ items, fallback, homeId }: { items: any[]; fallback: any[]; homeId: string }) {
  if (!items.length) {
    return <>
      <p className="mc-muted">Minute-by-minute commentary is not published for this match. Showing key events instead.</p>
      <Timeline events={fallback} homeId={homeId} order="desc" />
    </>;
  }
  const sorted = [...items].sort((a, b) => num(b.sequence) - num(a.sequence));
  return <div className="mc-comm">{sorted.map((item, i) => (
    <div className="mc-comm-row" key={item.sequence ?? i}>
      <time>{safeText(item.time?.displayValue ?? item.clock?.displayValue, "")}</time>
      <p>{safeText(item.text ?? item.description, "")}</p>
    </div>
  ))}</div>;
}

function Chip({ p }: { p: any }) {
  return <div className="mc-chip" title={p.fullName} style={{ minWidth: 72 }}>
    <div style={{ position: "relative" }}>
      <Kit p={p} />
      {p.rating !== null && <em className={"mc-rating " + ratingClass(p.rating)} style={{ position: "absolute", top: -4, right: -14, minWidth: 30, padding: "1px 4px", fontSize: 11 }}>{p.rating.toFixed(1)}</em>}
    </div>
    <b>{p.name}</b>
    <span className="mc-marks">{"⚽".repeat(Math.min(p.goals, 4))}{p.yellow > 0 && !p.red ? "🟨" : ""}{p.red > 0 ? "🟥" : ""}{p.subbedOut ? "🔻" : ""}</span>
  </div>;
}

function Lineups({ sides }: { sides: Side[] }) {
  const visible = sides.filter((s) => s.players.length);
  if (!visible.length) return <p className="mc-empty">Lineups have not been published for this match yet. They usually appear about an hour before kick-off.</p>;
  return <>
    <div className="mc-lineups">{visible.map((side, index) => {
      const starters = side.players.filter((p) => p.starter);
      const subs = side.players.filter((p) => !p.starter);
      const rows = starters.length ? formationRows(starters, side.formation).reverse() : [];
      return <section key={side.team + index}>
        <h4>{side.team}{side.formation && <small> · {side.formation}</small>}</h4>
        {rows.length ? <div className="mc-pitch">{rows.map((row, r) => <div className="mc-pitch-row" key={r}>{row.map((p) => <Chip p={p} key={p.key} />)}</div>)}</div>
          : <div className="mc-subs">{side.players.map((p) => <Chip p={p} key={p.key} />)}</div>}
        {starters.length > 0 && subs.length > 0 && <><b className="mc-form-heading">Substitutes</b><div className="mc-subs">{subs.map((p) => <Chip p={p} key={p.key} />)}</div></>}
      </section>;
    })}</div>
    <p className="mc-muted" style={{ marginTop: 12 }}>Player photos: ESPN, Wikipedia and TheSportsDB. Shirts use each team's colours.</p>
  </>;
}

function PlayerRatings({ sides }: { sides: Side[] }) {
  const rated = sides.flatMap((s) => s.players.filter((p) => p.rating !== null).map((p) => ({ ...p, team: s.team })));
  if (!rated.length) return <p className="mc-empty">Ratings appear once the match has started and lineups are published.</p>;
  const top = [...rated].sort((a, b) => b.rating - a.rating).slice(0, 5);
  return <>
    <div className="mc-top">{top.map((p) => (
      <div className="mc-top-card" key={p.team + p.key} style={{ justifyItems: "center", textAlign: "center" }}>
        <div style={{ position: "relative" }}>
          <Kit p={p} />
          <em className={"mc-rating " + ratingClass(p.rating)} style={{ position: "absolute", top: -4, right: -14, fontSize: 11 }}>{p.rating.toFixed(1)}</em>
        </div>
        <b style={{ marginTop: 6 }}>{p.name}</b><small>{p.team}</small>
      </div>
    ))}</div>
    {sides.filter((s) => s.players.some((p) => p.rating !== null)).map((side, i) => (
      <section className="mc-playerstats" key={side.team + i}>
        <h4>{side.team}</h4>
        <div className="mc-table-scroll"><table>
          <thead><tr><th>Player</th><th>Rating</th><th>G</th><th>A</th><th>Shots</th><th>On target</th><th>Saves</th></tr></thead>
          <tbody>{side.players.filter((p) => p.rating !== null).sort((a, b) => b.rating - a.rating).map((p) => (
            <tr key={p.key}>
              <td><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Avatar srcs={p.photoList} name={p.name} jersey={p.jersey} size={28} zoom={1.3} fallbackText={initials(p.fullName)} />{p.name}</span></td>
              <td><em className={"mc-rating " + ratingClass(p.rating)}>{p.rating.toFixed(1)}</em></td>
              <td>{p.stats.totalGoals ?? 0}</td><td>{p.stats.goalAssists ?? 0}</td><td>{p.stats.totalShots ?? 0}</td><td>{p.stats.shotsOnTarget ?? 0}</td><td>{p.stats.saves ?? 0}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </section>
    ))}
    <p className="mc-muted">Ratings are calculated live from goals, assists, shots, saves, fouls and cards. They are not official SofaScore ratings.</p>
  </>;
}

function TeamForm({ schedules, teams }: { schedules: any[]; teams: any[] }) {
  if (!schedules.length) return <p className="mc-empty">Recent results and upcoming fixtures are not available from the competition feed.</p>;
  const resultOf = (m: any) => {
    const mine = num(m.isUserTeamHome ? m.homeScore : m.awayScore);
    const theirs = num(m.isUserTeamHome ? m.awayScore : m.homeScore);
    return mine > theirs ? "W" : mine < theirs ? "L" : "D";
  };
  return <div className="mc-lineups">{teams.map((team: any, index: number) => {
    const id = String(team?.team?.id ?? "");
    const schedule = schedules.find((s: any) => String(s.teamId) === id) ?? schedules[index] ?? {};
    const recent: any[] = schedule.recent ?? [];
    const upcoming: any[] = schedule.upcoming ?? [];
    return <section key={id || index}>
      <h4>{teamName(team, "Team")}</h4>
      <div className="mc-formstrip">{[...recent].reverse().map((m) => <span key={m.id} className={"mc-fb " + resultOf(m)}>{resultOf(m)}</span>)}</div>
      <b className="mc-form-heading">Recent results</b>
      {recent.map((m) => <div className="mc-player" key={m.id}><span>{m.home} {safeText(m.homeScore)} – {safeText(m.awayScore)} {m.away}</span><small>{formatDate(m.date)}</small></div>)}
      {!recent.length && <p className="mc-muted">No recent results supplied.</p>}
      <b className="mc-form-heading">Upcoming fixtures</b>
      {upcoming.map((m) => <div className="mc-player" key={m.id}><span>{m.home} v {m.away}</span><small>{formatDate(m.date)}</small></div>)}
      {!upcoming.length && <p className="mc-muted">No upcoming fixtures supplied.</p>}
    </section>;
  })}</div>;
}

/* ---------- main ---------- */
export default function MatchCentre({ id, league, home, away, homeScore: initialHomeScore, awayScore: initialAwayScore, status: initialStatus, venue: initialVenue, onClose }: Props) {
  const [data, setData] = useState<RecordValue | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [tab, setTab] = useState<Tab>("Overview");
  const [updated, setUpdated] = useState<Date | null>(null);
  const [photos, setPhotos] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const url = "/api/match?league=" + encodeURIComponent(league) + "&id=" + encodeURIComponent(id);
    const load = async (first: boolean) => {
      if (!first && typeof document !== "undefined" && document.hidden) { timer = setTimeout(() => load(false), REFRESH_MS); return; }
      try {
        const response = await fetch(url, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Match information is unavailable.");
        if (!active) return;
        setData(payload); setError(""); setUpdated(new Date());
        if (payload?.header?.competitions?.[0]?.status?.type?.state === "in") timer = setTimeout(() => load(false), REFRESH_MS);
      } catch (reason) {
        if (!active) return;
        if (first) setError(reason instanceof Error ? reason.message : "Match information is unavailable.");
        else timer = setTimeout(() => load(false), REFRESH_MS * 1.5);
      } finally {
        if (active && first) setBusy(false);
      }
    };
    setBusy(true); setError(""); setData(null); setTab("Overview"); setPhotos({});
    load(true);
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [id, league]);

  const competition = data?.header?.competitions?.[0] ?? {};
  const competitors = Array.isArray(competition.competitors) ? competition.competitors : [];
  const homeTeam = competitors.find((item: any) => item.homeAway === "home") ?? competitors[0];
  const awayTeam = competitors.find((item: any) => item.homeAway === "away") ?? competitors[1];
  const homeId = String(homeTeam?.team?.id ?? "");
  const homeName = teamName(homeTeam, home);
  const awayName = teamName(awayTeam, away);
  const state = competition.status?.type?.state as string | undefined;
  const isLive = state === "in";
  const matchStarted = state ? state !== "pre" : false;
  const status = safeText(competition.status?.type?.shortDetail ?? competition.status?.type?.detail ?? competition.status?.type?.description, initialStatus || "Match details");
  const homeScore = safeText(homeTeam?.score, initialHomeScore === null ? "—" : String(initialHomeScore));
  const awayScore = safeText(awayTeam?.score, initialAwayScore === null ? "—" : String(initialAwayScore));
  const venue = safeText(competition.venue?.fullName ?? competition.venue?.address?.city, initialVenue || "");

  const teams = asArray(data?.boxscore?.teams);
  const statRows = useMemo(() => collectStats(teams, homeId), [data]);
  const kits = useMemo(() => buildKits(homeTeam, awayTeam), [data]);
  const baseSides = useMemo(() => buildSides(data?.rosters, matchStarted), [data, matchStarted]);
  const rosterKey = baseSides.map((s) => s.players.map((p) => p.key).join(",")).join("|");

  // look up photos for every player ESPN has none for: starters of both teams first, then subs
  useEffect(() => {
    let queue = baseSides
      .flatMap((s) => s.players.map((p, index) => ({ p, team: s.team, index })))
      .filter((x) => !x.p.espnPhoto)
      .sort((a, b) => Number(!a.p.starter) - Number(!b.p.starter) || a.index - b.index)
      .map((x) => ({ name: x.p.fullName, team: x.team }));
    if (!queue.length) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = async (attempt: number) => {
      if (!active || !queue.length) return;
      try {
        const response = await fetch("/api/player-photos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ players: queue.slice(0, 30) }) });
        const payload = await response.json();
        if (!active) return;
        const resolved = payload?.photos ?? {};
        const found: Record<string, string> = {};
        for (const [name, url] of Object.entries(resolved)) if (url) found[name] = url as string;
        if (Object.keys(found).length) setPhotos((prev) => ({ ...prev, ...found }));
        queue = queue.filter((q) => !(q.name in resolved));
      } catch { /* try again below */ }
      if (queue.length && attempt < 15) timer = setTimeout(() => run(attempt + 1), 6000);
    };
    run(0);
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [rosterKey]);

  const sides = useMemo(() => baseSides.map((s) => {
    const teamKit = s.teamId && s.teamId === homeId ? kits.home : s.homeAway === "home" && !homeId ? kits.home : kits.away;
    return {
      ...s,
      players: s.players.map((p) => ({
        ...p,
        photoList: [p.espnPhoto, photos[p.fullName]].filter(Boolean) as string[],
        kit: /^G/i.test(p.pos) ? kits.gk : teamKit
      }))
    };
  }), [baseSides, photos, kits, homeId]);

  const events = useMemo(() => {
    const base = asArray(data?.keyEvents).length ? asArray(data?.keyEvents) : asArray(data?.plays);
    const seen = new Set<string>();
    return base.filter((event: any) => {
      const key = String(event.id ?? event.text ?? "");
      if (!key || seen.has(key)) return false;
      seen.add(key); return true;
    });
  }, [data]);
  const commentary = asArray(data?.commentary);

  const tabs: Tab[] = ["Overview", "Statistics", "Lineups", "Commentary", "Team form"];
  const numericHome = Number(homeScore), numericAway = Number(awayScore);
  const isFinal = competition.status?.type?.completed === true || state === "post" || /final|full time|\bft\b/i.test(status);
  const result = isFinal && Number.isFinite(numericHome) && Number.isFinite(numericAway)
    ? numericHome === numericAway ? "The match finished level." : `${numericHome > numericAway ? homeName : awayName} won the match.`
    : isLive ? "This match is live. The page refreshes automatically." : "This match has not finished yet.";
  const teamSchedules = asArray(data?.teamSchedules);

  return <div className="mc-backdrop" onClick={onClose}><main className="mc-modal mc-fullpage" role="main" aria-label="Match details" onClick={(event) => event.stopPropagation()}>
    <div className="mc-topbar"><span>G.O.A.T. <b>VIEWS</b> <i>/</i> {league.toUpperCase()} / MATCH DETAILS</span><button onClick={onClose} aria-label="Back to scores">← Back</button></div>
    <div className="mc-page-layout">
      <div className="mc-primary">
        <header className="mc-hero"><div className="mc-league">{league} {competition?.date ? "· " + formatDate(competition.date) : ""}</div><div className="mc-scoreboard">
          <div className="mc-side"><span className="mc-crest">{homeName.slice(0, 3)}</span><b>{homeName}</b></div>
          <div className="mc-score"><strong>{homeScore}</strong><span>:</span><strong>{awayScore}</strong><small className={isLive ? "mc-live" : ""}>{isLive && <i className="mc-dot" />}{status}</small></div>
          <div className="mc-side mc-away"><span className="mc-crest">{awayName.slice(0, 3)}</span><b>{awayName}</b></div>
        </div><div className="mc-venue">{[venue, competition?.venue?.address?.city].filter(Boolean).join(" · ")}{updated && isLive ? ` · Updated ${updated.toLocaleTimeString()}` : ""}</div></header>
        <nav className="mc-tabs" aria-label="Match sections">{tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</nav>
        <div className="mc-content">
          {busy && <p className="mc-loading">Loading match information…</p>}
          {error && <p className="mc-empty">{error} The scoreboard information is retained above.</p>}
          {tab === "Overview" && <>
            <section className="mc-section"><h3>Match summary</h3><p className="mc-analysis">{result}</p><div className="mc-info-grid"><div><small>Competition</small><b>{league}</b></div><div><small>Match status</small><b>{status}</b></div><div><small>Venue</small><b>{venue || "Not supplied"}</b></div><div><small>Referee</small><b>{safeText(competition?.officials?.[0]?.fullName ?? competition?.officials?.[0]?.displayName, "Not supplied")}</b></div></div></section>
            <section className="mc-section"><h3>Key events</h3><Timeline events={events} homeId={homeId} /></section>
            <section className="mc-section"><h3>Match statistics</h3><StatBars rows={statRows} limit={6} /></section>
          </>}
          {tab === "Statistics" && <>
            <section className="mc-section"><h3>Team statistics</h3><StatBars rows={statRows} /></section>
            <section className="mc-section"><h3>Live player ratings</h3><PlayerRatings sides={sides} /></section>
          </>}
          {tab === "Lineups" && <section className="mc-section"><h3>Lineups & substitutes</h3><Lineups sides={sides} /></section>}
          {tab === "Commentary" && <section className="mc-section"><h3>Live commentary</h3><Commentary items={commentary} fallback={events} homeId={homeId} /></section>}
          {tab === "Team form" && <section className="mc-section"><h3>Form & fixtures</h3><TeamForm schedules={teamSchedules} teams={[homeTeam, awayTeam]} /></section>}
        </div>
      </div>
      <aside className="mc-aside"><section className="mc-aside-card"><h3>Match information</h3><div><small>Competition</small><b>{league}</b></div><div><small>Kick-off</small><b>{formatDate(competition?.date)}</b></div><div><small>Venue</small><b>{venue || "Not supplied"}</b></div><div><small>Attendance</small><b>{safeText(competition?.attendance, "Not supplied")}</b></div></section><section className="mc-aside-card"><h3>Match coverage</h3><p>Scores, events, lineups and commentary refresh every 20 seconds while a match is live. Anything the data provider has not published is labelled rather than invented.</p></section></aside>
    </div>
  </main></div>;
}
