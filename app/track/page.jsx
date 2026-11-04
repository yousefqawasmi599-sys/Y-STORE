"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Field from "@/components/Field";
import OrderLines from "@/components/OrderLines";
import { useStore } from "@/components/Store";
import { friendlyErrorMessage, trackOrder } from "@/lib/api";

const steps = ["New", "Processing", "Shipped", "Completed"];

export default function TrackOrderPage() {
  const { lastOrder } = useStore();
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("order");
    setOrderNumber((current) => current || fromUrl || lastOrder || "");
  }, [lastOrder]);

  const submit = async (event) => {
    event.preventDefault();
    const number = orderNumber.trim().toUpperCase();
    const nextErrors = {};
    if (!/^Y-[0-9A-F]{8}$/.test(number)) nextErrors.orderNumber = "Use the number from your confirmation, for example Y-1A2B3C4D.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) nextErrors.email = "Enter the email used at checkout.";
    setErrors(nextErrors);
    setOrder(null);
    if (Object.keys(nextErrors).length) return;
    setBusy(true);
    try {
      setOrder(await trackOrder({ orderNumber: number, email: email.trim() }));
    } catch (error) {
      setErrors({ form: error.status === 404 ? "No order matches that number and email." : friendlyErrorMessage(error, error.message) });
    } finally {
      setBusy(false);
    }
  };

  const reached = order ? steps.indexOf(order.status) : -1;
  return (
    <div className="wrap view"><div className="prose">
      <div className="kicker">Support<span className="ar-i" lang="ar">تتبع طلبك</span></div>
      <h1 className="serif vh">Track your order</h1>
      <p>Enter your order number and the email you used at checkout.</p>
      <form className="track-form" onSubmit={submit} noValidate>
        <Field label="Order number" name="orderNumber" value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} placeholder="Y-1A2B3C4D" autoCapitalize="characters" spellCheck={false} error={errors.orderNumber} />
        <Field label="Email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} error={errors.email} />
        {errors.form && <p role="alert" className="err">{errors.form}</p>}
        <button className="btn" disabled={busy}>{busy ? "Checking" : "Track order"}</button>
      </form>
      {order && (
        <section className="track-result" aria-live="polite">
          <h3>{order.orderNumber}</h3>
          <p>Placed {new Date(order.createdAt).toLocaleDateString()} · {order.customer?.emirate}</p>
          {order.status === "Cancelled" ? <p className="order-status status-cancelled">This order was cancelled.</p> : (
            <ol className="track-steps">
              {steps.map((step, index) => <li key={step} className={index <= reached ? "done" : ""} aria-current={index === reached ? "step" : undefined}>{step}</li>)}
            </ol>
          )}
          <OrderLines order={order} />
        </section>
      )}
      <p style={{ marginTop: 24, fontSize: 13 }}>Have an account? <Link href="/account" style={{ textDecoration: "underline" }}>See all your orders</Link></p>
    </div></div>
  );
}
