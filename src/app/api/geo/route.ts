import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const country = (
    req.headers.get("x-vercel-ip-country") ??
    req.headers.get("cf-ipcountry") ??
    req.headers.get("x-country-code") ??
    ""
  ).trim().toUpperCase();

  return NextResponse.json(
    { country: /^[A-Z]{2}$/.test(country) ? country : "" },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
