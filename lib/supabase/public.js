import { createClient } from "@supabase/supabase-js";
import { products as demoProducts } from "@/lib/products";
import { getSupabaseConfig, hasSupabaseConfig } from "./config";
import { mapProduct } from "./data";

const columns = "id, name, name_ar, description, cat, price, img, colors, stock, variant_stock, active";

// Cookie-free reads of the public catalogue for metadata, structured data and the sitemap.
function publicClient() {
  const { url, anonKey } = getSupabaseConfig();
  return createClient(url, anonKey, { auth: { persistSession: false } });
}

export async function getPublicProduct(id) {
  if (!Number.isSafeInteger(id)) return null;
  if (!hasSupabaseConfig) return demoProducts.find((product) => product.id === id) || null;
  const { data, error } = await publicClient().from("products").select(columns).eq("id", id).eq("active", true).maybeSingle();
  if (error) throw error;
  return data ? mapProduct(data) : null;
}

export async function getPublicProducts() {
  if (!hasSupabaseConfig) return demoProducts;
  const { data, error } = await publicClient().from("products").select(columns).eq("active", true).order("id");
  if (error) throw error;
  return data.map(mapProduct);
}
