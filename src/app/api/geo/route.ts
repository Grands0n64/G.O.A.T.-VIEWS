import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const country = req.headers.get("x-vercel-ip-country") ?? "";
  return NextResponse.json({ country }, { headers: { "Cache-Control": "no-store" } });
}
