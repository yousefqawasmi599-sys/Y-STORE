import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";

const contactStatuses = new Set(["Read", "Replied"]);

export async function PATCH(request, { params }) {
  const access = await requireAdmin();
  if (access.response) return access.response;
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1) {
    return NextResponse.json({ message: "Contact message was not found." }, { status: 404 });
  }
  const body = await request.json().catch(() => null);
  const status = body?.status ?? "Read";
  if (!contactStatuses.has(status)) return NextResponse.json({ message: "Contact status is invalid." }, { status: 400 });
  const { data, error } = await access.supabase.from("contact_messages")
    .update({ status })
    .eq("id", id)
    .select("id, status")
    .maybeSingle();
  if (error) return NextResponse.json({ message: "Could not update the message." }, { status: 500 });
  if (!data) return NextResponse.json({ message: "Contact message was not found." }, { status: 404 });
  return NextResponse.json(data);
}
