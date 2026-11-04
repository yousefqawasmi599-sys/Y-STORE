import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { DEFAULT_SHIPPING_SETTINGS } from "@/lib/shipping";
import { mapShippingSettings } from "@/lib/supabase/data";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasSupabaseConfig) return NextResponse.json(DEFAULT_SHIPPING_SETTINGS);
  const supabase = await createClient();
  const { data, error } = await supabase.from("store_settings")
    .select("standard_delivery_aed, express_delivery_aed, free_shipping_threshold_aed")
    .eq("id", true)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ message: "Could not load delivery settings." }, { status: 500 });
  return NextResponse.json(mapShippingSettings(data), { headers: { "Cache-Control": "no-store" } });
}
