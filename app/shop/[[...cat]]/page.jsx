import { notFound } from "next/navigation";
import Shop from "@/components/Shop";

export async function generateMetadata({ params }) {
  const { cat } = await params;
  const category = cat?.[0];
  return {
    title: category ? `${category.replaceAll("-", " ")} collection` : "Shop streetwear",
    description: category
      ? `Shop Y's ${category.replaceAll("-", " ")} collection of Y signature streetwear.`
      : "Shop Y's signature hoodies, tees and everyday streetwear essentials.",
    alternates: { canonical: category ? `/shop/${category}` : "/shop" },
  };
}

export default async function ShopPage({ params }) {
  const { cat } = await params;
  if (cat?.length > 1) notFound();
  return <Shop categorySlug={cat?.[0] ?? null} />;
}
