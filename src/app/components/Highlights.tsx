"use client";

import { useEffect, useState } from "react";

type Video = { title: string; src: string; thumbnail?: string; competition?: string; date?: string };
type Scope = "match" | "league" | "any";

export default function Highlights({ home, away, league }: { home: string; away: string; league: string }) {
  const [state, setState] = useState<{ videos: Video[]; scope: Scope; configured: boolean } | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setState(null); setOpen(null);
    const query = "home=" + encodeURIComponent(home) + "&away=" + encodeURIComponent(away) + "&league=" + encodeURIComponent(league);
    fetch("/api/highlights?" + query, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (active) setState({ videos: d.videos ?? [], scope: (d.scope as Scope) ?? "league", configured: d.configured !== false }); })
      .catch(() => { if (active) setState({ videos: [], scope: "league", configured: true }); });
    return () => { active = false; };
  }, [home, away, league]);

  if (!state || !state.configured) return null;

  const heading = state.scope === "match" ? "Match highlights" : state.scope === "league" ? "Latest " + league + " highlights" : "Latest football highlights";

  return <section className="mc-section">
    <h3>🎬 {heading}</h3>
    {state.videos.length === 0
      ? <p className="mc-empty">No official highlights for this match yet. They usually appear soon after full time.</p>
      : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {state.videos.map((video) => (
          <div key={video.src} style={{ background: "#121d26", border: "1px solid #293640", borderRadius: 10, overflow: "hidden" }}>
            {open === video.src
              ? <div style={{ position: "relative", paddingTop: "56.25%", background: "#000" }}>
                <iframe src={video.src} title={video.title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen loading="lazy"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} />
              </div>
              : <button onClick={() => setOpen(video.src)} aria-label={"Play " + video.title}
                style={{ position: "relative", display: "block", width: "100%", paddingTop: "56.25%", border: 0, cursor: "pointer", background: video.thumbnail ? `center / cover no-repeat url(${video.thumbnail})` : "#18232c" }}>
                <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(0,0,0,.35)", fontSize: 34, color: "#fff" }}>▶</span>
              </button>}
            <div style={{ padding: "9px 12px" }}>
              <b style={{ fontSize: 12.5, color: "#f2f6f8" }}>{video.title}</b>
              {video.competition && <div style={{ fontSize: 10.5, color: "#91a0aa", marginTop: 2 }}>{video.competition}</div>}
            </div>
          </div>
        ))}
      </div>}
    <p className="mc-muted" style={{ marginTop: 10 }}>Official highlights embedded through ScoreBat. Videos may show ads.</p>
  </section>;
}
