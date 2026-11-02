import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const STOP = new Set(["fc", "cf", "afc", "sc", "ac", "fk", "sk", "club", "the", "de", "of"]);
const ALLOWED_HOSTS = ["scorebat.com", "youtube.com", "youtube-nocookie.com"];

const tokens = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((t) => t.length >= 2 && !STOP.has(t));

const sameTeam = (a: string[], b: string[]) => a.length > 0 && b.length > 0 && (a.every((x) => b.includes(x)) || b.every((x) => a.includes(x)));

function isThisMatch(title: string, home: string, away: string) {
  const parts = title.split(/\s+(?:-|–|—|vs\.?|v)\s+/i).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return false;
  const [p1, p2] = [tokens(parts[0]), tokens(parts[1])];
  const [h, a] = [tokens(home), tokens(away)];
  return (sameTeam(h, p1) && sameTeam(a, p2)) || (sameTeam(h, p2) && sameTeam(a, p1));
}

const compact = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/uefa/g, "").replace(/[^a-z0-9]/g, "");
const competitionOf = (item: any): string => (typeof item?.competition === "string" ? item.competition : item?.competition?.name ?? "");

function playableSrc(embed: any): string | null {
  const match = /src=['"]([^'"]+)['"]/i.exec(String(embed ?? ""));
  if (!match) return null;
  try {
    const url = new URL(match[1].startsWith("//") ? "https:" + match[1] : match[1]);
    const ok = url.protocol === "https:" && ALLOWED_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith("." + host));
    return ok ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const token = process.env.SCOREBAT_TOKEN;
  if (!token) return NextResponse.json({ configured: false, videos: [], scope: "league" });

  const home = req.nextUrl.searchParams.get("home") ?? "";
  const away = req.nextUrl.searchParams.get("away") ?? "";
  const league = req.nextUrl.searchParams.get("league") ?? "";

  try {
    const response = await fetch("https://www.scorebat.com/video-api/v3/free-feed/?token=" + encodeURIComponent(token), {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 }
    });
    if (!response.ok) {
      return NextResponse.json({ configured: true, videos: [], scope: "league", error: "ScoreBat returned status " + response.status });
    }
    const json = await response.json();
    const items: any[] = Array.isArray(json?.response) ? json.response : Array.isArray(json) ? json : [];

    // short test: open /api/highlights?debug=1 in your browser
    if (req.nextUrl.searchParams.get("debug")) {
      return NextResponse.json({
        itemCount: items.length,
        topLevelKeys: Object.keys(json ?? {}),
        firstItems: items.slice(0, 6).map((item) => ({
          title: item?.title,
          competition: competitionOf(item),
          videoCount: Array.isArray(item?.videos) ? item.videos.length : null,
          embedStart: String(item?.videos?.[0]?.embed ?? item?.embed ?? "").slice(0, 160)
        }))
      });
    }

    const toVideos = (item: any) => {
      const list: any[] = Array.isArray(item?.videos) && item.videos.length ? item.videos : [item];
      return list
        .map((video) => ({ title: String(video?.title ?? item?.title ?? "Highlights"), src: playableSrc(video?.embed), thumbnail: item?.thumbnail ?? "", competition: competitionOf(item), date: item?.date ?? "" }))
        .filter((video) => video.src);
    };

    const exact = items.filter((item) => isThisMatch(String(item?.title ?? ""), home, away)).flatMap(toVideos);
    if (exact.length) return NextResponse.json({ configured: true, scope: "match", videos: exact.slice(0, 6) });

    const key = compact(league);
    const sameLeague = key ? items.filter((item) => compact(competitionOf(item)).includes(key)).flatMap(toVideos) : [];
    if (sameLeague.length) return NextResponse.json({ configured: true, scope: "league", videos: sameLeague.slice(0, 6) });

    return NextResponse.json({ configured: true, scope: "any", videos: items.flatMap(toVideos).slice(0, 6) });
  } catch {
    return NextResponse.json({ configured: true, videos: [], scope: "league", error: "Could not load highlights." });
  }
}
