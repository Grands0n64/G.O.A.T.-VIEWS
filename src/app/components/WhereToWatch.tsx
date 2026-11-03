"use client";

import { useEffect, useState } from "react";
import { AFFILIATE, BROADCASTERS, COUNTRIES, type CountryCode } from "../broadcasters";
import YouTubePlayer from "./YouTubePlayer";

type LiveVideo = { id: string; title: string; channel: string };

function guessFromLocale(): CountryCode | null {
  const region = (typeof navigator !== "undefined" ? navigator.language : "").split("-")[1]?.toUpperCase();
  return COUNTRIES.find((c) => c.code === region)?.code ?? null;
}

export default function WhereToWatch({ league, home, away, live }: { league: string; home?: string; away?: string; live?: boolean }) {
  const [country, setCountry] = useState<CountryCode | null>(null);
  const [streams, setStreams] = useState<LiveVideo[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/geo", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        const detected = String(d?.country ?? "").toUpperCase();
        const valid = COUNTRIES.some((c) => c.code === detected) ? detected : guessFromLocale();
        setCountry(valid);
      })
      .catch(() => { if (active) setCountry(guessFromLocale()); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!live || !home || !away) { setStreams([]); return; }
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = () => {
      const query = "league=" + encodeURIComponent(league) + "&home=" + encodeURIComponent(home) + "&away=" + encodeURIComponent(away) + "&live=1";
      fetch("/api/live-streams?" + query, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => { if (active) setStreams(d.videos ?? []); })
        .catch(() => {})
        .finally(() => { if (active) timer = setTimeout(run, 60000); });
    };
    run();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [league, home, away, live]);

  const items = country ? (BROADCASTERS[league]?.[country] ?? []) : [];
  const available = streams.filter((s) => !failed.includes(s.id));
  const countryName = COUNTRIES.find((c) => c.code === country)?.name ?? country ?? "";
  const hasAffiliate = items.some((item) => AFFILIATE[item.name]);

  return <section style={{ padding: "14px 20px", borderBottom: "1px solid #293640", background: "#0f1a22" }}>
    {available.length > 0 && <div style={{ marginBottom: 16 }}>
      <b style={{ fontSize: 13, color: "#f2f6f8" }}>🔴 Live now on the official YouTube channel</b>
      {notice && <p style={{ margin: "6px 0 0", fontSize: 11, color: "#e8872a" }}>{notice}</p>}
      {available.map((stream) => (
        <div key={stream.id} style={{ marginTop: 8 }}>
          {playing === stream.id
            ? <div style={{ position: "relative", paddingTop: "56.25%", background: "#000", borderRadius: 9, overflow: "hidden" }}>
              <YouTubePlayer videoId={stream.id} title={stream.title} onFailed={() => {
                setFailed((list) => (list.includes(stream.id) ? list : [...list, stream.id]));
                setPlaying(null);
                setNotice("That stream couldn't be played here. The owner may not allow it on other websites or in your country.");
              }} />
            </div>
            : <button onClick={() => setPlaying(stream.id)} style={{ width: "100%", border: "1px solid #2c3b46", cursor: "pointer", borderRadius: 9, padding: "12px 14px", background: "#18232c", color: "#f2f6f8", fontSize: 13, fontWeight: 800, textAlign: "left" }}>▶ Watch live · {stream.channel}</button>}
          <p style={{ margin: "6px 0 0", fontSize: 10.5, color: "#91a0aa" }}>{stream.title}</p>
        </div>
      ))}
    </div>}

    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
      <div>
        <b style={{ display: "block", fontSize: 13, color: "#f2f6f8" }}>📺 Where to watch</b>
        <small style={{ color: "#91a0aa", fontSize: 10.5 }}>{country ? "Showing broadcaster options for " + countryName : "Detecting your country…"}</small>
      </div>
      <select aria-label="Choose your country" value={country ?? ""} onChange={(e) => setCountry(e.target.value || null)}
        style={{ maxWidth: 250, border: "1px solid #40515d", borderRadius: 8, padding: "8px 10px", background: "#18232c", color: "#f2f6f8", fontSize: 12, fontWeight: 700 }}>
        <option value="">Select country</option>
        {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
      </select>
    </div>

    {!country ? <p style={{ margin: "10px 0 0", fontSize: 11.5, color: "#91a0aa" }}>We couldn't detect your country automatically. Choose it above to see local broadcaster information.</p>
      : items.length > 0 ? <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {items.map((item) => (
          <a key={item.name} href={AFFILIATE[item.name] ?? item.url} target="_blank" rel="sponsored noopener noreferrer"
            style={{ display: "grid", gap: 2, minWidth: 120, maxWidth: 220, padding: "9px 12px", borderRadius: 9, background: "#18232c", border: "1px solid #2c3b46", textDecoration: "none", color: "#f2f6f8" }}>
            <span style={{ fontSize: 13, fontWeight: 800 }}>{item.name}{item.free && <span style={{ marginLeft: 6, fontSize: 10, color: "#b5f34a" }}>FREE</span>}</span>
            {item.note && <span style={{ fontSize: 10.5, color: "#91a0aa", lineHeight: 1.35 }}>{item.note}</span>}
          </a>
        ))}
      </div> : <p style={{ margin: "10px 0 0", fontSize: 11.5, color: "#91a0aa" }}>No broadcaster entry is currently listed for {league} in {countryName}. We won't invent a stream; check the competition's official broadcaster listings.</p>}

    {hasAffiliate && <p style={{ margin: "8px 0 0", fontSize: 10, color: "#6f7f8b", lineHeight: 1.5 }}>We may earn a commission if you sign up through these links.</p>}
  </section>;
}
