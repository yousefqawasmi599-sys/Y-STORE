import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { validateCategory } from "@/lib/supabase/data";

export async function PATCH(request, { params }) {
  const access = await requireAdmin();
  if (access.response) return access.response;
  const { slug } = await params;
  const category = validateCategory({ ...await request.json().catch(() => null), slug });
  if (!category) return NextResponse.json({ message: "Category details are invalid." }, { status: 400 });
  const { data, error } = await access.supabase.from("categories")
    .update({ label: category.label, img: category.img, active: category.active })
    .eq("slug", slug)
    .select("slug, label, img, active")
    .maybeSingle();
  if (error) return NextResponse.json({ message: error.code === "23505" ? "That category name already exists." : "Could not update the category." }, { status: 400 });
  if (!data) return NextResponse.json({ message: "Category not found." }, { status: 404 });
  return NextResponse.json(data);
}