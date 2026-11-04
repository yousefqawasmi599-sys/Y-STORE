"use client";
import { useStore } from "@/components/Store";
import ProductCard from "@/components/ProductCard";

export default function Wishlist() {
  const { wish, ready, catalog, toggleWish } = useStore();
  if (!ready) return null;
  const savedProducts = wish.map((id) => ({ id, product: catalog.find((product) => product.id === id) }));
  return (
    <div className="wrap view">
      <h1 className="serif vh">Wishlist</h1>
      {savedProducts.length ? <div className="grid">{savedProducts.map(({ id, product }) => product
        ? <ProductCard key={id} p={product} />
        : <article className="card unavailable-product" key={id}><h3>Saved item unavailable</h3><p>This product is no longer in the catalogue.</p><button className="btn ghost" onClick={() => toggleWish(id)}>Remove from wishlist</button></article>)}</div>
        : <p className="empty">Nothing saved yet. Tap the heart on a product to keep it here.</p>}
    </div>
  );
}
