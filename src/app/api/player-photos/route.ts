import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Rec = { photo: string | null; born?: string; nationality?: string; height?: string; done: boolean };
const memory = new Map<string, Rec>();
const UA = "GoatViews/1.0 (football scores site)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z\s'-]/g, " ").replace(/\s+/g, " ").trim();

/* ---- Wikipedia: photos (no key, generous limits) ---- */
async function fromWikipedia(name: string): Promise<string | null | undefined> {
  const base = name.trim().replace(/\s+/g, "_");
  for (const title of [base + "_(footballer)", base]) {
    try {
      const res = await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title), {
        headers: { "Api-User-Agent": UA, Accept: "application/json" },
        next: { revalidate: 60 * 60 * 24 * 30 }
      });
      if (res.status === 404) continue;
      if (res.status === 429) return undefined;
      if (!res.ok) continue;
      const json = await res.json();
      if (json?.type === "disambiguation") continue;
      const text = String(json?.description ?? "") + " " + String(json?.extract ?? "").slice(0, 240);
      if (!/footbal|soccer/i.test(text)) continue;
      const url = json?.thumbnail?.source;
      if (url) return url;
    } catch {
      return undefined;
    }
  }
  return null;
}

/* ---- TheSportsDB: birth date, nationality, height (free key, about 30 requests a minute) ---- */
let chain: Promise<unknown> = Promise.resolve();
function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const result = await fn();
    await sleep(2100);
    return result;
  });
  chain = run.catch(() => {});
  return run;
}

type Sdb = { photo: string | null; born?: string; nationality?: string; height?: string };
// undefined = could not check (rate limited), null = player not found
async function fromSportsDb(name: string, team: string): Promise<Sdb | null | undefined> {
  const clean = norm(name);
  const words = clean.split(" ");
  const queries = [clean];
  if (words.length > 2) queries.push(words[0] + " " + words[words.length - 1]);
  const teamWord = norm(team).toLowerCase().split(" ")[0];

  for (const q of queries) {
    try {
      const res = await fetch("https://www.thesportsdb.com/api/v1/json/123/searchplayers.php?p=" + encodeURIComponent(q), {
        next: { revalidate: 60 * 60 * 24 * 30 }
      });
      if (res.status === 429) return undefined;
      if (!res.ok) continue;
      const json = await res.json();
      const list: any[] = (json?.player ?? []).filter((x: any) => x.strSport === "Soccer");
      if (!list.length) continue;
      const byTeam = list.find((x) => teamWord && norm(String(x.strTeam ?? "")).toLowerCase().includes(teamWord));
      const byName = list.find((x) => norm(String(x.strPlayer ?? "")).toLowerCase() === q.toLowerCase());
      const hit = byTeam ?? byName;
      if (!hit) continue;
      return {
        photo: hit.strCutout || hit.strThumb || hit.strRender || null,
        born: hit.dateBorn || undefined,
        nationality: hit.strNationality || undefined,
        height: hit.strHeight || undefined
      };
    } catch {
      return undefined;
    }
  }
  return null;
}

async function lookup(name: string, team: string, budget: { sportsDb: number }): Promise<Rec> {
  const key = norm(name).toLowerCase();
  if (!key) return { photo: null, done: true };
  const cached = memory.get(key);
  if (cached?.done) return cached;

  let rec: Rec = cached ?? { photo: null, done: false };
  if (!rec.photo) {
    const wiki = await fromWikipedia(name);
    if (typeof wiki === "string") rec = { ...rec, photo: wiki };
  }
  if (budget.sportsDb > 0) {
    budget.sportsDb -= 1;
    const sdb = await throttled(() => fromSportsDb(name, team));
    if (sdb !== undefined) {
      rec = {
        photo: rec.photo ?? sdb?.photo ?? null,
        born: sdb?.born,
        nationality: sdb?.nationality,
        height: sdb?.height,
        done: true
      };
    }
  }
  memory.set(key, rec);
  return rec;
}

export async function POST(req: NextRequest) {
  let body: any = {};
  try { body = await req.json(); } catch {}
  const players: { name: string; team: string }[] = Array.isArray(body?.players) ? body.players.slice(0, 30) : [];
  const budget = { sportsDb: 8 };
  const results: Record<string, Rec> = {};

  for (let i = 0; i < players.length; i += 10) {
    const chunk = players.slice(i, i + 10);
    const recs = await Promise.all(chunk.map((p) => lookup(String(p.name ?? ""), String(p.team ?? ""), budget)));
    chunk.forEach((p, idx) => { results[p.name] = recs[idx]; });
  }
  return NextResponse.json({ results }, { headers: { "Cache-Control": "no-store" } });
}

// quick test in your browser: /api/player-photos?name=Cole%20Palmer&team=Chelsea
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name") ?? "";
  const team = req.nextUrl.searchParams.get("team") ?? "";
  const wiki = await fromWikipedia(name);
  const sdb = await fromSportsDb(name, team);
  return NextResponse.json({ name, wikipedia: wiki ?? "check failed", sportsdb: sdb ?? "not found or limited" });
}
