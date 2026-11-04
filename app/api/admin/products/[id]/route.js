import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { mapProduct, validateProduct } from "@/lib/supabase/data";

const columns = "id, name, name_ar, description, cat, price, img, colors, stock, variant_stock, active";

export async function PATCH(request, { params }) {
  const access = await requireAdmin();
  if (access.response) return access.response;
  const { id: productId } = await params;
  const id = Number(productId);
  const product = validateProduct(await request.json().catch(() => null));
  if (!Number.isSafeInteger(id) || id < 0 || !product) {
    return NextResponse.json({ message: "Product details are invalid." }, { status: 400 });
  }

  const { data, error } = await access.supabase.from("products").update(product).eq("id", id).select(columns).maybeSingle();
  if (error) return NextResponse.json({ message: "Could not update the product." }, { status: 400 });
  if (!data) return NextResponse.json({ message: "Product not found." }, { status: 404 });
  return NextResponse.json(mapProduct(data));
}