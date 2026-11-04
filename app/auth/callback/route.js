import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const requestedNext = url.searchParams.get("next") || "/account";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") && !/[\\\r\n]/.test(requestedNext) ? requestedNext : "/account";

  if (hasSupabaseConfig && (code || tokenHash)) {
    const supabase = await createClient();
    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : ["signup", "invite", "magiclink", "recovery", "email", "email_change"].includes(type)
        ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
        : { error: new Error("Invalid email verification type.") };
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }
  return NextResponse.redirect(new URL("/login?auth=callback-error", request.url));
}
