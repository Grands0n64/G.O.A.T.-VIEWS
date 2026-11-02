"use client";

import { useEffect, useRef, useState } from "react";

type Video = { id?: string; title: string; src: string; thumbnail?: string; competition?: string; date?: string };
type Scope = "match" | "league" | "any";

let apiPromise: Promise<any> | null = null;
function loadYouTubeApi(): Promise<any> {
  const w = window as any;
  if (w.YT?.Player) return Promise.resolve(w.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const previous = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => { if (typeof previous === "function") previous(); resolve(w.YT); };
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    });
  }
  return apiPromise;
}

const videoIdOf = (video: Video) => video.id ?? /\/embed\/([\w-]{6,})/.exec(video.src)?.[1] ?? "";

// plays the video and tells us if YouTube blocks it, so we can show our own message
function Player({ videoId, title, onBlocked }: { videoId: string; title: string; onBlocked: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let player: any;
    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !box.current) return;
      const target = document.createElement("div");
      box.current.innerHTML = "";
      box.current.appendChild(target);
      player = new YT.Player(target, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: { autoplay: 1, rel: 0, playsinline: 1, origin: window.location.origin },
        events: { onError: () => onBlocked() }
      });
    });
    return () => { cancelled = true; try { player?.destroy(); } catch { /* already gone */ } };
  }, [videoId]);
  return <div ref={box} aria-label={title} style={{ position: "absolute", inset: 0 }} />;
}

export default function Highlights({ home, away, league }: { home: string; away: string; league: string }) {
  const [state, setState] = useState<{ videos: Video[]; scope: Scope; configured: boolean } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    setState(null); setOpen(null); setBlocked([]);
    const query = "home=" + encodeURIComponent(home) + "&away=" + encodeURIComponent(away) + "&league=" + encodeURIComponent(league);
    fetch("/api/highlights?" + query, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (active) setState({ videos: d.videos ?? [], scope: (d.scope as Scope) ?? "league", configured: d.configured !== false }); })
      .catch(() => { if (active) setState({ videos: [], scope: "league", configured: true }); });
    return () => { active = false; };
  }, [home, away, league]);

  if (!state || !state.configured || state.videos.length === 0) return null;

  const heading = state.scope === "match" ? "Match highlights" : "Latest " + league + " highlights";

  return <section className="mc-section">
    <h3>🎬 {heading}</h3>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
      {state.videos.map((video) => {
        const id = videoIdOf(video);
        const isBlocked = blocked.includes(id);
        return <div key={id} style={{ background: "#121d26", border: "1px solid #293640", borderRadius: 10, overflow: "hidden" }}>
          {isBlocked
            ? <div style={{ padding: "28px 14px", textAlign: "center", fontSize: 12, lineHeight: 1.5, color: "#91a0aa", background: "#18232c" }}>This video isn't available in your country, so we can't play it here. Try another one.</div>
            : open === id
              ? <div style={{ position: "relative", paddingTop: "56.25%", background: "#000" }}>
                <Player videoId={id} title={video.title} onBlocked={() => setBlocked((list) => (list.includes(id) ? list : [...list, id]))} />
              </div>
              : <button onClick={() => setOpen(id)} aria-label={"Play " + video.title}
                style={{ position: "relative", display: "block", width: "100%", paddingTop: "56.25%", border: 0, cursor: "pointer", background: video.thumbnail ? `center / cover no-repeat url(${video.thumbnail})` : "#18232c" }}>
                <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(0,0,0,.35)", fontSize: 34, color: "#fff" }}>▶</span>
              </button>}
          <div style={{ padding: "9px 12px" }}>
            <b style={{ fontSize: 12.5, color: "#f2f6f8" }}>{video.title}</b>
          </div>
        </div>;
      })}
    </div>
    <p className="mc-muted" style={{ marginTop: 10 }}>Highlights from the league's official YouTube channel. Some videos are limited to certain countries.</p>
  </section>;
}
