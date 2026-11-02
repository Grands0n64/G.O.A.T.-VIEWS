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
const HIGHLIGHT = /highlight|resumen|resumo|summary|extended|all goals|best moments|goals/i;
const THROWBACK = /classic|throwback|relive|on this day|best of|history|rewind|years ago/i;
const ROUND = /matchweek|weekend|round|jornada|giornata|spieltag|journ[eé]e|goals/i;

const tokens = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((t) => t.length >= 2 && !STOP.has(t));

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

// loose: one distinctive word of the team name is in the title (for names like "Racing Santander" vs "R. RACING CLUB")
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

async function resolveChannel(src: HighlightSource, key: string, log: any[]): Promise<Resolved | null> {
  const cacheKey = JSON.stringify(src);
  const cached = resolvedCache.get(cacheKey);
  if (cached) return cached;

  const attempts: Record<string, string>[] = [];
  if (src.channelId) attempts.push({ id: src.channelId });
  if (src.handle) attempts.push({ forHandle: src.handle });
  if (src.wikipedia) for (const id of await wikidataIds(src.wikipedia)) attempts.push({ id });

  for (const attempt of attempts) {
    try {
      const json = await yt("/channels", { part: "snippet,contentDetails", key, ...attempt }, 60 * 60 * 24 * 7);
      const item = json?.items?.[0];
      const title = String(item?.snippet?.title ?? "");
      const uploads = String(item?.contentDetails?.relatedPlaylists?.uploads ?? "");
      const accepted = !!uploads && title.toLowerCase().includes(src.authorHint);
      log.push({ tried: attempt, channelName: title || "(not found)", accepted });
      if (accepted) {
        const found = { channelId: String(item.id), title, uploads };
        resolvedCache.set(cacheKey, found);
        return found;
      }
    } catch (error) {
      log.push({ tried: attempt, error: error instanceof Error ? error.message : "failed" });
    }
  }
  return null;
}

type Upload = { id: string; title: string; thumbnail: string; date: string };

async function latestUploads(playlistId: string, key: string): Promise<Upload[]> {
  const out: any[] = [];
  let pageToken = "";
  for (let page = 0; page < 3; page++) {
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

export async function GET(req: NextRequest) {
  const key = process.env.YOUTUBE_API_KEY;
  const home = req.nextUrl.searchParams.get("home") ?? "";
  const away = req.nextUrl.searchParams.get("away") ?? "";
  const league = req.nextUrl.searchParams.get("league") ?? "";
  const kickoff = Date.parse(req.nextUrl.searchParams.get("date") ?? "");
  const hasDate = Number.isFinite(kickoff);
  const debug = !!req.nextUrl.searchParams.get("debug");
  const country = (req.headers.get("x-vercel-ip-country") ?? "").toUpperCase();
  const bodySources = league.startsWith("FIFA") ? HIGHLIGHT_CHANNELS["FIFA"] : league.startsWith("UEFA") || league === "Euro Qualifying" || league === "Women's Euro" ? HIGHLIGHT_CHANNELS["UEFA"] : [];
  const sources = HIGHLIGHT_CHANNELS[league] ?? (bodySources.length ? bodySources : (debug ? HIGHLIGHT_CHANNELS["Premier League"] : []));

  if (!key) return NextResponse.json({ configured: false, keyFound: false, videos: [], scope: "league" });
  // hidden when this league has no official channel set up
  if (!sources.length) return NextResponse.json({ configured: false, keyFound: true, videos: [], scope: "league" });

  try {
    const log: any[] = [];
    const uploads: Upload[] = [];
    for (const src of sources) {
      const channel = await resolveChannel(src, key, log);
      if (channel) uploads.push(...(await latestUploads(channel.uploads, key)));
    }

    const highlightsOnly = uploads.filter((v) => HIGHLIGHT.test(v.title) && !THROWBACK.test(v.title));
    const now = Date.now();

    // videos published shortly after this match (or, with no date, in the last three weeks)
    const within = (v: Upload, before: number, after: number) => {
      const published = Date.parse(v.date);
      if (!Number.isFinite(published)) return false;
      return hasDate ? published >= kickoff - before && published <= kickoff + after : published <= now && now - published <= 21 * DAY;
    };
    const setOf = (v: Upload) => new Set(tokens(v.title));

    const poolWide = highlightsOnly.filter((v) => within(v, 0.25 * DAY, 7 * DAY));
    const poolNarrow = highlightsOnly.filter((v) => within(v, 0.25 * DAY, 4 * DAY));

    let matchVideos = poolWide.filter((v) => teamMatches(home, setOf(v)) && teamMatches(away, setOf(v)));
    if (!matchVideos.length) matchVideos = poolWide.filter((v) => either(home, setOf(v)) && either(away, setOf(v)));
    if (!matchVideos.length && hasDate) matchVideos = poolNarrow.filter((v) => either(home, setOf(v)) || either(away, setOf(v)));
    const roundVideos = hasDate ? poolNarrow.filter((v) => ROUND.test(v.title)) : [];

    if (debug) {
      return NextResponse.json({
        keyFound: true,
        visitorCountry: country || "(unknown)",
        league: league || "(none, testing Premier League)",
        usedMatchDate: hasDate,
        steps: log,
        uploadsFetched: uploads.length,
        highlightVideos: highlightsOnly.length,
        foundForThisMatch: matchVideos.length,
        matchdayVideos: roundVideos.length,
        sampleTitles: highlightsOnly.slice(0, 5).map((v) => v.title)
      });
    }

    let scope: "match" | "round" | "league" = "match";
    let candidates = matchVideos;
    if (!candidates.length && roundVideos.length) { scope = "round"; candidates = roundVideos; }
    // without a match date we can only show the league's latest videos; with a date we show nothing unrelated
    if (!candidates.length && !hasDate) { scope = "league"; candidates = highlightsOnly.filter((v) => within(v, 0, 0)).slice(0, 6); }
    candidates = candidates.slice(0, 14);
    if (!candidates.length) return NextResponse.json({ configured: true, videos: [], scope });

    // keep only videos that are public, embeddable and not listed as blocked in the visitor's country
    const status = await yt("/videos", { part: "status,contentDetails", id: candidates.map((v) => v.id).join(","), key }, 600);
    const usable = new Set<string>();
    for (const item of status.items ?? []) {
      const restriction: any = item.contentDetails?.regionRestriction;
      const blockedHere = !!country && (
        (Array.isArray(restriction?.blocked) && restriction.blocked.includes(country)) ||
        (Array.isArray(restriction?.allowed) && !restriction.allowed.includes(country))
      );
      if (item.status?.embeddable && item.status?.privacyStatus === "public" && !blockedHere) usable.add(String(item.id));
    }

    const videos = candidates
      .filter((v) => usable.has(v.id))
      .slice(0, 6)
      .map((v) => ({ id: v.id, title: v.title, src: "https://www.youtube.com/embed/" + v.id + "?rel=0", thumbnail: v.thumbnail, competition: league, date: v.date }));

    return NextResponse.json({ configured: true, videos, scope });
  } catch (error) {
    return NextResponse.json({ configured: true, videos: [], scope: "league", error: error instanceof Error ? error.message : "Could not load highlights." });
  }
}
