"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Line = { key: string; minute: string; text: string };

function say(line: Line) {
  const utterance = new SpeechSynthesisUtterance((line.minute ? "Minute " + line.minute + ". " : "") + line.text);
  utterance.lang = "en-GB";
  utterance.rate = 1.05;
  window.speechSynthesis.speak(utterance);
}

export default function ListenLive({ items, live }: { items: any[]; live: boolean }) {
  const [on, setOn] = useState(false);
  const [supported, setSupported] = useState(true);
  const spoken = useRef<Set<string>>(new Set());

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => { try { window.speechSynthesis?.cancel(); } catch { /* nothing playing */ } };
  }, []);

  const lines = useMemo<Line[]>(() => {
    const allHaveSequence = items.length > 0 && items.every((item) => Number.isFinite(Number(item?.sequence)));
    const ordered = allHaveSequence ? [...items].sort((a, b) => Number(a.sequence) - Number(b.sequence)) : items;
    return ordered
      .map((item, index) => {
        const text = String(item?.text ?? item?.description ?? item?.shortText ?? "").replace(/\s+/g, " ").trim();
        const minute = String(item?.time?.displayValue ?? item?.clock?.displayValue ?? "").replace(/'/g, "").trim();
        return { key: String(item?.sequence ?? item?.id ?? index) + ":" + text.slice(0, 24), minute, text };
      })
      .filter((line) => line.text);
  }, [items]);

  // new lines that arrive while listening are read out
  useEffect(() => {
    if (!on) return;
    const fresh = lines.filter((line) => !spoken.current.has(line.key));
    if (!fresh.length) return;
    fresh.forEach((line) => spoken.current.add(line.key));
    if (fresh.length > 3) window.speechSynthesis.cancel();
    fresh.slice(-4).forEach(say);
  }, [on, lines]);

  if (!supported || !lines.length) return null;

  const toggle = () => {
    if (on) {
      window.speechSynthesis.cancel();
      spoken.current.clear();
      setOn(false);
      return;
    }
    // start inside the tap so phones allow the sound
    lines.forEach((line) => spoken.current.add(line.key));
    window.speechSynthesis.cancel();
    (live ? lines.slice(-1) : lines.slice(-8)).forEach(say);
    setOn(true);
  };

  return <div style={{ margin: "0 0 14px" }}>
    <button onClick={toggle} style={{ border: "1px solid #2c3b46", cursor: "pointer", borderRadius: 9, padding: "10px 14px", background: on ? "#26352b" : "#18232c", color: on ? "#b5f34a" : "#f2f6f8", fontSize: 13, fontWeight: 800 }}>
      {on ? "⏹ Stop audio" : live ? "🔊 Listen to live commentary" : "🔊 Listen to the match story"}
    </button>
    <p style={{ margin: "6px 0 0", fontSize: 10.5, color: "#91a0aa" }}>A computer voice reads the text commentary out loud. It is not a real commentator.</p>
  </div>;
}
