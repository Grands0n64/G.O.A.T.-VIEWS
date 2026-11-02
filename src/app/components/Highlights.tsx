"use client";

import { useEffect, useRef, useState } from "react";

type Video = { id?: string; title: string; src: string; thumbnail?: string; competition?: string; date?: string };
type Scope = "match" | "round" | "league";

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

// plays the video and reports why it could not play, so we can show our own message
function Player({ videoId, title, onFailed }: { videoId: string; title: string; onFailed: (code: number) => void }) {
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
        events: { onError: (event: any) => onFailed(Number(event?.data)) }
      });
    });
    return () => { cancelled = true; try { player?.destroy(); } catch { /* already gone */ } };
  }, [videoId]);
  return <div ref={box} aria-label={title} style={{ position: "absolute", inset: 0 }} />;
}

function reasonFor(code: number) {
  if (code === 101 || code === 150) return "The owner doesn't allow that video to play on other websites.";
  if (code === 100) return "That video is no longer available, or it is restricted in your country.";
  return "That video couldn't be played.";
}

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
      .then((d) => { if (active) setState({ videos: d.videos ?? [], scope: (d.scope as Scope) ?? "league", configured: d.configured !== false }); })
      .catch(() => { if (active) setState({ videos: [], scope: "league", configured: true }); });
    return () => { active = false; };
  }, [home, away, league, date]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 7000);
    return () => clearTimeout(timer);
  }, [notice]);

  if (!state || !state.configured) return null;
  const videos = state.videos;
  if (videos.length === 0) return <section className="mc-section">
    <h3>🎬 Latest {league} highlights</h3>
    <p className="mc-muted">No playable official highlights were returned for this competition right now. Check back for new uploads.</p>
  </section>;

  const heading = state.scope === "match" ? "Match highlights" : state.scope === "round" ? "Matchday highlights" : "Latest " + league + " highlights";

  return <section className="mc-section">
    <h3>🎬 {heading}</h3>
    {notice && <p className="mc-muted" style={{ marginBottom: 10, color: "#e8872a" }}>{notice}</p>}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
      {videos.map((video) => {
        const id = videoIdOf(video);
        return <div key={id} style={{ background: "#121d26", border: "1px solid #293640", borderRadius: 10, overflow: "hidden" }}>
          {failed.includes(id)
            ? <div style={{ position: "relative", minHeight: 150, display: "grid", placeItems: "center", gap: 8, padding: 16, background: "#080d12", color: "#fff", textAlign: "center" }}><span>This video cannot be embedded here.</span><a href={"https://www.youtube.com/watch?v=" + id} target="_blank" rel="noreferrer" style={{ color: "#8fc7ff", textDecoration: "underline" }}>Watch on YouTube</a></div>
            : open === id
            ? <div style={{ position: "relative", paddingTop: "56.25%", background: "#000" }}>
              <Player
                videoId={id}
                title={video.title}
                onFailed={(code) => {
                  setFailed((list) => (list.includes(id) ? list : [...list, id]));
                  setOpen(null);
                  setNotice(reasonFor(code) + " Use the Watch on YouTube link on this card.");
                }}
              />
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
    <p className="mc-muted" style={{ marginTop: 10 }}>Videos are embedded from their publishing YouTube channels. Some publishers restrict playback on other websites or in certain countries.</p>
  </section>;
}
