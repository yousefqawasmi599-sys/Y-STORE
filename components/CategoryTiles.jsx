"use client";
import Link from "next/link";
import { useStore } from "./Store";

export default function CategoryTiles() {
  const { categories } = useStore();
  const activeCategories = categories.filter((category) => category.active !== false);
  if (!activeCategories.length) return null;

  return <div className="side" id="cats">{activeCategories.map((category) => (
    <Link key={category.slug} className="cat" href={`/shop/${category.slug}`} style={{ background: `linear-gradient(transparent 40%,#0b0c0e 100%),url(${category.img}) center/cover` }}>
      <h4 className="serif">{category.label}</h4><span>Shop now</span>
    </Link>
  ))}</div>;
}