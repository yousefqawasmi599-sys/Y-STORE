import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { mapOrder } from "@/lib/supabase/data";

const pageSize = 500;

export const dynamic = "force-dynamic";

export async function GET(request) {
  const access = await requireAdmin();
  if (access.response) return access.response;
  const rawPage = new URL(request.url).searchParams.get("page") || "0";
  const page = Number(rawPage);
  if (!Number.isSafeInteger(page) || page < 0 || page > 10000) {
    return NextResponse.json({ message: "Invalid page." }, { status: 400 });
  }

  const { data, error } = await access.supabase.from("orders")
    .select("order_number, customer, status, shipping, payment, subtotal, delivery, total, created_at, order_items(product_id, product_name, size, color, qty, unit_price)")
    .order("created_at", { ascending: false })
    .order("order_number")
    .range(page * pageSize, page * pageSize + pageSize);
  if (error) return NextResponse.json({ message: "Could not load orders." }, { status: 500 });
  return NextResponse.json({ items: data.slice(0, pageSize).map(mapOrder), hasMore: data.length > pageSize }, { headers: { "Cache-Control": "no-store" } });
}
