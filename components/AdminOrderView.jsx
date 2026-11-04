"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getAdminOrder } from "@/lib/api";

const money = (value) => `${Number(value || 0).toLocaleString()} AED`;

export default function AdminOrderView({ orderNumber, invoice = false }) {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getAdminOrder(orderNumber)
      .then((data) => { if (!cancelled) setOrder(data); })
      .catch((exception) => { if (!cancelled) setError(exception.message); });
    return () => { cancelled = true; };
  }, [orderNumber]);

  if (error) return <main className="admin-order-loading"><strong>{error}</strong><Link href="/admin">Back to admin</Link></main>;
  if (!order) return <main className="admin-order-loading">Loading order...</main>;

  return (
    <main className={`admin-order-page${invoice ? " admin-invoice" : ""}`}>
      <div className="admin-order-actions">
        <Link className="admin-secondary" href="/admin">← Admin</Link>
        {!invoice && <Link className="admin-secondary" href={`/admin/orders/${encodeURIComponent(order.orderNumber)}/invoice`}>Print invoice</Link>}
        <button className="admin-primary" onClick={() => window.print()}>Print</button>
      </div>
      <header className="admin-invoice-heading">
        <div><span className="admin-eyebrow">Y STORE · ORDER</span><h1>Order {order.orderNumber}</h1></div>
        <span className={`admin-status ${order.status === "Cancelled" ? "inactive" : "active"}`}>{order.status}</span>
      </header>
      <div className="admin-order-customer">
        <section><h2>Customer</h2><p>{order.customer?.name}</p><p>{order.customer?.email}</p><p>{order.customer?.phone}</p></section>
        <section><h2>Delivery address</h2><p>{order.customer?.address}</p><p>{order.customer?.emirate}</p><p>{order.shipping === "exp" ? "Express delivery" : "Standard delivery"}</p></section>
        <section><h2>Order details</h2><p>Placed {order.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}</p><p>Payment: {order.payment === "cod" ? "Cash on delivery" : "Card on delivery"}</p></section>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table admin-order-items"><thead><tr><th>ITEM</th><th>SIZE</th><th>COLOUR</th><th>QTY</th><th>UNIT PRICE</th><th>LINE TOTAL</th></tr></thead>
          <tbody>{order.lines.map((line, index) => <tr key={`${line.id}-${line.size}-${line.color}-${index}`}><td>{line.name}</td><td>{line.size}</td><td>{line.color}</td><td>{line.q}</td><td>{money(line.price)}</td><td>{money(line.price * line.q)}</td></tr>)}</tbody>
        </table>
      </div>
      <dl className="admin-order-totals"><div><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div><div><dt>Delivery</dt><dd>{money(order.delivery)}</dd></div><div><dt>Total</dt><dd>{money(order.total)}</dd></div></dl>
    </main>
  );
}
