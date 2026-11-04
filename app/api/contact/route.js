import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { rateLimit } from "@/lib/rate-limit";

const emailPattern = /^\S+@\S+\.\S+$/;

export async function POST(request) {
  if (!hasSupabaseConfig) return NextResponse.json({ message: "Contact service is not configured." }, { status: 503 });
  const retryAfter = rateLimit(request, "contact", { limit: 5, windowMs: 60_000 });
  if (retryAfter) return NextResponse.json({ message: "Too many messages. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  const body = await request.json().catch(() => null);
  if (typeof body?.website === "string" && body.website.trim()) return NextResponse.json({ ok: true });
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!name || name.length > 100 || !emailPattern.test(email) || email.length > 254 || message.length < 5 || message.length > 3000) {
    return NextResponse.json({ message: "Check your name, email and message." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("contact_messages").insert({ name, email, message });
  if (error?.code === "P0429") return NextResponse.json({ message: "Too many submissions. Please try again shortly." }, { status: 429, headers: { "Retry-After": "60" } });
  if (error) return NextResponse.json({ message: "Could not send your message." }, { status: 400 });
  return NextResponse.json({ ok: true });
}