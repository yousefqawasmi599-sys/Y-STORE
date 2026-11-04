import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { getSupabaseConfig, hasSupabaseConfig } from "@/lib/supabase/config";

export async function middleware(request) {
  if (request.nextUrl.pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const allowed = new Set([request.nextUrl.origin]);
    if (process.env.SITE_URL) allowed.add(new URL(process.env.SITE_URL).origin);
    if (origin && !allowed.has(origin)) return NextResponse.json({ message: "Request origin is not allowed." }, { status: 403 });
  }
  if (!hasSupabaseConfig) return NextResponse.next({ request });

  const { url, anonKey } = getSupabaseConfig();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
