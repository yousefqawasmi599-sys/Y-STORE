import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { mapOrder } from "@/lib/supabase/data";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasSupabaseConfig) return NextResponse.json({ message: "Order history is not configured." }, { status: 503 });
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ message: "Sign in to view your orders." }, { status: 401 });

  const { data, error } = await supabase.from("orders")
    .select("order_number, customer, status, shipping, payment, subtotal, delivery, total, created_at, order_items(product_id, product_name, size, color, qty, unit_price)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ message: "Could not load order history." }, { status: 500 });
  return NextResponse.json(data.map(mapOrder), { headers: { "Cache-Control": "no-store" } });
}