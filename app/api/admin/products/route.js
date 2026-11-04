import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { mapProduct, validateProduct } from "@/lib/supabase/data";

const columns = "id, name, name_ar, description, cat, price, img, colors, stock, variant_stock, active";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireAdmin();
  if (access.response) return access.response;
  const { data, error } = await access.supabase.from("products").select(columns).order("id");
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

export async function POST(request) {
  const access = await requireAdmin();
  if (access.response) return access.response;
  const product = validateProduct(await request.json().catch(() => null));
  if (!product) return NextResponse.json({ message: "Product details are invalid." }, { status: 400 });

  const { data, error } = await access.supabase.from("products").insert(product).select(columns).single();
  if (error) return NextResponse.json({ message: "Could not add the product." }, { status: 400 });
  return NextResponse.json(mapProduct(data), { status: 201 });
}