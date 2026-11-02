"use client";

import { useEffect, useMemo, useState } from "react";
import WhereToWatch from "./WhereToWatch";
import Highlights from "./Highlights";

type Props = { id: string; league: string; home: string; away: string; homeScore: number | null; awayScore: number | null; status: string; venue: string | null; onClose: () => void };
type RecordValue = Record<string, any>;
type Tab = "Overview" | "Statistics" | "Lineups" | "Commentary" | "Team form";
type View = "Performance" | "Nationality" | "Age" | "Height";
type Detail = { born?: string; nationality?: string; height?: string };

const REFRESH_MS = 20000;
const VIEWS: View[] = ["Performance", "Nationality", "Age", "Height"];

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
function withHash(value: any) {
  const s = safeText(value, "").replace("#", "");
  return /^[0-9a-f]{6}$/i.test(s) ? "#" + s : "";
}
function ageFrom(born?: string) {
  if (!born) return "";
  const d = new Date(born);
  if (Number.isNaN(d.getTime())) return "";
  const years = Math.floor((Date.now() - d.getTime()) / 31557600000);
  return years > 0 && years < 60 ? String(years) : "";
}
function heightFrom(raw?: string) {
  if (!raw) return "";
  const cm = /(\d{3})\s*cm/i.exec(raw);
  if (cm) return cm[1] + " cm";
  const m = /(\d(?:[.,]\d{1,2})?)\s*m/i.exec(raw);
  if (m) return Math.round(parseFloat(m[1].replace(",", ".")) * 100) + " cm";
  return "";
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
  if (/goal|scored|penalty - scored/.test(t) && !/no goal|disallowed|saved|missed|goal ?kick|goalkeeper/.test(t)) return "goal";
  return "other";
}
const isGoalEvent = (e: any) => eventKind(e) === "goal" || e.scoringPlay === true;
const ICON: Record<string, string> = { goal: "⚽", yellow: "🟨", red: "🟥", sub: "🔁", other: "•" };

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
const ratingClass = (r: number) => (r >= 7 ? "great" : r >= 6.5 ? "good" : r >= 6 ? "ok" : "poor");
const ratingColor = (r: number) => (r >= 7 ? "#2fb344" : r >= 6.5 ? "#c9a227" : r >= 6 ? "#e8872a" : "#d63a2f");

/* ---------- build lineups from rosters ---------- */
type Side = { homeAway: string; teamId: string; team: string; formation: string; players: any[]; logo?: string; color?: string };
function buildSides(rosters: any, matchStarted: boolean): Side[] {
  return asArray(rosters).map((group: any, index: number) => ({
    homeAway: group.homeAway ?? (index === 0 ? "home" : "away"),
    teamId: String(group.team?.id ?? ""),
    team: teamName(group, "Team"),
    formation: safeText(group.formation, ""),
    players: asArray(group.roster).map((p: any, i: number) => {
      const stats = statMap(p);
      const starter = p.starter === true;
      const a = p.athlete ?? {};
      return {
        key: String(a.id ?? index + "-" + i),
        name: safeText(a.shortName ?? a.displayName ?? a.fullName, "Player"),
        fullName: safeText(a.displayName ?? a.fullName ?? a.shortName, "Player"),
        espnPhoto: a.headshot?.href ?? "",
        photoList: [] as string[],
        jersey: safeText(p.jersey ?? a.jersey, ""),
        pos: safeText(p.position?.abbreviation ?? p.position?.displayName, ""),
        captain: p.captain === true,
        age: a.age ? String(a.age) : "",
        nationality: safeText(a.citizenshipCountry?.abbreviation ?? a.citizenship ?? a.flag?.alt, ""),
        flag: a.flag?.href ?? "",
        height: a.displayHeight ? String(a.displayHeight) : "",
        place: num(p.formationPlace),
        starter,
        stats,
        goals: stats.totalGoals ?? stats.goals ?? 0,
        assists: stats.goalAssists ?? stats.assists ?? 0,
        yellow: stats.yellowCards ?? 0,
        red: stats.redCards ?? 0,
        subbedOut: didSub(p.subbedOut),
        subbedIn: didSub(p.subbedIn),
        rating: matchStarted ? playerRating(p, starter, stats) : null
      };
    })
  }));
}

// ESPN's formationPlace is a position slot (not a row), so rows are built from the position names
function levelOf(pos: string): number {
  const p = pos.toUpperCase();
  if (/^G/.test(p)) return 0;
  if (/^(CD|SW|RB|LB|RWB|LWB|WB)/.test(p)) return 1;
  if (/^DM/.test(p)) return 2;
  if (/^(CM|RM|LM)/.test(p)) return 3;
  if (/^AM/.test(p)) return 4;
  if (/^(F|CF|ST|LF|RF|SS|RW|LW)/.test(p)) return 5;
  return 3;
}
function sideRank(pos: string): number { // -1 = team's left, 1 = team's right
  const p = pos.toUpperCase();
  if (/-L$/.test(p) || /^L[A-Z]/.test(p)) return -1;
  if (/-R$/.test(p) || /^R[A-Z]/.test(p)) return 1;
  return 0;
}
function formationRows(starters: any[], formation: string, isHome: boolean): any[][] {
  const parts = formation.split("-").map((n) => Number.parseInt(n, 10)).filter((n) => n > 0);
  const backs = parts[0] ?? 0;
  const items = starters.map((p) => ({ p, level: levelOf(p.pos) }));
  if (backs && items.filter((x) => x.level === 1).length > backs) {
    items.forEach((x) => { if (x.level === 1 && !/^(CD|SW)/i.test(x.p.pos)) x.level = 3; }); // wing-backs
  }
  const order = (a: any, b: any) => (isHome ? sideRank(b.pos) - sideRank(a.pos) : sideRank(a.pos) - sideRank(b.pos)) || a.place - b.place;
  const sorted = items.sort((a, b) => a.level - b.level || order(a.p, b.p)).map((x) => x.p);
  if (!parts.length || parts.reduce((a, b) => a + b, 0) !== sorted.length - 1 || levelOf(sorted[0].pos) !== 0) return [sorted];
  const rows: any[][] = [sorted.slice(0, 1)];
  let i = 1;
  for (const n of parts) { rows.push(sorted.slice(i, i + n).sort(order)); i += n; }
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
function Avatar({ srcs, name, jersey, size }: { srcs: string[]; name: string; jersey: string; size: number }) {
  const list = srcs.filter(Boolean);
  const signature = list.join("|");
  const [index, setIndex] = useState(0);
  useEffect(() => { setIndex(0); }, [signature]);
  if (index >= list.length) {
    return <span className="mc-jersey" style={{ width: size, height: size, fontSize: Math.round(size / 2.6) }}>{jersey || name.slice(0, 1)}</span>;
  }
  return <img
    key={list[index]}
    src={list[index]}
    alt={name}
    loading="lazy"
    onError={() => setIndex((i) => i + 1)}
    style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", objectPosition: "center top", background: "#e9edf0", border: "2px solid #fff", display: "block" }}
  />;
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

/* ---------- SofaScore-style lineup ---------- */
const PITCH_LINE = "#3b444b";
const iconBadge: React.CSSProperties = { position: "absolute", minWidth: 20, height: 20, padding: "0 3px", borderRadius: 10, background: "#fff", color: "#111", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, boxShadow: "0 1px 3px rgba(0,0,0,.5)" };

function ValuePill({ p, view }: { p: any; view: View }) {
  const base: React.CSSProperties = { position: "absolute", bottom: -9, left: "50%", transform: "translateX(-50%)", fontSize: 11, fontWeight: 800, color: "#fff", padding: "1px 6px", borderRadius: 3, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4, maxWidth: 84, overflow: "hidden", textOverflow: "ellipsis" };
  if (view === "Performance") {
    if (p.rating === null) return null;
    return <span style={{ ...base, background: ratingColor(p.rating) }}>{p.rating.toFixed(1)}</span>;
  }
  const neutral = { ...base, background: "#2a3540" };
  if (view === "Nationality") {
    return <span style={neutral}>{p.flag ? <img src={p.flag} alt={p.nationality} width={18} height={12} style={{ display: "block" }} /> : (p.nationality || "–")}</span>;
  }
  if (view === "Age") return <span style={neutral}>{p.age || "–"}</span>;
  return <span style={neutral}>{p.height || "–"}</span>;
}

function PitchPlayer({ p, view }: { p: any; view: View }) {
  return <div style={{ display: "grid", justifyItems: "center", textAlign: "center", color: "#e8edf1" }} title={p.fullName}>
    <div style={{ position: "relative", width: 50, height: 50 }}>
      <Avatar srcs={p.photoList} name={p.name} jersey={p.jersey} size={50} />
      {p.red > 0 ? <i style={{ position: "absolute", top: -4, left: -6, width: 11, height: 15, borderRadius: 2, background: "#e03131", border: "1px solid #fff" }} />
        : p.yellow > 0 ? <i style={{ position: "absolute", top: -4, left: -6, width: 11, height: 15, borderRadius: 2, background: "#f5c518", border: "1px solid #fff" }} /> : null}
      {p.goals > 0 && <span style={{ ...iconBadge, top: -6, right: -8 }}>⚽{p.goals > 1 ? p.goals : ""}</span>}
      {p.assists > 0 && <span style={{ ...iconBadge, top: 16, right: -12 }}>👟{p.assists > 1 ? p.assists : ""}</span>}
      {(p.subbedOut || p.subbedIn) && <span style={{ ...iconBadge, top: 18, left: -10, color: p.subbedOut ? "#d63a2f" : "#2fb344" }}>⇄</span>}
      <ValuePill p={p} view={view} />
    </div>
    <div style={{ marginTop: 13, fontSize: 11.5, fontWeight: 700, lineHeight: 1.15, padding: "0 2px" }}>
      <span style={{ opacity: 0.55, marginRight: 3 }}>{p.jersey}</span>{p.captain ? "(c) " : ""}{p.name}
    </div>
  </div>;
}

function Shirt({ color }: { color: string }) {
  return <svg viewBox="0 0 60 52" width={28} height={24} aria-hidden="true">
    <path d="M18 2 L4 10 L9 24 L16 21 L16 50 L44 50 L44 21 L51 24 L56 10 L42 2 Q30 13 18 2 Z" fill={color} stroke="rgba(255,255,255,.5)" strokeWidth="1.5" />
  </svg>;
}

function TeamHeader({ side, avg }: { side: Side; avg: number | null }) {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", color: "#f2f6f8" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      {side.logo
        ? <img src={side.logo} alt="" width={34} height={34} style={{ objectFit: "contain" }} />
        : <span className="mc-crest" style={{ width: 34, height: 34, fontSize: 12, borderRadius: 10 }}>{side.team.slice(0, 3)}</span>}
      <b style={{ fontSize: 16 }}>{side.team}</b>
      {avg !== null && <span style={{ background: ratingColor(avg), color: "#fff", fontWeight: 800, fontSize: 12, padding: "2px 7px", borderRadius: 4 }}>{avg.toFixed(2)}</span>}
    </div>
    <div style={{ display: "grid", justifyItems: "end", gap: 4 }}>
      <span style={{ fontSize: 13, fontWeight: 800, color: "#cfd8de" }}>{side.formation}</span>
      <Shirt color={side.color || "#3a4a56"} />
    </div>
  </div>;
}

function Half({ rows, view, height, position }: { rows: any[][]; view: View; height: number; position: "top" | "bottom" }) {
  return <div style={{ height, display: "flex", flexDirection: "column", justifyContent: "space-around", padding: position === "top" ? "10px 0 6px" : "6px 0 10px", position: "relative", zIndex: 1 }}>
    {rows.map((row, r) => (
      <div key={r} style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", padding: "0 4px" }}>
        {row.map((p) => <div key={p.key} style={row.length > 5 ? { flex: "0 0 25%", marginBottom: 14 } : { flex: 1, minWidth: 0 }}><PitchPlayer p={p} view={view} /></div>)}
      </div>
    ))}
  </div>;
}

function Lineups({ sides, view, setView }: { sides: Side[]; view: View; setView: (v: View) => void }) {
  const visible = sides.filter((s) => s.players.length);
  if (!visible.length) return <p className="mc-empty">Lineups have not been published for this match yet. They usually appear about an hour before kick-off.</p>;
  const home = visible.find((s) => s.homeAway === "home") ?? visible[0];
  const away = visible.find((s) => s !== home);
  const rowsOf = (side: Side, isHome: boolean) => {
    const starters = side.players.filter((p) => p.starter);
    return starters.length ? formationRows(starters, side.formation, isHome) : [side.players];
  };
  const homeRows = rowsOf(home, true);
  const awayRows = away ? [...rowsOf(away, false)].reverse() : [];
  const rowHeight = 118;
  const halfHeight = Math.max(homeRows.length, awayRows.length, 4) * rowHeight;
  const avgOf = (s: Side) => {
    const r = s.players.filter((p) => p.rating !== null).map((p) => p.rating as number);
    return r.length ? r.reduce((a, b) => a + b, 0) / r.length : null;
  };
  const hasValue = (p: any) => (view === "Nationality" ? p.flag || p.nationality : view === "Age" ? p.age : view === "Height" ? p.height : true);
  const missing = view !== "Performance" && !visible.some((s) => s.players.some(hasValue));
  const line = "2px solid " + PITCH_LINE;

  return <>
    <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12 }}>
      {VIEWS.map((v) => (
        <button key={v} onClick={() => setView(v)} style={{ border: 0, cursor: "pointer", whiteSpace: "nowrap", borderRadius: 20, padding: "9px 16px", fontWeight: 700, fontSize: 13, background: view === v ? "#e9edf0" : "#0b1015", color: view === v ? "#111" : "#e8edf1" }}>{v}</button>
      ))}
    </div>
    {missing && <p className="mc-muted" style={{ marginBottom: 10 }}>{view} is still loading, or is not available for these players. It fills in over about a minute.</p>}

    <div style={{ background: "#0f151a", borderRadius: 10, overflow: "hidden", border: "1px solid #26343d" }}>
      <TeamHeader side={home} avg={avgOf(home)} />
      <div style={{ position: "relative", background: "#141b21", borderTop: line, borderBottom: away ? "none" : line }}>
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "46%", height: 150, borderLeft: line, borderRight: line, borderBottom: line }} />
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "24%", height: 62, borderLeft: line, borderRight: line, borderBottom: line }} />
        {away && <>
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, borderTop: line }} />
          <div style={{ position: "absolute", top: "50%", left: "50%", width: 140, height: 140, transform: "translate(-50%,-50%)", border: line, borderRadius: "50%" }} />
          <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "46%", height: 150, borderLeft: line, borderRight: line, borderTop: line }} />
          <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "24%", height: 62, borderLeft: line, borderRight: line, borderTop: line }} />
        </>}
        <Half rows={homeRows} view={view} height={halfHeight} position="top" />
        {away && <Half rows={awayRows} view={view} height={halfHeight} position="bottom" />}
      </div>
      {away && <TeamHeader side={away} avg={avgOf(away)} />}
    </div>

    {visible.map((side, i) => {
      const subs = side.players.filter((p) => !p.starter);
      if (!subs.length || !side.players.some((p) => p.starter)) return null;
      return <section key={side.team + i} style={{ marginTop: 14, background: "#0f151a", border: "1px solid #26343d", borderRadius: 10, padding: "12px 6px 18px" }}>
        <b className="mc-form-heading" style={{ marginLeft: 10 }}>{side.team} · Substitutes</b>
        <div style={{ display: "flex", flexWrap: "wrap", rowGap: 18, marginTop: 10 }}>
          {subs.map((p) => <div key={p.key} style={{ flex: "0 0 25%", minWidth: 0 }}><PitchPlayer p={p} view={view} /></div>)}
        </div>
      </section>;
    })}
    <p className="mc-muted" style={{ marginTop: 12 }}>Player photos: Wikipedia and TheSportsDB. Age, nationality and height: TheSportsDB. Ratings are calculated live from match stats.</p>
  </>;
}

function PlayerRatings({ sides }: { sides: Side[] }) {
  const rated = sides.flatMap((s) => s.players.filter((p) => p.rating !== null).map((p) => ({ ...p, team: s.team })));
  if (!rated.length) return <p className="mc-empty">Ratings appear once the match has started and lineups are published.</p>;
  const top = [...rated].sort((a, b) => b.rating - a.rating).slice(0, 5);
  return <>
    <div className="mc-top">{top.map((p) => (
      <div className="mc-top-card" key={p.team + p.key} style={{ justifyItems: "center", textAlign: "center" }}>
        <div style={{ position: "relative", width: 52, height: 52 }}>
          <Avatar srcs={p.photoList} name={p.name} jersey={p.jersey} size={52} />
          <span style={{ position: "absolute", bottom: -9, left: "50%", transform: "translateX(-50%)", fontSize: 11, fontWeight: 800, color: "#fff", padding: "1px 6px", borderRadius: 3, background: ratingColor(p.rating) }}>{p.rating.toFixed(1)}</span>
        </div>
        <b style={{ marginTop: 12 }}>{p.name}</b><small>{p.team}</small>
      </div>
    ))}</div>
    {sides.filter((s) => s.players.some((p) => p.rating !== null)).map((side, i) => (
      <section className="mc-playerstats" key={side.team + i}>
        <h4>{side.team}</h4>
        <div className="mc-table-scroll"><table>
          <thead><tr><th>Player</th><th>Rating</th><th>G</th><th>A</th><th>Shots</th><th>On target</th><th>Saves</th></tr></thead>
          <tbody>{side.players.filter((p) => p.rating !== null).sort((a, b) => b.rating - a.rating).map((p) => (
            <tr key={p.key}>
              <td><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Avatar srcs={p.photoList} name={p.name} jersey={p.jersey} size={26} />{p.name}</span></td>
              <td><em className={"mc-rating " + ratingClass(p.rating)}>{p.rating.toFixed(1)}</em></td>
              <td>{p.goals}</td><td>{p.assists}</td><td>{p.stats.totalShots ?? 0}</td><td>{p.stats.shotsOnTarget ?? 0}</td><td>{p.stats.saves ?? 0}</td>
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
  const [view, setView] = useState<View>("Performance");
  const [updated, setUpdated] = useState<Date | null>(null);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [details, setDetails] = useState<Record<string, Detail>>({});

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
    setBusy(true); setError(""); setData(null); setTab("Overview"); setPhotos({}); setDetails({});
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
  const baseSides = useMemo(() => buildSides(data?.rosters, matchStarted), [data, matchStarted]);
  const rosterKey = baseSides.map((s) => s.players.map((p) => p.key).join(",")).join("|");

  const events = useMemo(() => {
    const base = asArray(data?.keyEvents).length ? asArray(data?.keyEvents) : asArray(data?.plays);
    const seen = new Set<string>();
    return base.filter((event: any) => {
      const key = String(event.id ?? event.text ?? "");
      if (!key || seen.has(key)) return false;
      seen.add(key); return true;
    });
  }, [data]);

  // goals and assists per player, read from the match events (first participant scored, second assisted)
  const tally = useMemo(() => {
    const goals: Record<string, number> = {};
    const assists: Record<string, number> = {};
    for (const e of events) {
      if (!isGoalEvent(e)) continue;
      if (/own goal/i.test(eventLabel(e) + " " + safeText(e.text, ""))) continue;
      const parts = asArray(e.participants);
      const scorer = parts[0]?.athlete?.id;
      const assister = parts[1]?.athlete?.id;
      if (scorer) goals[String(scorer)] = (goals[String(scorer)] ?? 0) + 1;
      if (assister) assists[String(assister)] = (assists[String(assister)] ?? 0) + 1;
    }
    return { goals, assists };
  }, [events]);

  // scorers shown under each team in the header
  const scorers = useMemo(() => {
    const sideOf: Record<string, string> = {};
    baseSides.forEach((s) => s.players.forEach((p) => { sideOf[p.key] = s.homeAway; }));
    const list: Record<"home" | "away", any[]> = { home: [], away: [] };
    for (const e of events) {
      if (!isGoalEvent(e)) continue;
      const text = eventLabel(e) + " " + safeText(e.text, "");
      const own = /own goal/i.test(text);
      const pen = /penalty/i.test(text) && !/missed|saved/i.test(text);
      const athlete = asArray(e.participants)[0]?.athlete;
      let side: string | undefined = athlete?.id ? sideOf[String(athlete.id)] : undefined;
      if (side) { if (own) side = side === "home" ? "away" : "home"; }
      else if (e.team?.id !== undefined) side = String(e.team.id) === homeId ? "home" : "away";
      if (side !== "home" && side !== "away") continue;
      list[side].push({ name: safeText(athlete?.displayName ?? athlete?.shortName ?? athlete?.fullName, "Goal"), minute: eventMinute(e), own, pen, order: minuteValue(e) });
    }
    list.home.sort((a, b) => b.order - a.order);
    list.away.sort((a, b) => b.order - a.order);
    return list;
  }, [events, baseSides, homeId]);

  // photos + age/nationality/height for every player: starters of both teams first, then subs
  useEffect(() => {
    let queue = baseSides
      .flatMap((s) => s.players.map((p, index) => ({ p, team: s.team, index })))
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
        const results: Record<string, any> = payload?.results ?? {};
        const foundPhotos: Record<string, string> = {};
        const foundDetails: Record<string, Detail> = {};
        for (const [name, r] of Object.entries(results)) {
          if (r?.photo) foundPhotos[name] = r.photo;
          if (r?.born || r?.nationality || r?.height) foundDetails[name] = { born: r.born, nationality: r.nationality, height: r.height };
        }
        if (Object.keys(foundPhotos).length) setPhotos((prev) => ({ ...prev, ...foundPhotos }));
        if (Object.keys(foundDetails).length) setDetails((prev) => ({ ...prev, ...foundDetails }));
        queue = queue.filter((q) => !results[q.name]?.done);
      } catch { /* try again below */ }
      if (queue.length && attempt < 20) timer = setTimeout(() => run(attempt + 1), 4000);
    };
    run(0);
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [rosterKey]);

  const sides = useMemo(() => baseSides.map((s) => {
    const comp = competitors.find((c: any) => String(c.team?.id) === s.teamId);
    return {
      ...s,
      logo: comp?.team?.logo ?? comp?.team?.logos?.[0]?.href ?? "",
      color: withHash(comp?.team?.color) || "#3a4a56",
      players: s.players.map((p) => {
        const goals = Math.max(p.goals, tally.goals[p.key] ?? 0);
        const assists = Math.max(p.assists, tally.assists[p.key] ?? 0);
        const rating = p.rating === null ? null : Math.max(3, Math.min(10, Math.round((p.rating + (goals - p.goals) * 1.2 + (assists - p.assists) * 0.8) * 10) / 10));
        const d = details[p.fullName];
        return {
          ...p,
          goals,
          assists,
          rating,
          age: p.age || ageFrom(d?.born),
          nationality: p.nationality || d?.nationality || "",
          height: p.height || heightFrom(d?.height),
          photoList: [p.espnPhoto, photos[p.fullName]].filter(Boolean) as string[]
        };
      })
    };
  }), [baseSides, photos, details, tally, data]);

  const commentary = asArray(data?.commentary);

  const tabs: Tab[] = ["Overview", "Statistics", "Lineups", "Commentary", "Team form"];
  const numericHome = Number(homeScore), numericAway = Number(awayScore);
  const isFinal = competition.status?.type?.completed === true || state === "post" || /final|full time|\bft\b/i.test(status);
  const result = isFinal && Number.isFinite(numericHome) && Number.isFinite(numericAway)
    ? numericHome === numericAway ? "The match finished level." : `${numericHome > numericAway ? homeName : awayName} won the match.`
    : isLive ? "This match is live. The page refreshes automatically." : "This match has not finished yet.";
  const teamSchedules = asArray(data?.teamSchedules);
  const hasScorers = scorers.home.length > 0 || scorers.away.length > 0;
  const scorerLine = (s: any) => `${s.name} ${s.minute}${s.pen ? " (P)" : ""}${s.own ? " (OG)" : ""}`;

  return <div className="mc-backdrop" onClick={onClose}><main className="mc-modal mc-fullpage" role="main" aria-label="Match details" onClick={(event) => event.stopPropagation()}>
    <div className="mc-topbar"><span>G.O.A.T. <b>VIEWS</b> <i>/</i> {league.toUpperCase()} / MATCH DETAILS</span><button onClick={onClose} aria-label="Back to scores">← Back</button></div>
    <div className="mc-page-layout">
      <div className="mc-primary">
        <header className="mc-hero"><div className="mc-league">{league} {competition?.date ? "· " + formatDate(competition.date) : ""}</div><div className="mc-scoreboard">
          <div className="mc-side"><span className="mc-crest">{homeName.slice(0, 3)}</span><b>{homeName}</b></div>
          <div className="mc-score"><strong>{homeScore}</strong><span>:</span><strong>{awayScore}</strong><small className={isLive ? "mc-live" : ""}>{isLive && <i className="mc-dot" />}{status}</small></div>
          <div className="mc-side mc-away"><span className="mc-crest">{awayName.slice(0, 3)}</span><b>{awayName}</b></div>
        </div>
        {hasScorers && <div style={{ display: "grid", gridTemplateColumns: "1fr 28px 1fr", gap: 8, maxWidth: 560, margin: "6px auto 14px", fontSize: 12.5, lineHeight: 1.7, color: "#c5d0d8" }}>
          <div style={{ textAlign: "right" }}>{scorers.home.map((s, i) => <div key={i}>{scorerLine(s)}</div>)}</div>
          <div style={{ textAlign: "center", fontSize: 16, paddingTop: 2 }}>⚽</div>
          <div style={{ textAlign: "left" }}>{scorers.away.map((s, i) => <div key={i}>{scorerLine(s)}</div>)}</div>
        </div>}
        <div className="mc-venue">{[venue, competition?.venue?.address?.city].filter(Boolean).join(" · ")}{updated && isLive ? ` · Updated ${updated.toLocaleTimeString()}` : ""}</div></header>
        <WhereToWatch league={league} />
        <nav className="mc-tabs" aria-label="Match sections">{tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</nav>
        <div className="mc-content">
          {busy && <p className="mc-loading">Loading match information…</p>}
          {error && <p className="mc-empty">{error} The scoreboard information is retained above.</p>}
          {tab === "Overview" && <>
            <Highlights home={homeName} away={awayName} league={league} />
            <section className="mc-section"><h3>Match summary</h3><p className="mc-analysis">{result}</p><div className="mc-info-grid"><div><small>Competition</small><b>{league}</b></div><div><small>Match status</small><b>{status}</b></div><div><small>Venue</small><b>{venue || "Not supplied"}</b></div><div><small>Referee</small><b>{safeText(competition?.officials?.[0]?.fullName ?? competition?.officials?.[0]?.displayName, "Not supplied")}</b></div></div></section>
            <section className="mc-section"><h3>Key events</h3><Timeline events={events} homeId={homeId} /></section>
            <section className="mc-section"><h3>Match statistics</h3><StatBars rows={statRows} limit={6} /></section>
          </>}
          {tab === "Statistics" && <>
            <section className="mc-section"><h3>Team statistics</h3><StatBars rows={statRows} /></section>
            <section className="mc-section"><h3>Live player ratings</h3><PlayerRatings sides={sides} /></section>
          </>}
          {tab === "Lineups" && <section className="mc-section"><h3>Lineups & substitutes</h3><Lineups sides={sides} view={view} setView={setView} /></section>}
          {tab === "Commentary" && <section className="mc-section"><h3>Live commentary</h3><Commentary items={commentary} fallback={events} homeId={homeId} /></section>}
          {tab === "Team form" && <section className="mc-section"><h3>Form & fixtures</h3><TeamForm schedules={teamSchedules} teams={[homeTeam, awayTeam]} /></section>}
        </div>
      </div>
      <aside className="mc-aside"><section className="mc-aside-card"><h3>Match information</h3><div><small>Competition</small><b>{league}</b></div><div><small>Kick-off</small><b>{formatDate(competition?.date)}</b></div><div><small>Venue</small><b>{venue || "Not supplied"}</b></div><div><small>Attendance</small><b>{safeText(competition?.attendance, "Not supplied")}</b></div></section><section className="mc-aside-card"><h3>Match coverage</h3><p>Scores, events, lineups and commentary refresh every 20 seconds while a match is live. Anything the data provider has not published is labelled rather than invented.</p></section></aside>
    </div>
  </main></div>;
}
