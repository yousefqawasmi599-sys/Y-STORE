"use client";
import { useStore } from "./Store";
import ProductCard from "./ProductCard";

export default function FeaturedProducts() {
  const { catalog } = useStore();
  const roomCategories = ["hoodies", "tees", "long-sleeves", "caps", "headbands"];
  const featured = roomCategories.map((category) =>
    catalog.find((product) => product.cat === category && product.active !== false)
  ).filter(Boolean);
  return <div className="grid rail">{featured.map((product) => <ProductCard key={product.id} p={product} />)}</div>;
}
