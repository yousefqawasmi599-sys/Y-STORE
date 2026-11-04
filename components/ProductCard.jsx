"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProductImage, productPath } from "@/lib/products";
import { useStore } from "./Store";
import { HeartIcon } from "./Icons";

const MAX_DOTS = 5;

export default function ProductCard({ p }) {
  const { wish, toggleWish, open } = useStore();
  const router = useRouter();
  const saved = wish.includes(p.id);
  const soldOut = Number(p.stock ?? 18) <= 0;
  const href = productPath(p);
  return (
    <article className="card" onClick={() => router.push(href)}>
      <div className="img">
        <img src={getProductImage(p)} alt={p.name} />
        <button className="fav" aria-label={"Save " + p.name} aria-pressed={saved}
          onClick={(e) => { e.stopPropagation(); toggleWish(p.id); }}><HeartIcon filled={saved} /></button>
        {soldOut && <span className="sold-out">Sold out</span>}
        <button className="add" disabled={soldOut} onClick={(e) => { e.stopPropagation(); open("pdp", p.id); }}>{soldOut ? "Sold out" : "Quick view"}</button>
      </div>
      <h3><Link href={href} onClick={(e) => e.stopPropagation()}>{p.name}</Link></h3>
      {p.name_ar && <p lang="ar" dir="rtl">{p.name_ar}</p>}
      <p className="price">{p.price} AED</p>
      <div className="dots" aria-label={`${p.colors.length} colours`}>
        {p.colors.slice(0, MAX_DOTS).map(([n, c]) => <span key={n} style={{ background: c }} />)}
        {p.colors.length > MAX_DOTS && <small>+{p.colors.length - MAX_DOTS}</small>}
      </div>
    </article>
  );
}
