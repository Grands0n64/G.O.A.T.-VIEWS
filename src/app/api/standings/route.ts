import { NextRequest, NextResponse } from "next/server";
import { LEAGUES } from "../../leagues";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const paths: Record<string, string> = Object.fromEntries(LEAGUES.map((item) => [item.league, item.path]));

async function getJson(url: string) {
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate: 120 } });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

const hasTable = (data: any) =>
  !!data && ((data.children ?? []).some((child: any) => child.standings?.entries?.length) || !!data.standings?.entries?.length);

export async function GET(request: NextRequest) {
  const league = request.nextUrl.searchParams.get("league") ?? "Premier League";
  const path = paths[league];
  if (!path) return NextResponse.json({ error: "Standings are not available for this competition." }, { status: 404 });

  // ESPN serves full tables from /apis/v2; the /apis/site/v2 address is kept as a fallback
  let data = await getJson("https://site.api.espn.com/apis/v2/sports/" + path + "/standings");
  if (!hasTable(data)) {
    const fallback = await getJson("https://site.api.espn.com/apis/site/v2/sports/" + path + "/standings");
    if (hasTable(fallback)) data = fallback;
  }
  if (!data) return NextResponse.json({ error: "Standings are temporarily unavailable." }, { status: 502 });

  return NextResponse.json(
    { league, children: data.children ?? [], standings: data.standings ?? null, groups: data.groups ?? [], season: data.season ?? null },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
