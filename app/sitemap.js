import { DEFAULT_CATEGORIES, productPath, products as demoProducts } from "@/lib/products";
import { PAGES } from "@/lib/pages";
import { getPublicProducts } from "@/lib/supabase/public";

const siteUrl = process.env.SITE_URL || "http://localhost:3000";
// Refresh hourly so new products appear without a redeploy.
export const revalidate = 3600;

export default async function sitemap() {
  const catalogue = await getPublicProducts().catch(() => demoProducts);
  const routes = [
    "",
    "/shop",
    "/locker-room",
    "/track",
    ...DEFAULT_CATEGORIES.map(({ slug }) => `/shop/${slug}`),
    ...Object.keys(PAGES).map((slug) => `/${slug}`),
    ...catalogue.map(productPath),
  ];

  return routes.map((route) => ({
    url: new URL(route, siteUrl).toString(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/shop" ? 0.9 : route.startsWith("/product/") ? 0.8 : route === "/locker-room" ? 0.7 : 0.6,
  }));
}
