"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { getProductImage, getProductSizes, getVariantStock, productPath } from "@/lib/products";
import { useStore } from "./Store";
import useFocusTrap from "./useFocusTrap";
import { CloseIcon } from "./Icons";

const GUIDE = [["S", 54, 68], ["M", 57, 70], ["L", 60, 72], ["XL", 63, 74], ["XXL", 66, 76]];

// Starts on the first colour that has any size in stock.
export const firstInStockColor = (p) =>
  Math.max(0, p.colors.findIndex(([color]) => getProductSizes(p).some((size) => getVariantStock(p, size, color) > 0)));

// Colour, size and add-to-cart controls shared by the quick view and the product page.
export function ProductPurchase({ p, ci, setCi, Heading = "h2" }) {
  const { add, cart, open, toast, shippingSettings } = useStore();
  const [size, setSize] = useState("");
  const sizes = getProductSizes(p);
  const color = p.colors[ci][0];
  const stock = getVariantStock(p, size, color);
  const soldOut = size ? stock <= 0 : Number(p.stock ?? 18) <= 0;
  const submit = () => {
    const currentQty = cart.find((line) => line.id === p.id && line.size === size && line.color === color)?.q || 0;
    if (currentQty >= stock) { toast("No more units are available."); return; }
    if (!add(p.id, size, color)) { toast("This selection is unavailable."); return; }
    open("cart");
    toast("Added to cart");
  };
  return (
    <>
      <Heading className="serif">{p.name}</Heading>
      {p.name_ar && <p lang="ar" dir="rtl">{p.name_ar}</p>}
      <div className="pprice">{p.price} AED</div>
      <div className="lab">Colour: <span>{color}</span></div>
      <div className="opt">
        {p.colors.map(([n, c], i) => (
          <button key={n} className="sw" style={{ background: c }} aria-label={n} aria-pressed={i === ci} onClick={() => setCi(i)} />
        ))}
      </div>
      <div className="lab">Size</div>
      <div className="opt">
        {sizes.map((s) => <button key={s} className="sz" disabled={getVariantStock(p, s, color) <= 0} aria-pressed={s === size} onClick={() => setSize(s)}>{s}</button>)}
      </div>
      {sizes.length > 1 && <details>
        <summary>Size guide</summary>
        <table>
          <thead><tr><th>Size</th><th>Chest (cm)</th><th>Length (cm)</th></tr></thead>
          <tbody>{GUIDE.map(([s, c, l]) => <tr key={s}><td>{s}</td><td>{c}</td><td>{l}</td></tr>)}</tbody>
        </table>
      </details>}
      {p.description && <p className="pdesc">{p.description}</p>}
      <button className="btn" disabled={!size || soldOut} onClick={submit}>{soldOut ? "Sold out" : size ? "Add to cart" : "Select a size"}</button>
      <ul className="perks">
        <li>Free delivery over {shippingSettings.freeThreshold} AED</li>
        <li>Cash on delivery across the UAE</li>
        <li>14-day returns on unworn items</li>
      </ul>
    </>
  );
}

function Modal({ p }) {
  const { closeAll } = useStore();
  const [ci, setCi] = useState(() => firstInStockColor(p));
  const dialogRef = useRef(null);
  useFocusTrap(dialogRef, true, closeAll);
  return (
    <div className="pdp" role="dialog" aria-modal="true" aria-label="Product details" onClick={(e) => e.target === e.currentTarget && closeAll()}>
      <div className="pbox" ref={dialogRef} tabIndex={-1}>
        <button className="pclose" aria-label="Close" onClick={closeAll}><CloseIcon /></button>
        <img src={getProductImage(p, p.colors[ci][0])} alt={p.name} />
        <div className="pinfo">
          <ProductPurchase p={p} ci={ci} setCi={setCi} />
          <Link className="link pfull" href={productPath(p)} onClick={closeAll}>View full details</Link>
        </div>
      </div>
    </div>
  );
}

export default function ProductModal() {
  const { ui, catalog } = useStore();
  if (ui.pdp === null) return null;
  const product = catalog.find((item) => item.id === ui.pdp);
  return product ? <Modal key={ui.pdp} p={product} /> : null;
}
