import { NextRequest, NextResponse } from "next/server";
import { HIGHLIGHT_CHANNELS, type HighlightSource } from "../../highlightChannels";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const UA = "GoatViews/1.0 (football scores site)";
const STOP = new Set(["fc", "cf", "afc", "sc", "ac", "fk", "sk", "club", "the", "de", "of"]);
const GENERIC = new Set(["united", "city", "town", "albion", "hotspur", "wanderers", "rovers", "county"]);
const AMBIGUOUS = new Set(["manchester", "madrid", "borussia", "athletic", "atletico", "sporting", "olympique", "paris", "united", "city", "real", "inter", "milan", "bayer", "bayern"]);
const HIGHLIGHT = /highlight|resumen|resumo|summary|extended|all goals|best moments/i;

const tokens = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((t) => t.length >= 2 && !STOP.has(t));

function teamMatches(team: string, titleTokens: Set<string>) {
  const t = tokens(team);
  if (!t.length) return false;
  if (t.every((x) => titleTokens.has(x))) return true;
  const core = t.filter((x) => !GENERIC.has(x));
  if (core.length >= 2 && core.every((x) => titleTokens.has(x))) return true;
  const strong = t.filter((x) => x.length >= 5 && !AMBIGUOUS.has(x)).sort((a, b) => b.length - a.length)[0];
  return !!strong && titleTokens.has(strong);
}

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

async function getJson(url: string, revalidate: number) {
  try {
    const res = await fetch(url, { headers: { "Api-User-Agent": UA, Accept: "application/json" }, next: { revalidate } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

type Upload = { id: string; title: string; thumbnail: string; date: string };

function parseFeed(xml: string) {
  const author = decode(/<author>\s*<name>([^<]*)<\/name>/i.exec(xml)?.[1] ?? "");
  const entries: Upload[] = xml
    .split("<entry>")
    .slice(1)
    .map((block) => ({
      id: /<yt:videoId>([^<]+)<\/yt:videoId>/.exec(block)?.[1] ?? "",
      title: decode(/<title>([^<]*)<\/title>/.exec(block)?.[1] ?? ""),
      thumbnail: /<media:thumbnail url="([^"]+)"/.exec(block)?.[1] ?? "",
      date: /<published>([^<]+)<\/published>/.exec(block)?.[1] ?? ""
    }))
    .filter((v) => v.id && v.title);
  return { author, entries };
}

// finds the channel ID(s) from Wikipedia -> Wikidata, no key needed
async function lookupIds(src: HighlightSource): Promise<{ qid: string; ids: string[]; note: string }> {
  if (src.channelId) return { qid: "", ids: [src.channelId], note: "channel ID set by hand" };
  const page = await getJson(
    "https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&ppprop=wikibase_item&redirects=1&format=json&titles=" + encodeURIComponent(src.wikipedia),
    60 * 60 * 24 * 7
  );
  if (!page) return { qid: "", ids: [], note: "Wikipedia request failed" };
  const first: any = Object.values(page?.query?.pages ?? {})[0];
  const qid = first?.pageprops?.wikibase_item ?? "";
  if (!qid) return { qid: "", ids: [], note: "Wikipedia page has no Wikidata link" };
  const claims = await getJson("https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&property=P2397&entity=" + qid, 60 * 60 * 24 * 7);
  if (!claims) return { qid, ids: [], note: "Wikidata request failed" };
  const list: any[] = claims?.claims?.P2397 ?? [];
  const rank = (c: any) => (c.rank === "preferred" ? 0 : c.rank === "normal" ? 1 : 2);
  const ids = list
    .filter((c) => c.rank !== "deprecated")
    .sort((a, b) => rank(a) - rank(b))
    .map((c) => c?.mainsnak?.datavalue?.value)
    .filter((v) => typeof v === "string" && /^UC[\w-]{20,}$/.test(v)) as string[];
  return { qid, ids, note: ids.length ? "ok" : "Wikidata has no YouTube channel ID for this page" };
}

async function tryFeeds(src: HighlightSource) {
  const { qid, ids, note } = await lookupIds(src);
  const tries: any[] = [];
  for (const channelId of ids) {
    try {
      const res = await fetch("https://www.youtube.com/feeds/videos.xml?channel_id=" + channelId, { headers: { "User-Agent": UA }, next: { revalidate: 600 } });
      if (!res.ok) { tries.push({ channelId, youtubeStatus: res.status }); continue; }
      const parsed = parseFeed(await res.text());
      const accepted = parsed.author.toLowerCase().includes(src.authorHint);
      tries.push({ channelId, youtubeStatus: res.status, channelName: parsed.author, videos: parsed.entries.length, accepted });
      if (accepted) return { wikipedia: src.wikipedia, qid, note, tries, found: { channelId, author: parsed.author, uploads: parsed.entries } };
    } catch {
      tries.push({ channelId, error: "request to YouTube failed" });
    }
  }
  return { wikipedia: src.wikipedia, qid, note, tries, found: null as null | { channelId: string; author: string; uploads: Upload[] } };
}

export async function GET(req: NextRequest) {
  const home = req.nextUrl.searchParams.get("home") ?? "";
  const away = req.nextUrl.searchParams.get("away") ?? "";
  const league = req.nextUrl.searchParams.get("league") ?? "";
  const debug = !!req.nextUrl.searchParams.get("debug");
  const sources = HIGHLIGHT_CHANNELS[league] ?? (debug ? HIGHLIGHT_CHANNELS["Premier League"] : []);

  // hidden when this league has no official channel set up
  if (!sources.length) return NextResponse.json({ configured: false, videos: [], scope: "league" });

  try {
    const results = await Promise.all(sources.map((src) => tryFeeds(src)));
    const uploads = results.flatMap((r) => r.found?.uploads ?? []);
    const highlightsOnly = uploads.filter((v) => HIGHLIGHT.test(v.title));
    const matchVideos = highlightsOnly.filter((v) => {
      const set = new Set(tokens(v.title));
      return teamMatches(home, set) && teamMatches(away, set);
    });

    if (debug) {
      return NextResponse.json({
        league: league || "(none, testing Premier League)",
        steps: results.map((r) => ({ wikipedia: r.wikipedia, wikidataId: r.qid, result: r.note, youtubeTries: r.tries })),
        highlightVideos: highlightsOnly.length,
        foundForThisMatch: matchVideos.length,
        sampleTitles: uploads.slice(0, 6).map((v) => v.title)
      });
    }

    const scope = matchVideos.length ? "match" : "league";
    const chosen = (matchVideos.length ? matchVideos : highlightsOnly).slice(0, 6);
    const videos = chosen.map((v) => ({ title: v.title, src: "https://www.youtube.com/embed/" + v.id + "?rel=0", thumbnail: v.thumbnail, competition: league, date: v.date }));
    return NextResponse.json({ configured: true, videos, scope });
  } catch (error) {
    return NextResponse.json({ configured: true, videos: [], scope: "league", error: error instanceof Error ? error.message : "Could not load highlights." });
  }
}
