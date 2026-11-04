import { NextResponse } from "next/server";
import { createClient } from "./server";
import { hasSupabaseConfig } from "./config";

export async function requireAdmin() {
  if (!hasSupabaseConfig) {
    return { response: NextResponse.json({ message: "Supabase is not configured." }, { status: 503 }) };
  }
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { response: NextResponse.json({ message: "Sign in to continue." }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "admin") {
    return { response: NextResponse.json({ message: "Administrator access required." }, { status: 403 }) };
  }

  return { supabase, user };
}