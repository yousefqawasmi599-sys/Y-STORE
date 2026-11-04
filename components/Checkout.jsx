"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { EMIRATES, getVariantStock, getProductImage } from "@/lib/products";
import { createOrder, friendlyErrorMessage, getStoreProducts } from "@/lib/api";
import { useStore } from "./Store";
import Field from "./Field";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export default function Checkout() {
  const { lines, unavailableCartLines, subtotal, clearCart, remove, setLastOrder, setCatalog, ready, shippingSettings, shippingSettingsError } = useStore();
  const router = useRouter();
  const [ship, setShip] = useState("std");
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const request = useRef(null);
  const delivery = ship === "exp" ? shippingSettings.express
    : subtotal >= shippingSettings.freeThreshold ? 0 : shippingSettings.standard;

  if (!ready) return null;
  if (unavailableCartLines.length) {
    return <div className="wrap view"><h1 className="serif vh">Checkout</h1><p role="alert">Some saved cart items are no longer available. Remove them before checkout.</p>{unavailableCartLines.map((line) => <p key={line.k}>Unavailable item × {line.q} <button className="rm" onClick={() => remove(line.k)}>Remove</button></p>)}</div>;
  }
  if (!lines.length) {
    return (
      <div className="wrap view">
        <h1 className="serif vh">Checkout</h1>
        <p className="empty" style={{ textAlign: "left" }}>Your cart is empty. <Link href="/shop" style={{ textDecoration: "underline" }}>Browse the shop</Link> to add something.</p>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (submitting.current) return;
    const form = e.currentTarget, f = Object.fromEntries(new FormData(form)), E = {};
    if (!/^\S+@\S+\.\S+$/.test(f.email || "")) E.email = "Enter a valid email, like name@example.com.";
    if (!f.name?.trim()) E.name = "Enter your full name.";
    if (!f.phone?.trim()) E.phone = "Enter a phone number.";
    if (!f.address?.trim()) E.address = "Enter your delivery address.";
    if (!f.emirate) E.emirate = "Choose an emirate.";
    setErr(E);
    const first = Object.keys(E)[0];
    if (first) return form.elements[first]?.focus();
    if (lines.some((line) => line.q > getVariantStock(line.p, line.size, line.color))) {
      setErr({ form: "Some cart quantities exceed the available stock. Update your cart and try again." });
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      const order = {
        customer: { email: f.email, name: f.name, phone: f.phone, address: f.address, emirate: f.emirate },
        lines: lines.map((l) => ({ productId: l.id, size: l.size, color: l.color, qty: l.q })),
        shipping: ship, payment: f.pay,
      };
      const fingerprint = JSON.stringify(order);
      let pending = request.current;
      try { pending = JSON.parse(sessionStorage.getItem("y-pending-order")) || pending; } catch {}
      if (!pending || pending.fingerprint !== fingerprint) pending = {fingerprint, id: crypto.randomUUID()};
      request.current = pending;
      sessionStorage.setItem("y-pending-order", JSON.stringify(pending));
      const { orderNumber } = await createOrder({...order, requestId: pending.id});
      sessionStorage.removeItem("y-pending-order");
      request.current = null;
      if (hasSupabaseConfig) {
        const fresh = await getStoreProducts().catch(() => null);
        if (fresh) setCatalog(fresh);
      } else if (!process.env.NEXT_PUBLIC_API_URL) {
        const quantities = lines.reduce((result, line) => ({ ...result, [line.id]: (result[line.id] || 0) + line.q }), {});
        setCatalog((items) => items.map((product) => quantities[product.id]
          ? { ...product, stock: Math.max(0, Number(product.stock ?? 18) - quantities[product.id]) }
          : product));
      }
      setLastOrder(orderNumber);
      clearCart();
      router.push("/checkout/done");
    } catch (ex) {
      setErr({ form: friendlyErrorMessage(ex, "Could not place your order. Please try again.") });
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="wrap view">
      <h1 className="serif vh">Checkout</h1>
      <form className="co" onSubmit={submit} noValidate>
        <div>
          <h2 className="co-step"><span>01</span>Contact &amp; address</h2>
          <Field label="Email" name="email" type="email" autoComplete="email" error={err.email} />
          <div className="two">
            <Field label="Full name" name="name" autoComplete="name" error={err.name} />
            <Field label="Phone" name="phone" type="tel" autoComplete="tel" error={err.phone} />
          </div>
          <Field label="Address" name="address" autoComplete="street-address" error={err.address} />
          <Field label="Emirate" error={err.emirate}>
            <select name="emirate" aria-invalid={!!err.emirate} defaultValue="">
              <option value="">Select</option>
              {EMIRATES.map((x) => <option key={x}>{x}</option>)}
            </select>
          </Field>
          <h2 className="co-step"><span>02</span>Delivery</h2>
          <label className="opt2"><span><input type="radio" name="ship" checked={ship === "std"} onChange={() => setShip("std")} /> Standard, 2 to 4 days</span><span>{subtotal >= shippingSettings.freeThreshold ? "Free" : `${shippingSettings.standard} AED`}</span></label>
          <label className="opt2"><span><input type="radio" name="ship" checked={ship === "exp"} onChange={() => setShip("exp")} /> Express, next day</span><span>{shippingSettings.express} AED</span></label>
          <h2 className="co-step"><span>03</span>Payment</h2>
          <label className="opt2"><span><input type="radio" name="pay" value="cod" defaultChecked /> Cash on delivery</span></label>
        </div>
        <aside className="sum">
          <h2 className="serif" style={{ margin: "0 0 12px", fontSize: 28 }}>Order summary</h2>
          {lines.map((l) => (
            <div className="ln" key={l.k}>
              <img src={getProductImage(l.p, l.color)} alt="" />
              <div><b>{l.p.name}</b><div style={{ fontSize: 12, color: "var(--muted)" }}>{l.color} / {l.size} × {l.q}</div></div>
              <div>{l.p.price * l.q} AED</div>
            </div>
          ))}
          <div className="row" style={{ marginTop: 14 }}><span>Subtotal</span><span>{subtotal} AED</span></div>
          <div className="row"><span>Delivery</span><span>{delivery ? delivery + " AED" : "Free"}</span></div>
          <div className="row t"><span>Total</span><strong>{subtotal + delivery} AED</strong></div>
          {(shippingSettingsError || err.form) && <p className="err" role="alert" style={{ marginTop: 12 }}>{shippingSettingsError || err.form}</p>}
          <button className="btn" style={{ width: "100%", marginTop: 16 }} disabled={busy || !!shippingSettingsError}>{busy ? "Placing order" : "Place order"}</button>
          <ul className="perks">
            <li>Pay in cash when your order arrives</li>
            <li>14-day returns on unworn items</li>
          </ul>
        </aside>
      </form>
    </div>
  );
}
