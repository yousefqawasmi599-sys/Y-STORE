import { NextResponse } from "next/server";
import { DEFAULT_CATEGORIES } from "@/lib/products";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { mapCategory } from "@/lib/supabase/data";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasSupabaseConfig) return NextResponse.json(DEFAULT_CATEGORIES);
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories")
    .select("slug, label, img, active")
    .eq("active", true)
    .order("label");
  if (error) return NextResponse.json({
    message: ["42P01", "PGRST205"].includes(error.code) ? "Run supabase/category_migration.sql in Supabase SQL Editor to enable categories." : "Could not load categories.",
  }, { status: ["42P01", "PGRST205"].includes(error.code) ? 503 : 500 });
  return NextResponse.json(data.map(mapCategory), { headers: { "Cache-Control": "no-store" } });
}