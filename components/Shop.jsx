"use client";
import Link from "next/link";
import { useState } from "react";
import ProductCard from "./ProductCard";
import { useStore } from "./Store";

export default function Shop({ categorySlug }) {
  const { catalog, categories } = useStore();
  const [sort, setSort] = useState("f");
  const [max, setMax] = useState(500);
  const activeCategories = categories.filter((category) => category.active !== false);
  const currentCategory = activeCategories.find((category) => category.slug === categorySlug);
  let list = catalog.filter((p) => p.active !== false && (!categorySlug || p.cat === categorySlug) && p.price <= max);
  if (sort === "a") list = [...list].sort((x, y) => x.price - y.price);
  if (sort === "d") list = [...list].sort((x, y) => y.price - x.price);
  return (
    <div className="wrap view">
      <div className="kicker">The collection<span className="ar-i" lang="ar">المجموعة</span></div>
      <div className="shop-head">
        <h1 className="serif vh">{categorySlug ? currentCategory?.label || "Category unavailable" : "All products"}</h1>
        <span>{list.length} {list.length === 1 ? "piece" : "pieces"}</span>
      </div>
      <div className="filters">
        <div className="chips">
          <Link className="chip" href="/shop" aria-pressed={!categorySlug}>All</Link>
          {activeCategories.map((category) => (
            <Link key={category.slug} className="chip" href={`/shop/${category.slug}`} aria-pressed={category.slug === categorySlug}>{category.label}</Link>
          ))}
        </div>
        <div className="filter-tools">
          <select aria-label="Sort products" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="f">Featured</option>
            <option value="a">Price: low to high</option>
            <option value="d">Price: high to low</option>
          </select>
          <label>
            Up to <output>{max}</output> AED{" "}
            <input type="range" min="200" max="500" step="10" value={max} onChange={(e) => setMax(+e.target.value)} />
          </label>
        </div>
      </div>
      <div className="grid">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      {list.length === 0 && <p className="empty">No products match. Raise the price limit or pick another category.</p>}
    </div>
  );
}
