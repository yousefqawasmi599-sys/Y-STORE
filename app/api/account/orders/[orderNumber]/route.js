import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { orderNumberPattern } from "@/lib/supabase/data";

// Customers may only cancel their own order while it is still New.
export async function PATCH(request, { params }) {
  if (!hasSupabaseConfig) return NextResponse.json({ message: "Order history is not configured." }, { status: 503 });
  const { orderNumber } = await params;
  const body = await request.json().catch(() => null);
  if (!orderNumberPattern.test(orderNumber || "") || body?.status !== "Cancelled") {
    return NextResponse.json({ message: "Order change is invalid." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ message: "Sign in to manage your orders." }, { status: 401 });

  const { error } = await supabase.rpc("cancel_my_order", { p_order_number: orderNumber });
  if (error) {
    const status = error.code === "P0002" ? 404 : error.code === "22023" ? 409 : error.code === "PGRST202" ? 503 : 500;
    const message = error.code === "P0002" ? "Order not found."
      : error.code === "22023" ? "This order is already being prepared and can no longer be cancelled. Contact us for help."
      : error.code === "PGRST202" ? "Run supabase/customer_orders.sql in Supabase SQL Editor to enable cancellations."
      : "Could not cancel the order.";
    return NextResponse.json({ message }, { status });
  }
  return NextResponse.json({ ok: true, status: "Cancelled" });
}
