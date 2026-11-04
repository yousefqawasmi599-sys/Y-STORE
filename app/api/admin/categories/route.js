import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { mapCategory, validateCategory } from "@/lib/supabase/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireAdmin();
  if (access.response) return access.response;
  const { data, error } = await access.supabase.from("categories")
    .select("slug, label, img, active")
    .order("label");
  if (error) return NextResponse.json({
    message: ["42P01", "PGRST205"].includes(error.code) ? "Run supabase/category_migration.sql in Supabase SQL Editor to enable categories." : "Could not load categories.",
  }, { status: ["42P01", "PGRST205"].includes(error.code) ? 503 : 500 });
  return NextResponse.json(data.map(mapCategory), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request) {
  const access = await requireAdmin();
  if (access.response) return access.response;
  const category = validateCategory(await request.json().catch(() => null));
  if (!category) return NextResponse.json({ message: "Category name or URL key is invalid." }, { status: 400 });
  const { data, error } = await access.supabase.from("categories").insert(category)
    .select("slug, label, img, active").single();
  if (error) return NextResponse.json({ message: error.code === "23505" ? "That category name or URL key already exists." : "Could not create the category." }, { status: 400 });
  return NextResponse.json(mapCategory(data), { status: 201 });
}