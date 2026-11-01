"use client";

import { useEffect, useState } from "react";
import { AFFILIATE, BROADCASTERS, COUNTRIES, type CountryCode } from "../broadcasters";

function providerNames(broadcasts: any): string[] {
  const out = new Set<string>();
  for (const b of Array.isArray(broadcasts) ? broadcasts : []) {
    const names: any[] = Array.isArray(b?.names) ? b.names : [b?.media?.shortName ?? b?.shortName ?? b?.name];
    names.forEach((n) => { if (typeof n === "string" && n.trim()) out.add(n.trim()); });
  }
  return Array.from(out);
}

function guessFromLocale(): CountryCode {
  const region = (typeof navigator !== "undefined" ? navigator.language : "").split("-")[1]?.toUpperCase();
  return COUNTRIES.find((c) => c.code === region)?.code ?? "US";
}

export default function WhereToWatch({ league, broadcasts }: { league: string; broadcasts?: any }) {
  const [country, setCountry] = useState<CountryCode>("US");

  useEffect(() => {
    let active = true;
    fetch("/api/geo", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        const found = COUNTRIES.find((c) => c.code === String(d?.country ?? "").toUpperCase());
        setCountry(found ? found.code : guessFromLocale());
      })
      .catch(() => active && setCountry(guessFromLocale()));
    return () => { active = false; };
  }, []);

  const items = BROADCASTERS[league]?.[country] ?? [];
  const listed = providerNames(broadcasts);
  const countryName = COUNTRIES.find((c) => c.code === country)?.name ?? "";
  const hasAffiliate = items.some((item) => AFFILIATE[item.name]);

  return <section style={{ padding: "14px 20px", borderBottom: "1px solid #293640", background: "#0f1a22" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
      <b style={{ fontSize: 13, color: "#f2f6f8" }}>📺 Where to watch</b>
      <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
        {COUNTRIES.map((c) => (
          <button key={c.code} onClick={() => setCountry(c.code)} style={{ border: 0, cursor: "pointer", whiteSpace: "nowrap", borderRadius: 14, padding: "5px 10px", fontSize: 11.5, fontWeight: 700, background: country === c.code ? "#e9edf0" : "#18232c", color: country === c.code ? "#111" : "#cfd8de" }}>{c.flag} {c.name}</button>
        ))}
      </div>
    </div>

    {items.length > 0 ? <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
      {items.map((item) => (
        <a key={item.name} href={AFFILIATE[item.name] ?? item.url} target="_blank" rel="sponsored noopener noreferrer"
          style={{ display: "grid", gap: 2, minWidth: 120, maxWidth: 220, padding: "9px 12px", borderRadius: 9, background: "#18232c", border: "1px solid #2c3b46", textDecoration: "none", color: "#f2f6f8" }}>
          <span style={{ fontSize: 13, fontWeight: 800 }}>{item.name}{item.free && <span style={{ marginLeft: 6, fontSize: 10, color: "#b5f34a" }}>FREE</span>}</span>
          {item.note && <span style={{ fontSize: 10.5, color: "#91a0aa", lineHeight: 1.35 }}>{item.note}</span>}
        </a>
      ))}
    </div> : <p style={{ margin: "10px 0 0", fontSize: 11.5, color: "#91a0aa" }}>We don't have broadcaster details for {league} in {countryName} yet.</p>}

    {listed.length > 0 && <p style={{ margin: "10px 0 0", fontSize: 11, color: "#91a0aa" }}>Listed by the data provider for this match: {listed.join(", ")}</p>}
    <p style={{ margin: "8px 0 0", fontSize: 10, color: "#6f7f8b", lineHeight: 1.5 }}>
      Broadcasters change each season, and not every match is shown on every service. Links go to the official services.{hasAffiliate ? " We may earn a commission if you sign up through these links." : ""}
    </p>
  </section>;
}
