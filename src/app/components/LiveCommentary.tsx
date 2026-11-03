"use client";

import { useMemo, useState } from "react";
import ListenLive from "./ListenLive";

type Kind = "goal" | "yellow" | "red" | "sub" | "corner" | "offside" | "foul" | "save" | "shot" | "var" | "period" | "other";
type Entry = { key: string; order: number; minute: string; period: number; text: string; kind: Kind; side: "home" | "away" | ""; x: number | null; y: number | null };

const ICON: Record<Kind, string> = { goal: "⚽", yellow: "🟨", red: "🟥", sub: "🔁", corner: "🚩", offside: "🚫", foul: "⚠️", save: "🧤", shot: "🎯", var: "📺", period: "⏱️", other: "•" };
const KEY_KINDS = new Set<Kind>(["goal", "yellow", "red", "sub", "var", "period"]);
const HOME_COLOR = "#2f9bff";
const AWAY_COLOR = "#f5c242";

function classify(typeText: string, text: string): Kind {
  const base = (typeText || text).toLowerCase();
  if (/goal ?kick/.test(base)) return "other";
  if (/own goal|^goal\b|penalty - scored|penalty scored/.test(base)) return "goal";
  if (/second yellow|red card/.test(base)) return "red";
  if (/yellow/.test(base)) return "yellow";
  if (/substitution/.test(base)) return "sub";
  if (/corner/.test(base)) return "corner";
  if (/offside/.test(base)) return "offside";
  if (/foul|handball/.test(base)) return "foul";
  if (/save/.test(base)) return "save";
  if (/\bvar\b|video assistant/.test(base)) return "var";
  if (/kickoff|kick off|half|full time|end regular|end of|match ends|lineups/.test(base)) return "period";
  if (/shot|header|attempt|effort|woodwork/.test(base)) return "shot";
  return "other";
}

function minuteNumber(minute: string) {
  const m = minute.match(/(\d+)(?:\D*\+\s*(\d+))?/);
  return m ? Number(m[1]) + (m[2] ? Number(m[2]) / 100 : 0) : 0;
}

function buildEntries(commentary: any[], plays: any[], keyEvents: any[], homeId: string): Entry[] {
  const fromCommentary = commentary.length > 0;
  const list = fromCommentary ? commentary : plays.length ? plays : keyEvents;
  const entries = list.map((raw: any, index: number): Entry => {
    const play = fromCommentary ? raw?.play ?? {} : raw ?? {};
    const text = String(raw?.text ?? play?.text ?? play?.shortText ?? raw?.description ?? "").replace(/\s+/g, " ").trim();
    const typeText = String(play?.type?.text ?? play?.type?.name ?? raw?.type?.text ?? "");
    const minute = String(raw?.time?.displayValue ?? play?.clock?.displayValue ?? raw?.clock?.displayValue ?? "");
    const sequence = Number(raw?.sequence ?? play?.sequenceNumber);
    const teamId = String(play?.team?.id ?? raw?.team?.id ?? "");
    const x = Number(play?.fieldPositionX ?? raw?.fieldPositionX);
    const y = Number(play?.fieldPositionY ?? raw?.fieldPositionY);
    const hasPoint = Number.isFinite(x) && Number.isFinite(y) && !(x === 0 && y === 0);
    const period = Number(play?.period?.number ?? raw?.period?.number);
    return {
      key: String(raw?.sequence ?? play?.id ?? index) + ":" + text.slice(0, 20),
      order: Number.isFinite(sequence) ? sequence : minuteNumber(minute) * 1000 + index,
      minute,
      period: Number.isFinite(period) ? period : 0,
      text,
      kind: classify(typeText, text),
      side: teamId ? (teamId === homeId ? "home" : "away") : "",
      x: hasPoint ? x : null,
      y: hasPoint ? y : null
    };
  }).filter((entry) => entry.text);
  return entries.sort((a, b) => a.order - b.order);
}

function periodLabel(period: number) {
  if (period === 1) return "First half";
  if (period === 2) return "Second half";
  if (period === 3) return "Extra time · first half";
  if (period === 4) return "Extra time · second half";
  if (period === 5) return "Penalty shootout";
  return "";
}

function Tracker({ points, homeName, awayName }: { points: Entry[]; homeName: string; awayName: string }) {
  const recent = points.slice(0, 6).reverse(); // oldest first, newest drawn on top
  const place = (entry: Entry) => {
    const away = entry.side === "away";
    const px = away ? 100 - (entry.x as number) : (entry.x as number);
    const py = away ? 100 - (entry.y as number) : (entry.y as number);
    return { cx: Math.max(1.5, Math.min(103.5, (px / 100) * 105)), cy: Math.max(1.5, Math.min(66.5, (py / 100) * 68)) };
  };
  const newest = recent[recent.length - 1];
  return <div style={{ marginBottom: 14, background: "#0f151a", border: "1px solid #26343d", borderRadius: 10, padding: 10 }}>
    <svg viewBox="0 0 105 68" style={{ width: "100%", display: "block", background: "#141b21", borderRadius: 8 }} role="img" aria-label="Where the latest events happened">
      <g fill="none" stroke="#3b444b" strokeWidth="0.5">
        <rect x="0.5" y="0.5" width="104" height="67" />
        <line x1="52.5" y1="0.5" x2="52.5" y2="67.5" />
        <circle cx="52.5" cy="34" r="9.15" />
        <rect x="0.5" y="13.85" width="16.5" height="40.3" />
        <rect x="88" y="13.85" width="16.5" height="40.3" />
        <rect x="0.5" y="24.85" width="5.5" height="18.3" />
        <rect x="99" y="24.85" width="5.5" height="18.3" />
      </g>
      {recent.map((entry, index) => {
        const { cx, cy } = place(entry);
        const color = entry.side === "home" ? HOME_COLOR : entry.side === "away" ? AWAY_COLOR : "#b5f34a";
        const isNewest = index === recent.length - 1;
        return <circle key={entry.key} cx={cx} cy={cy} r={isNewest ? 2.6 : 1.6} fill={color} opacity={isNewest ? 1 : 0.25 + 0.5 * (index / Math.max(1, recent.length - 1))} stroke="#fff" strokeWidth={isNewest ? 0.6 : 0}>
          {isNewest && <animate attributeName="r" values="2.6;4.4;2.6" dur="1.4s" repeatCount="indefinite" />}
        </circle>;
      })}
    </svg>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 8, fontSize: 11, color: "#91a0aa", flexWrap: "wrap" }}>
      <span><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: HOME_COLOR, marginRight: 5 }} />{homeName}</span>
      <span><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: AWAY_COLOR, marginRight: 5 }} />{awayName}</span>
    </div>
    {newest && <p style={{ margin: "8px 0 0", fontSize: 12, color: "#e8edf1", lineHeight: 1.4 }}><b style={{ color: "#b5f34a" }}>{newest.minute}</b> {ICON[newest.kind]} {newest.text}</p>}
    <p style={{ margin: "6px 0 0", fontSize: 10, color: "#6f7f8b" }}>Positions are approximate and come from the match data feed.</p>
  </div>;
}

export default function LiveCommentary({ commentary, plays, keyEvents, homeId, homeName, awayName, live }: {
  commentary: any[]; plays: any[]; keyEvents: any[]; homeId: string; homeName: string; awayName: string; live: boolean;
}) {
  const [mode, setMode] = useState<"all" | "key">("all");
  const entries = useMemo(() => buildEntries(commentary, plays, keyEvents, homeId), [commentary, plays, keyEvents, homeId]);
  const shown = useMemo(() => [...entries].reverse().filter((entry) => mode === "all" || KEY_KINDS.has(entry.kind)), [entries, mode]);
  const points = useMemo(() => [...entries].reverse().filter((entry) => entry.x !== null && entry.y !== null), [entries]);
  const listenItems = useMemo(() => entries.map((entry) => ({ sequence: entry.order, text: entry.text, time: { displayValue: entry.minute } })), [entries]);

  if (!entries.length) {
    return <p className="mc-empty">Commentary has not been published for this match yet. It appears once the match starts.</p>;
  }

  return <>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
      <div style={{ display: "flex", gap: 8 }}>
        {([["all", "All"], ["key", "Key events"]] as const).map(([value, text]) => (
          <button key={value} onClick={() => setMode(value)} style={{ border: 0, cursor: "pointer", borderRadius: 18, padding: "7px 14px", fontSize: 12.5, fontWeight: 700, background: mode === value ? "#e9edf0" : "#0b1015", color: mode === value ? "#111" : "#e8edf1" }}>{text}</button>
        ))}
      </div>
      {live && <span style={{ fontSize: 11, fontWeight: 800, color: "#ff4d4f" }}><i className="mc-dot" />LIVE · updates every 20 seconds</span>}
    </div>

    {points.length > 0 && <Tracker points={points} homeName={homeName} awayName={awayName} />}

    <ListenLive items={listenItems} live={live} />

    <div>
      {shown.map((entry, index) => {
        const previous = shown[index - 1];
        const showDivider = entry.period > 0 && (!previous || previous.period !== entry.period) && periodLabel(entry.period);
        const big = entry.kind === "goal" || entry.kind === "red" || entry.kind === "var";
        const barColor = entry.side === "home" ? HOME_COLOR : entry.side === "away" ? AWAY_COLOR : "#2a3944";
        return <div key={entry.key + index}>
          {showDivider && <div style={{ margin: "14px 0 6px", fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "#91a0aa" }}>{periodLabel(entry.period)}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "52px 1fr", gap: 10, padding: "10px 10px", borderLeft: "3px solid " + barColor, borderBottom: "1px solid #1d2a33", background: big ? "rgba(181,243,74,.07)" : "transparent" }}>
            <span style={{ alignSelf: "start", textAlign: "center", fontSize: 11.5, fontWeight: 800, padding: "3px 0", borderRadius: 6, background: "#18232c", color: "#b5f34a" }}>{entry.minute || "–"}</span>
            <p style={{ margin: 0, fontSize: big ? 13.5 : 12.5, lineHeight: 1.5, fontWeight: big ? 800 : 500, color: "#e8edf1" }}>
              <span style={{ marginRight: 6 }}>{ICON[entry.kind]}</span>{entry.text}
            </p>
          </div>
        </div>;
      })}
      {!shown.length && <p className="mc-muted">No key events yet.</p>}
    </div>
  </>;
}
