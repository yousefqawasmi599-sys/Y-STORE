"use client";
import Link from "next/link";
import { useState } from "react";
import { getProductImage } from "@/lib/products";
import { useStore } from "./Store";
import ProductCard from "./ProductCard";
import { ProductPurchase, firstInStockColor } from "./ProductModal";

function View({ p }) {
  const { catalog, categories, shippingSettings } = useStore();
  const [ci, setCi] = useState(() => firstInStockColor(p));
  const category = categories.find((item) => item.slug === p.cat);
  const others = catalog.filter((item) => item.active !== false && item.id !== p.id);
  const related = [...others.filter((item) => item.cat === p.cat), ...others.filter((item) => item.cat !== p.cat)].slice(0, 4);
  return (
    <div className="wrap view product-page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/shop">Shop</Link>
        {category && <><span aria-hidden="true">/</span><Link href={`/shop/${category.slug}`}>{category.label}</Link></>}
        <span aria-hidden="true">/</span><span aria-current="page">{p.name}</span>
      </nav>
      <div className="pp">
        <figure className="pp-art"><img src={getProductImage(p, p.colors[ci][0])} alt={`${p.name} in ${p.colors[ci][0]}`} /></figure>
        <div className="pinfo pp-info">
          <ProductPurchase p={p} ci={ci} setCi={setCi} Heading="h1" />
          <details>
            <summary>Delivery &amp; returns</summary>
            <p>Standard delivery takes 2 to 4 working days across the UAE ({shippingSettings.standard} AED, free over {shippingSettings.freeThreshold} AED). Express next-day delivery is {shippingSettings.express} AED.</p>
            <p>Return unworn items within 14 days for an exchange or refund. <Link href="/shipping">Read the full policy</Link>.</p>
          </details>
        </div>
      </div>
      {related.length > 0 && <section className="related">
        <div className="head"><span>You may also like<span className="ar-i" lang="ar">قد يعجبك أيضاً</span></span><Link className="link" href="/shop">View all</Link></div>
        <div className="grid">{related.map((item) => <ProductCard key={item.id} p={item} />)}</div>
      </section>}
    </div>
  );
}

export default function ProductView({ id }) {
  const { catalog, ready } = useStore();
  if (!ready) return <div className="wrap view page-loading" role="status"><span className="logo" aria-hidden="true" /><span className="sr-only">Loading product…</span></div>;
  const product = catalog.find((item) => item.id === id && item.active !== false);
  if (!product) {
    return (
      <div className="wrap view lost">
        <h1 className="serif vh">Product unavailable</h1>
        <p>This piece is no longer in the collection.</p>
        <div className="btns"><Link className="btn" href="/shop">Browse the shop</Link></div>
      </div>
    );
  }
  return <View key={id} p={product} />;
}
