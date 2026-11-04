import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { isOrderSize } from "@/lib/supabase/data";
import { rateLimit } from "@/lib/rate-limit";

const emailPattern = /^\S+@\S+\.\S+$/;

export async function POST(request) {
  if (!hasSupabaseConfig) return NextResponse.json({ message: "Order service is not configured." }, { status: 503 });
  const retryAfter = rateLimit(request, "orders", { limit: 10, windowMs: 60_000 });
  if (retryAfter) return NextResponse.json({ message: "Too many order attempts. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(retryAfter) } });

  const body = await request.json().catch(() => null);
  const customer = body?.customer;
  const validCustomer = customer && typeof customer === "object"
    && !Array.isArray(customer)
    && typeof customer.email === "string" && emailPattern.test(customer.email.trim()) && customer.email.length <= 254
    && ["name", "phone", "address", "emirate"].every((key) =>
      typeof customer[key] === "string" && customer[key].trim().length > 0
      && customer[key].length <= ({ name: 100, phone: 40, address: 500, emirate: 60 })[key]);
  const validLines = Array.isArray(body?.lines) && body.lines.length > 0 && body.lines.length <= 30
    && body.lines.every((line) => line && typeof line === "object" && !Array.isArray(line)
      && Number.isSafeInteger(Number(line.productId)) && Number(line.productId) >= 0
      && Number.isInteger(Number(line.qty)) && Number(line.qty) > 0 && Number(line.qty) <= 20
      && isOrderSize(line.size) && typeof line.color === "string" && line.color.trim().length > 0 && line.color.length <= 40);

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body?.requestId || "") || !validCustomer || !validLines || !["std", "exp"].includes(body?.shipping) || body?.payment !== "cod") {
    return NextResponse.json({ message: "Check the customer and order details." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("place_order", {
    p_request_id: body.requestId,
    p_customer: Object.fromEntries(Object.entries(customer).filter(([key]) => ["email", "name", "phone", "address", "emirate"].includes(key)).map(([key,value]) => [key, value.trim()])),
    p_lines: body.lines.map((line) => ({ productId: Number(line.productId), size: line.size, color: line.color, qty: Number(line.qty) })),
    p_shipping: body.shipping,
    p_payment: body.payment,
  });

  if (error) {
    if (error.code === "P0429") return NextResponse.json({ message: "Too many orders. Please try again shortly." }, { status: 429, headers: { "Retry-After": "60" } });
    const status = error.code === "P0001" ? 409 : error.code === "22023" ? 400 : 500;
    const message = error.code === "P0001" ? "Some items are unavailable or stock has changed."
      : error.code === "22023" ? "Check the customer and order details."
      : "Could not place the order.";
    return NextResponse.json({ message }, { status });
  }
  return NextResponse.json({ orderNumber: data });
}
