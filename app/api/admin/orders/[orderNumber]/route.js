import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { isOrderStatus, mapOrder } from "@/lib/supabase/data";

const orderColumns = "order_number, customer, status, shipping, payment, subtotal, delivery, total, created_at, order_items(product_id, product_name, size, color, qty, unit_price)";

export async function GET(_request, { params }) {
  const access = await requireAdmin();
  if (access.response) return access.response;
  const { orderNumber } = await params;
  if (!orderNumber || orderNumber.length > 20) {
    return NextResponse.json({ message: "Order not found." }, { status: 404 });
  }
  const { data, error } = await access.supabase.from("orders")
    .select(orderColumns)
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (error) return NextResponse.json({ message: "Could not load order details." }, { status: 500 });
  if (!data) return NextResponse.json({ message: "Order not found." }, { status: 404 });
  return NextResponse.json(mapOrder(data), { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request, { params }) {
  const access = await requireAdmin();
  if (access.response) return access.response;
  const { orderNumber } = await params;
  const body = await request.json().catch(() => null);
  if (!orderNumber || orderNumber.length > 20 || !isOrderStatus(body?.status)) {
    return NextResponse.json({ message: "Order status is invalid." }, { status: 400 });
  }

  const { error } = await access.supabase.rpc("admin_set_order_status", {
    p_order_number: orderNumber,
    p_status: body.status,
  });
  if (error) {
    const status = error.code === "P0002" ? 404 : error.code === "42501" ? 403 : 400;
    const message = error.code === "P0002" ? "Order not found."
      : error.code === "42501" ? "Administrator access required."
      : "Could not update the order.";
    return NextResponse.json({ message }, { status });
  }
  return NextResponse.json({ ok: true });
}