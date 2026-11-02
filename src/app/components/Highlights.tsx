"use client";

import { useEffect, useState } from "react";

type Video = {
  id: string;
  title: string;
  src: string;
  thumbnail?: string;
  competition?: string;
  date?: string;
  source?: string;
  channel?: string;
  category?: string;
};
type Scope = "match" | "round" | "league";

export default function Highlights({ home, away, league, date }: { home: string; away: string; league: string; date?: string }) {
  const [state, setState] = useState<{ videos: Video[]; scope: Scope; configured: boolean } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    setState(null); setOpen(null); setFailed([]); setNotice("");
    const query = "home=" + encodeURIComponent(home) + "&away=" + encodeURIComponent(away) + "&league=" + encodeURIComponent(league) + (date ? "&date=" + encodeURIComponent(date) : "");
    fetch("/api/highlights?" + query, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (active) {
          setState({ videos: d.videos ?? [], scope: (d.scope as Scope) ?? "league", configured: d.configured !== false });
          if (d.error) setNotice(d.error);
        }
      })
      .catch(() => { if (active) { setState({ videos: [], scope: "league", configured: true }); setNotice("Highlights could not be loaded. Please try again."); } });
    return () => { active = false; };
  }, [home, away, league, date]);

  if (!state || !state.configured) return null;
  const videos = state.videos;
  const heading = state.scope === "match" ? "Match highlights" : state.scope === "round" ? "Matchday highlights" : "Latest " + league + " highlights";

  return <section className="mc-section">
    <h3>🎬 {heading}</h3>
    {notice && <p className="mc-muted" style={{ marginBottom: 10, color: "#e8872a" }}>{notice}</p>}
    {videos.length === 0 ? (
      <p className="mc-muted">No playable embedded highlights were returned for this competition right now. Check back for new uploads.</p>
    ) : (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {videos.map((video) => (
          <div key={video.id} style={{ background: "#121d26", border: "1px solid #293640", borderRadius: 10, overflow: "hidden" }}>
            {failed.includes(video.id)
              ? <div style={{ position: "relative", minHeight: 150, display: "grid", placeItems: "center", padding: 16, background: "#080d12", color: "#fff", textAlign: "center" }}>This publisher does not allow playback here, or the video is unavailable in your region.</div>
              : open === video.id
              ? <div style={{ position: "relative", paddingTop: "56.25%", background: "#000" }}>
                  <iframe
                    src={video.src}
                    title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    onError={() => setFailed((list) => list.includes(video.id) ? list : [...list, video.id])}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
                  />
                </div>
              : <button onClick={() => setOpen(video.id)} aria-label={"Play " + video.title}
                  style={{ position: "relative", display: "block", width: "100%", paddingTop: "56.25%", border: 0, cursor: "pointer", background: video.thumbnail ? `center / cover no-repeat url(${video.thumbnail})` : "#18232c" }}>
                  <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(0,0,0,.35)", fontSize: 34, color: "#fff" }}>▶</span>
                </button>}
            <div style={{ padding: "9px 12px" }}>
              <b style={{ display: "block", fontSize: 12.5, color: "#f2f6f8" }}>{video.title}</b>
              {(video.source || video.channel) && <span style={{ display: "block", marginTop: 4, fontSize: 11, color: "#91a3af" }}>Source: {video.channel || video.source}</span>}
            </div>
          </div>
        ))}
      </div>
    )}
    <p className="mc-muted" style={{ marginTop: 10 }}>Highlights are provided by Highlightly. Playback depends on the original publisher's embedding permissions and regional availability.</p>
  </section>;
}
