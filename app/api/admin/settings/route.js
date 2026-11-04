import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { mapShippingSettings, validateShippingSettings } from "@/lib/supabase/data";

const columns = "standard_delivery_aed, express_delivery_aed, free_shipping_threshold_aed";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireAdmin();
  if (access.response) return access.response;
  const { data, error } = await access.supabase.from("store_settings").select(columns).eq("id", true).maybeSingle();
  if (error || !data) return NextResponse.json({ message: "Could not load delivery settings." }, { status: 500 });
  return NextResponse.json(mapShippingSettings(data), { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request) {
  const access = await requireAdmin();
  if (access.response) return access.response;
  const settings = validateShippingSettings(await request.json().catch(() => null));
  if (!settings) return NextResponse.json({ message: "Enter delivery amounts from 0 to 100,000 AED with up to two decimals." }, { status: 400 });
  const { data, error } = await access.supabase.from("store_settings")
    .update({ ...settings, updated_at: new Date().toISOString() })
    .eq("id", true)
    .select(columns)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ message: "Could not save delivery settings." }, { status: 500 });
  return NextResponse.json(mapShippingSettings(data));
}
