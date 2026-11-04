import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import MatchPageClient from "../../../components/MatchPageClient";
import { leagueFromSlug, slugify } from "../../../slug";
import { SITE_NAME, SITE_URL } from "../../../siteConfig";

export const revalidate = 60;

type Params = { league: string; match: string };
type Facts = {
  home: string; away: string; homeScore: number | null; awayScore: number | null;
  status: string; state: string; venue: string | null; date: string | null;
};

const SR_ONLY: CSSProperties = { position: "absolute", width: 1, height: 1, margin: -1, padding: 0, overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", border: 0 };

async function load(params: Params) {
  const league = leagueFromSlug(params.league);
  const id = params.match.split("-")[0];
  if (!league || !/^\d+$/.test(id)) return null;
  try {
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${league.path}/summary?event=${encodeURIComponent(id)}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 }
    });
    if (!res.ok) return { league, id, facts: null as Facts | null };
    const data = await res.json();
    const competition = data?.header?.competitions?.[0];
    const competitors: any[] = competition?.competitors ?? [];
    const home = competitors.find((c) => c.homeAway === "home") ?? competitors[0];
    const away = competitors.find((c) => c.homeAway === "away") ?? competitors[1];
    if (!home || !away) return { league, id, facts: null as Facts | null };
    const toScore = (v: any) => (v === undefined || v === null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
    const facts: Facts = {
      home: String(home.team?.displayName ?? home.team?.name ?? "Home"),
      away: String(away.team?.displayName ?? away.team?.name ?? "Away"),
      homeScore: toScore(home.score),
      awayScore: toScore(away.score),
      status: String(competition?.status?.type?.shortDetail ?? competition?.status?.type?.detail ?? ""),
      state: String(competition?.status?.type?.state ?? "pre"),
      venue: competition?.venue?.fullName ?? null,
      date: competition?.date ?? null
    };
    return { league, id, facts };
  } catch {
    return { league, id, facts: null as Facts | null };
  }
}

const dateText = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const info = await load(await params);
  if (!info) return { title: "Match not found", robots: { index: false } };
  const { league, id, facts } = info;
  if (!facts) return { title: `Match details – ${league.league} | ${SITE_NAME}` };

  const finished = facts.state === "post" && facts.homeScore !== null && facts.awayScore !== null;
  const title = finished
    ? `${facts.home} ${facts.homeScore}-${facts.awayScore} ${facts.away} – ${league.league} lineups, stats & highlights`
    : `${facts.home} vs ${facts.away} – ${league.league} live score, lineups & stats`;
  const when = dateText(facts.date);
  const description = finished
    ? `${facts.home} ${facts.homeScore}-${facts.awayScore} ${facts.away} in the ${league.league}${when ? " on " + when : ""}. Lineups, player ratings, stats, commentary, highlights and where to watch.`
    : `${facts.home} vs ${facts.away} in the ${league.league}${when ? " on " + when : ""}. Live score, lineups, player ratings, stats, commentary and where to watch.`;
  const canonical = `${SITE_URL}/match/${slugify(league.league)}/${id}-${slugify(facts.home)}-vs-${slugify(facts.away)}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, siteName: SITE_NAME, type: "website" },
    twitter: { card: "summary", title, description }
  };
}

export default async function MatchPage({ params }: { params: Promise<Params> }) {
  const resolved = await params;
  const info = await load(resolved);
  if (!info) notFound();
  const { league, id, facts } = info;

  if (facts) {
    const canonicalMatch = `${id}-${slugify(facts.home)}-vs-${slugify(facts.away)}`;
    if (resolved.match !== canonicalMatch) permanentRedirect(`/match/${slugify(league.league)}/${canonicalMatch}`);
  }

  const finished = !!facts && facts.state === "post" && facts.homeScore !== null && facts.awayScore !== null;
  const jsonLd = facts ? {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${facts.home} vs ${facts.away}`,
    sport: league.sport,
    startDate: facts.date ?? undefined,
    location: facts.venue ? { "@type": "Place", name: facts.venue } : undefined,
    homeTeam: { "@type": "SportsTeam", name: facts.home },
    awayTeam: { "@type": "SportsTeam", name: facts.away },
    url: `${SITE_URL}/match/${slugify(league.league)}/${id}-${slugify(facts.home)}-vs-${slugify(facts.away)}`
  } : null;

  return <>
    {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
    {/* readable page text for search engines and screen readers; the full match screen loads on top of it */}
    <div style={SR_ONLY}>
      <h1>{facts ? `${facts.home} vs ${facts.away}` : `${league.league} match`} – {league.league}</h1>
      {facts && <p>
        {facts.home} vs {facts.away} is a {league.league} match{dateText(facts.date) ? " on " + dateText(facts.date) : ""}
        {facts.venue ? " at " + facts.venue : ""}. {finished ? `Final score: ${facts.home} ${facts.homeScore}, ${facts.away} ${facts.awayScore}.` : facts.status ? `Status: ${facts.status}.` : ""}
        {" "}{SITE_NAME} shows lineups, player ratings, team statistics, live commentary, team form, official highlights and where to watch.
      </p>}
      <Link href="/">All matches</Link>
    </div>
    <MatchPageClient
      id={id}
      league={league.league}
      home={facts?.home ?? "Home"}
      away={facts?.away ?? "Away"}
      homeScore={facts?.homeScore ?? null}
      awayScore={facts?.awayScore ?? null}
      status={facts?.status ?? ""}
      venue={facts?.venue ?? null}
    />
  </>;
}
