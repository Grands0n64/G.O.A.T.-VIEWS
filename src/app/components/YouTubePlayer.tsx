"use client";

import { useEffect, useRef } from "react";

function loadYouTubeApi(): Promise<any> {
  const w = window as any;
  if (w.YT?.Player) return Promise.resolve(w.YT);
  if (!w.__goatYtApi) {
    w.__goatYtApi = new Promise((resolve) => {
      const previous = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => { if (typeof previous === "function") previous(); resolve(w.YT); };
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    });
  }
  return w.__goatYtApi;
}

// plays the video inside your site and reports if YouTube blocks it
export default function YouTubePlayer({ videoId, title, onFailed }: { videoId: string; title: string; onFailed: (code: number) => void }) {
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
