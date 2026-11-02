import { NextRequest, NextResponse } from "next/server";
import { LIVE_CHANNELS, type LiveChannel } from "../../liveChannels";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const API = "https://www.googleapis.com/youtube/v3";
const WEEK = 60 * 60 * 24 * 7;
const STOP = new Set(["fc", "cf", "afc", "sc", "ac", "fk", "sk", "club", "the", "de", "of"]);
const GENERIC = new Set(["united", "city", "town", "albion", "hotspur", "wanderers", "rovers", "county"]);
const AMBIGUOUS = new Set(["manchester", "madrid", "borussia", "athletic", "atletico", "sporting", "olympique", "paris", "united", "city", "real", "inter", "milan", "bayer", "bayern"]);

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
const teamLoose = (team: string, set: Set<string>) =>
  tokens(team).filter((x) => x.length >= 5 && !AMBIGUOUS.has(x) && !GENERIC.has(x)).some((x) => set.has(x));
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

type Found = { channelId: string; title: string; uploads: string };
const cache = new Map<string, Found>();

async function channelInfo(attempt: Record<string, string>, key: string) {
  const json = await yt("/channels", { part: "snippet,contentDetails", key, ...attempt }, WEEK);
  const item = json?.items?.[0];
  return {
    channelId: String(item?.id ?? ""),
    title: String(item?.snippet?.title ?? ""),
    uploads: String(item?.contentDetails?.relatedPlaylists?.uploads ?? "")
  };
}

async function resolve(channel: LiveChannel, key: string, log: any[]): Promise<Found | null> {
  const cached = cache.get(channel.name);
  if (cached) return cached;
  const accept = (info: Found, trusted: boolean) => !!info.uploads && (trusted || channel.hints.some((h) => info.title.toLowerCase().includes(h)));

  const attempts: { by: Record<string, string>; trusted: boolean }[] = [];
  if (channel.channelId) attempts.push({ by: { id: channel.channelId }, trusted: true });
  if (channel.handle) attempts.push({ by: { forHandle: channel.handle }, trusted: false });

  for (const attempt of attempts) {
    try {
      const info = await channelInfo(attempt.by, key);
      const ok = accept(info, attempt.trusted);
      log.push({ channel: channel.name, tried: attempt.by, channelName: info.title || "(not found)", accepted: ok });
      if (ok) { cache.set(channel.name, info); return info; }
    } catch (error) {
      log.push({ channel: channel.name, tried: attempt.by, error: error instanceof Error ? error.message : "failed" });
    }
  }

  if (channel.query) {
    try {
      const found = await yt("/search", { part: "snippet", type: "channel", q: channel.query, maxResults: "3", key }, 60 * 60 * 24 * 30);
      for (const hit of found?.items ?? []) {
        const id = String(hit?.id?.channelId ?? hit?.snippet?.channelId ?? "");
        if (!id) continue;
        const info = await channelInfo({ id }, key);
        const ok = accept(info, false);
        log.push({ channel: channel.name, searched: channel.query, channelName: info.title || "(not found)", accepted: ok });
        if (ok) { cache.set(channel.name, info); return info; }
      }
    } catch (error) {
      log.push({ channel: channel.name, searched: channel.query, error: error instanceof Error ? error.message : "failed" });
    }
  }
  return null;
}

async function liveNow(found: Found, key: string) {
  const list = await yt("/playlistItems", { part: "snippet", playlistId: found.uploads, maxResults: "10", key }, 60);
  const ids = (list.items ?? []).map((item: any) => String(item.snippet?.resourceId?.videoId ?? "")).filter(Boolean);
  if (!ids.length) return [];
  const videos = await yt("/videos", { part: "snippet,status,contentDetails", id: ids.join(","), key }, 60);
  return (videos.items ?? []).filter((v: any) => v.snippet?.liveBroadcastContent === "live");
}

export async function GET(req: NextRequest) {
  const key = process.env.YOUTUBE_API_KEY;
  const league = req.nextUrl.searchParams.get("league") ?? "";
  const home = req.nextUrl.searchParams.get("home") ?? "";
  const away = req.nextUrl.searchParams.get("away") ?? "";
  const isLive = req.nextUrl.searchParams.get("live") === "1";
  const debug = !!req.nextUrl.searchParams.get("debug");
  const country = (req.headers.get("x-vercel-ip-country") ?? "").toUpperCase();

  const channels = LIVE_CHANNELS.filter((c) => (debug && !league) || c.leagues.includes(league));
  if (!key || !channels.length || (!isLive && !debug)) return NextResponse.json({ videos: [] });

  try {
    const log: any[] = [];
    const report: any[] = [];
    const videos: { id: string; title: string; channel: string; src: string }[] = [];

    for (const channel of channels) {
      const found = await resolve(channel, key, log);
      if (!found) { report.push({ channel: channel.name, status: "channel not found" }); continue; }
      const live = await liveNow(found, key);
      report.push({ channel: channel.name, channelName: found.title, liveNow: live.map((v: any) => v.snippet?.title) });

      for (const v of live) {
        const set = new Set(tokens(String(v.snippet?.title ?? "")));
        if (!either(home, set) || !either(away, set)) continue;
        const restriction: any = v.contentDetails?.regionRestriction;
        const blockedHere = !!country && (
          (Array.isArray(restriction?.blocked) && restriction.blocked.includes(country)) ||
          (Array.isArray(restriction?.allowed) && !restriction.allowed.includes(country))
        );
        if (v.status?.embeddable && v.status?.privacyStatus === "public" && !blockedHere) {
          videos.push({ id: String(v.id), title: String(v.snippet.title), channel: channel.name, src: "https://www.youtube.com/embed/" + v.id });
        }
      }
    }

    if (debug) return NextResponse.json({ visitorCountry: country || "(unknown)", league: league || "(all)", steps: log, channels: report });
    return NextResponse.json({ videos: videos.slice(0, 3) });
  } catch (error) {
    return NextResponse.json({ videos: [], error: error instanceof Error ? error.message : "Could not check live streams." });
  }
}
