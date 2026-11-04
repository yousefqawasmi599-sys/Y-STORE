"use client";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { getProductImage } from "@/lib/products";
import { useStore } from "./Store";
import useFocusTrap from "./useFocusTrap";
import { BagIcon, CloseIcon } from "./Icons";

export default function CartDrawer() {
  const { ui, closeAll, lines, unavailableCartLines, subtotal, changeQty, remove, shippingSettings, shippingSettingsError } = useStore();
  const router = useRouter();
  const drawerRef = useRef(null);
  useFocusTrap(drawerRef, ui.cart, closeAll);
  const left = shippingSettings.freeThreshold - subtotal;
  return (
    <aside ref={drawerRef} className={"cart" + (ui.cart ? " on" : "")} role="dialog" aria-modal={ui.cart || undefined} aria-labelledby="cart-title" aria-hidden={!ui.cart} inert={!ui.cart} tabIndex={-1}>
      <div className="ch">
        <span className="serif" id="cart-title" style={{ fontSize: 26 }}>Your cart</span>
        <button onClick={closeAll} aria-label="Close cart"><CloseIcon /></button>
      </div>
      <div className="ship">
        {shippingSettingsError ? shippingSettingsError : left <= 0 ? "You get free shipping." : `Add ${left} AED more for free shipping.`}
        {!shippingSettingsError && <div className="bar2"><i style={{ width: Math.min(100, subtotal / shippingSettings.freeThreshold * 100) + "%" }} /></div>}
      </div>
      <div className="lines">
        {lines.length === 0 && unavailableCartLines.length === 0 && <div className="cart-empty">
          <BagIcon />
          <p className="serif">Your cart is empty</p>
          <span lang="ar">سلتك فارغة</span>
          <button className="btn ghost" onClick={() => { closeAll(); router.push("/shop"); }}>Shop the collection</button>
        </div>}
        {unavailableCartLines.map((line) => <div className="ln" key={line.k}>
          <div aria-hidden="true">—</div><div><b>Unavailable item</b><div style={{ fontSize: 12, color: "var(--muted)" }}>This product is no longer available.</div></div>
          <div>× {line.q}<br /><button className="rm" onClick={() => remove(line.k)}>Remove</button></div>
        </div>)}
        {lines.map((l) => (
          <div className="ln" key={l.k}>
            <img src={getProductImage(l.p, l.color)} alt="" />
            <div>
              <b>{l.p.name}</b>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{l.color} / {l.size}</div>
              <div className="qty">
                <button aria-label="Decrease" onClick={() => changeQty(l.k, -1)}>−</button>{l.q}
                <button aria-label="Increase" onClick={() => changeQty(l.k, 1)}>+</button>
              </div>
            </div>
            <div>{l.p.price * l.q} AED<br /><button className="rm" onClick={() => remove(l.k)}>Remove</button></div>
          </div>
        ))}
      </div>
      <div className="cf">
        <div className="tot"><span>Total</span><strong>{subtotal} AED</strong></div>
        <button className="btn" style={{ width: "100%" }} disabled={!lines.length || unavailableCartLines.length > 0}
          onClick={() => { closeAll(); router.push("/checkout"); }}>Checkout</button>
      </div>
    </aside>
  );
}
