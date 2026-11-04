import { NextResponse } from "next/server";
import { products as demoProducts } from "@/lib/products";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { mapProduct } from "@/lib/supabase/data";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasSupabaseConfig) return NextResponse.json(demoProducts);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, name_ar, description, cat, price, img, colors, stock, variant_stock, active")
    .eq("active", true)
    .order("id");

  if (error) {
    const localizationMigrationMissing = ["42703", "PGRST204"].includes(error.code);
    return NextResponse.json({
      message: localizationMigrationMissing
        ? "Product database setup is incomplete. Run supabase/product_localization_migration.sql in the Supabase SQL Editor."
        : "Could not load products.",
    }, { status: localizationMigrationMissing ? 503 : 500 });
  }
  return NextResponse.json(data.map(mapProduct), { headers: { "Cache-Control": "no-store" } });
}