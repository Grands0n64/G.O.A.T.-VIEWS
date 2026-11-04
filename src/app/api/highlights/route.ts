import { NextRequest, NextResponse } from "next/server";
import { HIGHLIGHT_CHANNELS, type HighlightSource } from "../../highlightChannels";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const API = "https://www.googleapis.com/youtube/v3";
const UA = "GoatViews/1.0 (football scores site)";
const DAY = 24 * 60 * 60 * 1000;
const STOP = new Set(["fc", "cf", "afc", "sc", "ac", "fk", "sk", "club", "the", "de", "of"]);
const GENERIC = new Set(["united", "city", "town", "albion", "hotspur", "wanderers", "rovers", "county"]);
const AMBIGUOUS = new Set(["manchester", "madrid", "borussia", "athletic", "atletico", "sporting", "olympique", "paris", "united", "city", "real", "inter", "milan", "bayer", "bayern"]);
const HIGHLIGHT = /highlight|resumen|resumo|summary|extended|all goals|best moments/i;
const THROWBACK = /classic|throwback|relive|on this day|best of|history|rewind|years ago/i;
const ROUND = /matchweek|matchday|weekend|round|jornada|giornata|spieltag|journ[eé]e|goals?\b/i;

const tokens = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((t) => t.length >= 2 && !STOP.has(t));

const decodeHtml = (s: string) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

// strict: the team's full name (or its clear core) is in the title
function teamMatches(team: string, titleTokens: Set<string>) {
  const t = tokens(team);
  if (!t.length) return false;
  if (t.every((x) => titleTokens.has(x))) return true;
  const core = t.filter((x) => !GENERIC.has(x));
  if (core.length >= 2 && core.every((x) => titleTokens.has(x))) return true;
  const strong = t.filter((x) => x.length >= 5 && !AMBIGUOUS.has(x)).sort((a, b) => b.length - a.length)[0];
  return !!strong && titleTokens.has(strong);
}

// loose: one distinctive word of the team name is in the title
function teamLoose(team: string, titleTokens: Set<string>) {
  return tokens(team).filter((x) => x.length >= 5 && !AMBIGUOUS.has(x) && !GENERIC.has(x)).some((x) => titleTokens.has(x));
}

const either = (team: string, set: Set<string>) => teamMatches(team, set) || teamLoose(team, set);

async function yt(path: string, params: Record<string, string>, revalidate: number) {
  const res = await fetch(API + path + "?" + new URLSearchParams(params).toString(), { next: { revalidate } });
  if (!res.ok) {
    let reason = "";
    try { reason = String((await res.json())?.error?.message ?? "").slice(0, 140); } catch {}
    throw new Error("YouTube " + path + " returned " + res.status + (reason ? ": " + reason : ""));
  }
  return res.json();
}

async function getJson(url: string, revalidate: number) {
  try {
    const res = await fetch(url, { headers: { "Api-User-Agent": UA, Accept: "application/json" }, next: { revalidate } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// backup way to find a channel ID: Wikipedia -> Wikidata
async function wikidataIds(title: string): Promise<string[]> {
  const page = await getJson("https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&ppprop=wikibase_item&redirects=1&format=json&titles=" + encodeURIComponent(title), 60 * 60 * 24 * 7);
  const first: any = Object.values(page?.query?.pages ?? {})[0];
  const qid = first?.pageprops?.wikibase_item;
  if (!qid) return [];
  const claims = await getJson("https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&property=P2397&entity=" + qid, 60 * 60 * 24 * 7);
  const list: any[] = claims?.claims?.P2397 ?? [];
  return list
    .filter((c) => c.rank !== "deprecated")
    .map((c) => c?.mainsnak?.datavalue?.value)
    .filter((v) => typeof v === "string" && /^UC[\w-]{20,}$/.test(v)) as string[];
}

type Resolved = { channelId: string; title: string; uploads: string };
const resolvedCache = new Map<string, Resolved>();

async function channelInfo(attempt: Record<string, string>, key: string) {
  const json = await yt("/channels", { part: "snippet,contentDetails", key, ...attempt }, 60 * 60 * 24 * 7);
  const item = json?.items?.[0];
  return {
    channelId: String(item?.id ?? ""),
    title: String(item?.snippet?.title ?? ""),
    uploads: String(item?.contentDetails?.relatedPlaylists?.uploads ?? "")
  };
}

async function resolveChannel(src: HighlightSource, key: string, log: any[]): Promise<Resolved | null> {
  const cacheKey = JSON.stringify(src);
  const cached = resolvedCache.get(cacheKey);
  if (cached) return cached;
  const accept = (info: Resolved) => !!info.uploads && info.title.toLowerCase().includes(src.authorHint);

  const attempts: Record<string, string>[] = [];
  if (src.channelId) attempts.push({ id: src.channelId });
  if (src.handle) attempts.push({ forHandle: src.handle });
  if (src.wikipedia) for (const id of await wikidataIds(src.wikipedia)) attempts.push({ id });

  for (const attempt of attempts) {
    try {
      const info = await channelInfo(attempt, key);
      const ok = accept(info);
      log.push({ tried: attempt, channelName: info.title || "(not found)", accepted: ok });
      if (ok) { resolvedCache.set(cacheKey, info); return info; }
    } catch (error) {
      log.push({ tried: attempt, error: error instanceof Error ? error.message : "failed" });
    }
  }

  // last resort: search for the channel by name (costs more, so the result is remembered for 30 days)
  if (src.query) {
    try {
      const found = await yt("/search", { part: "snippet", type: "channel", q: src.query, maxResults: "3", key }, 60 * 60 * 24 * 30);
      for (const hit of found?.items ?? []) {
        const id = String(hit?.id?.channelId ?? hit?.snippet?.channelId ?? "");
        if (!id) continue;
        const info = await channelInfo({ id }, key);
        const ok = accept(info);
        log.push({ searched: src.query, channelName: info.title || "(not found)", accepted: ok });
        if (ok) { resolvedCache.set(cacheKey, info); return info; }
      }
    } catch (error) {
      log.push({ searched: src.query, error: error instanceof Error ? error.message : "failed" });
    }
  }
  return null;
}

type Upload = { id: string; title: string; thumbnail: string; date: string };

async function latestUploads(playlistId: string, key: string): Promise<Upload[]> {
  const out: any[] = [];
  let pageToken = "";
  for (let page = 0; page < 5; page++) {
    const params: Record<string, string> = { part: "snippet", playlistId, maxResults: "50", key };
    if (pageToken) params.pageToken = pageToken;
    const json = await yt("/playlistItems", params, 600);
    out.push(...(json.items ?? []));
    pageToken = json.nextPageToken ?? "";
    if (!pageToken) break;
  }
  return out
    .map((item) => ({
      id: String(item.snippet?.resourceId?.videoId ?? ""),
      title: String(item.snippet?.title ?? ""),
      thumbnail: String(item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url ?? ""),
      date: String(item.snippet?.publishedAt ?? "")
    }))
    .filter((v) => v.id && v.title && !/^(private|deleted) video$/i.test(v.title));
}

// for finished matches that are older than the channel's newest uploads: ask YouTube to search the channel
let searchDay = "";
let searchesToday = 0;
function searchAllowed() {
  const day = new Date().toISOString().slice(0, 10);
  if (day !== searchDay) { searchDay = day; searchesToday = 0; }
  if (searchesToday >= 40) return false;
  searchesToday += 1;
  return true;
}

async function searchOlder(channelId: string, home: string, away: string, kickoff: number, key: string): Promise<Upload[]> {
  if (!searchAllowed()) return [];
  const json = await yt("/search", {
    part: "snippet", channelId, type: "video", order: "date", maxResults: "15", key,
    q: home + " " + away,
    publishedAfter: new Date(kickoff - 0.25 * DAY).toISOString(),
    publishedBefore: new Date(kickoff + 9 * DAY).toISOString()
  }, 60 * 60 * 24 * 7);
  return (json.items ?? [])
    .map((item: any) => ({
      id: String(item.id?.videoId ?? ""),
      title: decodeHtml(String(item.snippet?.title ?? "")),
      thumbnail: String(item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url ?? ""),
      date: String(item.snippet?.publishedAt ?? "")
    }))
    .filter((v: Upload) => v.id && v.title);
}

// public, embeddable and not blocked in the visitor's country
async function videoChecks(ids: string[], key: string, country: string) {
  if (!ids.length) return [];
  const status = await yt("/videos", { part: "status,contentDetails", id: ids.join(","), key }, 600);
  return (status.items ?? []).map((item: any) => {
    const restriction: any = item.contentDetails?.regionRestriction;
    const blockedHere = !!country && (
      (Array.isArray(restriction?.blocked) && restriction.blocked.includes(country)) ||
      (Array.isArray(restriction?.allowed) && !restriction.allowed.includes(country))
    );
    return {
      id: String(item.id),
      embeddable: !!item.status?.embeddable,
      blockedHere,
      usable: !!item.status?.embeddable && item.status?.privacyStatus === "public" && !blockedHere
    };
  });
}

export async function GET(req: NextRequest) {
  const key = process.env.YOUTUBE_API_KEY;
  const home = req.nextUrl.searchParams.get("home") ?? "";
  const away = req.nextUrl.searchParams.get("away") ?? "";
  const league = req.nextUrl.searchParams.get("league") ?? "";
  const kickoff = Date.parse(req.nextUrl.searchParams.get("date") ?? "");
  const hasDate = Number.isFinite(kickoff);
  const debug = !!req.nextUrl.searchParams.get("debug");
  const country = (req.headers.get("x-vercel-ip-country") ?? "").toUpperCase();
  const sources = HIGHLIGHT_CHANNELS[league] ?? (debug ? HIGHLIGHT_CHANNELS["Premier League"] : []);

  if (!key) return NextResponse.json({ configured: false, keyFound: false, videos: [], scope: "league" });
  // hidden when this league has no official channel set up
  if (!sources.length) return NextResponse.json({ configured: false, keyFound: true, videos: [], scope: "league" });

  try {
    const log: any[] = [];
    const raw: Upload[] = [];
    const channelIds: string[] = [];
    for (const src of sources) {
      const channel = await resolveChannel(src, key, log);
      if (channel) {
        if (!channelIds.includes(channel.channelId)) channelIds.push(channel.channelId);
        raw.push(...(await latestUploads(channel.uploads, key)));
      }
    }

    const wantWomen = /women/i.test(league);
    const clean = (list: Upload[]) => {
      const seen = new Set<string>();
      return list.filter((v) => {
        if (seen.has(v.id)) return false;
        seen.add(v.id);
        return HIGHLIGHT.test(v.title) && !THROWBACK.test(v.title) && /women/i.test(v.title) === wantWomen;
      });
    };
    const now = Date.now();

    // videos published shortly after this match (or, with no date, in the last three weeks)
    const within = (v: Upload, before: number, after: number) => {
      const published = Date.parse(v.date);
      if (!Number.isFinite(published)) return false;
      return hasDate ? published >= kickoff - before && published <= kickoff + after : published <= now && now - published <= 21 * DAY;
    };
    const setOf = (v: Upload) => new Set(tokens(v.title));

    const findMatches = (list: Upload[]) => {
      const wide = list.filter((v) => within(v, 0.25 * DAY, 8 * DAY));
      const narrow = list.filter((v) => within(v, 0.25 * DAY, 4 * DAY));
      let found = wide.filter((v) => teamMatches(home, setOf(v)) && teamMatches(away, setOf(v)));
      if (!found.length) found = wide.filter((v) => either(home, setOf(v)) && either(away, setOf(v)));
      if (!found.length && hasDate) found = narrow.filter((v) => either(home, setOf(v)) || either(away, setOf(v)));
      // matchday compilations: the ones published soonest after this match come first
      const round = hasDate
        ? list
            .filter((v) => within(v, 0.25 * DAY, 9 * DAY) && ROUND.test(v.title))
            .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
            .slice(0, 2)
        : [];
      return { found, round };
    };

    let highlightsOnly = clean(raw);
    let { found: matchVideos, round: roundVideos } = findMatches(highlightsOnly);
    let usedSearch = false;

    if (!matchVideos.length && hasDate && home && away && kickoff < now - 2 * DAY) {
      const older: Upload[] = [];
      for (const channelId of channelIds) older.push(...(await searchOlder(channelId, home, away, kickoff, key)));
      usedSearch = true;
      highlightsOnly = clean([...raw, ...older]);
      ({ found: matchVideos, round: roundVideos } = findMatches(highlightsOnly));
    }

    if (debug) {
      const sample = highlightsOnly.slice(0, 8);
      const checks = await videoChecks(sample.map((v) => v.id), key, country);
      return NextResponse.json({
        keyFound: true,
        visitorCountry: country || "(unknown)",
        league: league || "(none, testing Premier League)",
        matchGiven: { home, away, date: hasDate ? new Date(kickoff).toISOString() : "(none)" },
        steps: log,
        uploadsFetched: raw.length,
        highlightVideos: highlightsOnly.length,
        searchedOlderVideos: usedSearch,
        foundForThisMatch: matchVideos.length,
        matchTitles: matchVideos.slice(0, 3).map((v) => v.title),
        matchdayVideos: roundVideos.length,
        matchdayTitles: roundVideos.map((v) => ({ title: v.title, published: v.date })),
        embedCheck: sample.map((v) => {
          const c = checks.find((x: any) => x.id === v.id);
          return { title: v.title, canPlayHere: !!c?.usable, embeddable: c?.embeddable ?? null, blockedInYourCountry: c?.blockedHere ?? null };
        })
      });
    }

    let scope: "match" | "round" | "league" = "match";
    let candidates = matchVideos;
    if (!candidates.length && roundVideos.length) { scope = "round"; candidates = roundVideos; }
    // without a match date we can only show the league's latest videos; with a date we show nothing unrelated
    if (!candidates.length && !hasDate) { scope = "league"; candidates = highlightsOnly.filter((v) => within(v, 0, 0)).slice(0, 6); }
    candidates = candidates.slice(0, 14);
    if (!candidates.length) return NextResponse.json({ configured: true, videos: [], scope });

    const checks = await videoChecks(candidates.map((v) => v.id), key, country);
    const usable = new Set(checks.filter((c: any) => c.usable).map((c: any) => c.id));

    const videos = candidates
      .filter((v) => usable.has(v.id))
      .slice(0, 6)
      .map((v) => ({ id: v.id, title: v.title, src: "https://www.youtube.com/embed/" + v.id + "?rel=0", thumbnail: v.thumbnail, competition: league, date: v.date }));

    return NextResponse.json({ configured: true, videos, scope });
  } catch (error) {
    return NextResponse.json({ configured: true, videos: [], scope: "league", error: error instanceof Error ? error.message : "Could not load highlights." });
  }
}
