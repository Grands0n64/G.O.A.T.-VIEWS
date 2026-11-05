import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Fail closed: protected pages must never render if auth is not configured.
  if (!supabaseUrl || !supabaseAnonKey) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("auth_error", "configuration");
    return NextResponse.redirect(loginUrl);
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // The login screen and Supabase email-confirmation callback are the only
  // application routes visitors may access without an authenticated session.
  const pathname = request.nextUrl.pathname;
  const isPublicRoute =
    pathname === "/login" || pathname.startsWith("/auth/callback");

  if (error || !user) {
    if (!isPublicRoute) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "";
      loginUrl.searchParams.set(
        "next",
        request.nextUrl.pathname + request.nextUrl.search
      );
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  if (pathname === "/login") {
    const requestedNext = request.nextUrl.searchParams.get("next");
    const safeNext =
      requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
        ? requestedNext
        : "/";
    return NextResponse.redirect(new URL(safeNext, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
