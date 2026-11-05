import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (code) {
    const response = NextResponse.redirect(new URL(safeNext, request.url));
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookies) => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
        },
      }
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return response;
  }
  return NextResponse.redirect(new URL("/login?error=confirmation", request.url));
}