import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const memory = new Map<string, string | null>();

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z\s'-]/g, " ").replace(/\s+/g, " ").trim();

// returns: string = photo url, null = confirmed no photo, undefined = could not check (rate limited)
async function lookup(name: string, team: string): Promise<string | null | undefined> {
  const clean = norm(name);
  const key = clean.toLowerCase();
  if (!key) return null;
  if (memory.has(key)) return memory.get(key) ?? null;

  const words = clean.split(" ");
  const queries = [clean];
  if (words.length > 2) queries.push(words[0] + " " + words[words.length - 1]);

  const teamWord = norm(team).toLowerCase().split(" ")[0];

  for (const q of queries) {
    try {
      const res = await fetch(
        "https://www.thesportsdb.com/api/v1/json/123/searchplayers.php?p=" + encodeURIComponent(q),
        { next: { revalidate: 60 * 60 * 24 * 30 } }
      );
      if (res.status === 429) return undefined;
      if (!res.ok) continue;
      const json = await res.json();
      const list: any[] = (json?.player ?? []).filter((x: any) => x.strSport === "Soccer");
      if (!list.length) continue;
      const byTeam = list.find((x) => teamWord && norm(String(x.strTeam ?? "")).toLowerCase().includes(teamWord));
      const byName = list.find((x) => norm(String(x.strPlayer ?? "")).toLowerCase() === q.toLowerCase());
      const hit = byTeam ?? byName;
      const url = hit ? hit.strCutout || hit.strThumb || hit.strRender || null : null;
      if (url) {
        memory.set(key, url);
        return url;
      }
    } catch {
      return undefined;
    }
  }
  memory.set(key, null);
  return null;
}

export async function POST(req: NextRequest) {
  let body: any = {};
  try { body = await req.json(); } catch {}
  const players: { name: string; team: string }[] = Array.isArray(body?.players) ? body.players.slice(0, 25) : [];
  const photos: Record<string, string | null> = {};

  for (let i = 0; i < players.length; i += 5) {
    const chunk = players.slice(i, i + 5);
    const results = await Promise.all(chunk.map((p) => lookup(String(p.name ?? ""), String(p.team ?? ""))));
    chunk.forEach((p, idx) => {
      if (results[idx] !== undefined) photos[p.name] = results[idx] as string | null;
    });
  }
  return NextResponse.json({ photos }, { headers: { "Cache-Control": "no-store" } });
}
