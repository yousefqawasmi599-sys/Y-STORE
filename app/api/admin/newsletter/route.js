import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const access = await requireAdmin();
  if (access.response) return access.response;
  const rawPage = new URL(request.url).searchParams.get("page") || "0";
  const page = Number(rawPage);
  if (!Number.isSafeInteger(page) || page < 0 || page > 10000) {
    return NextResponse.json({ message: "Invalid page." }, { status: 400 });
  }
  const { data, error } = await access.supabase.from("newsletter_subscribers")
    .select("email, created_at")
    .order("created_at", { ascending: false })
    .range(page * 1000, page * 1000 + 1000);
  if (error) return NextResponse.json({ message: "Could not load newsletter subscribers." }, { status: 500 });
  return NextResponse.json({ items: data.slice(0, 1000), hasMore: data.length > 1000 }, { headers: { "Cache-Control": "no-store" } });
}
