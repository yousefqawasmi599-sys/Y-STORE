import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { rateLimit } from "@/lib/rate-limit";

const emailPattern = /^\S+@\S+\.\S+$/;

export async function POST(request) {
  if (!hasSupabaseConfig) return NextResponse.json({ message: "Newsletter service is not configured." }, { status: 503 });
  const retryAfter = rateLimit(request, "newsletter", { limit: 5, windowMs: 60_000 });
  if (retryAfter) return NextResponse.json({ message: "Too many subscription attempts. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  const body = await request.json().catch(() => null);
  if (typeof body?.website === "string" && body.website.trim()) return NextResponse.json({ ok: true });
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!emailPattern.test(email) || email.length > 254) {
    return NextResponse.json({ message: "Enter a valid email address." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("newsletter_subscribers").upsert({ email }, { onConflict: "email", ignoreDuplicates: true });
  if (error?.code === "P0429") return NextResponse.json({ message: "Too many submissions. Please try again shortly." }, { status: 429, headers: { "Retry-After": "60" } });
  if (error) return NextResponse.json({ message: "Could not subscribe right now." }, { status: 400 });
  return NextResponse.json({ ok: true });
}