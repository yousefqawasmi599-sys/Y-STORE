import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { orderNumberPattern } from "@/lib/supabase/data";
import { rateLimit } from "@/lib/rate-limit";

const emailPattern = /^\S+@\S+\.\S+$/;
const notFound = () => NextResponse.json({ message: "No order matches that number and email." }, { status: 404 });

export async function POST(request) {
  if (!hasSupabaseConfig) return NextResponse.json({ message: "Order tracking is not configured." }, { status: 503 });
  const retryAfter = rateLimit(request, "track-order", { limit: 10, windowMs: 60_000 });
  if (retryAfter) return NextResponse.json({ message: "Too many lookups. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(retryAfter) } });

  const body = await request.json().catch(() => null);
  const orderNumber = typeof body?.orderNumber === "string" ? body.orderNumber.trim().toUpperCase() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!orderNumberPattern.test(orderNumber) || !emailPattern.test(email) || email.length > 254) {
    return NextResponse.json({ message: "Enter the order number from your confirmation (for example Y-1A2B3C4D) and the email used at checkout." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("track_order", { p_order_number: orderNumber, p_email: email });
  if (error?.code === "P0429") return NextResponse.json({ message: "Too many lookups. Please try again shortly." }, { status: 429, headers: { "Retry-After": "60" } });
  if (error?.code === "PGRST202") return NextResponse.json({ message: "Run supabase/customer_orders.sql in Supabase SQL Editor to enable order tracking." }, { status: 503 });
  if (error) return NextResponse.json({ message: "Could not look up the order." }, { status: 500 });
  if (!data) return notFound();
  return NextResponse.json({
    ...data,
    subtotal: Number(data.subtotal),
    delivery: Number(data.delivery),
    total: Number(data.total),
    lines: data.lines.map((line) => ({ ...line, price: Number(line.price) })),
  }, { headers: { "Cache-Control": "no-store" } });
}
