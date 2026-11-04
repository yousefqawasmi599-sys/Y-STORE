import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await requireAdmin();
  if (result.response) return result.response;
  return NextResponse.json({ id: result.user.id, email: result.user.email, role: "admin" });
}