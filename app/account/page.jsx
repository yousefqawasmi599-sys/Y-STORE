"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/components/Store";
import Field from "@/components/Field";
import OrderLines from "@/components/OrderLines";
import { cancelAccountOrder, friendlyErrorMessage, getAccountOrders, updateProfileName } from "@/lib/api";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export default function Account() {
  const { user, ready, logout, login, wish, toast } = useStore();
  const router = useRouter();
  const leaving = useRef(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(hasSupabaseConfig);
  const [ordersError, setOrdersError] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameError, setNameError] = useState("");
  const [busy, setBusy] = useState("");
  useEffect(() => { if (ready && !user && !leaving.current) router.replace("/login?next=/account"); }, [ready, user, router]);
  useEffect(() => {
    if (!hasSupabaseConfig || !ready || !user) { setOrdersLoading(false); return; }
    let cancelled = false;
    getAccountOrders().then((result) => { if (!cancelled) setOrders(result); })
      .catch((error) => { if (!cancelled) setOrdersError(friendlyErrorMessage(error, "Could not load your orders. Please try again.")); })
      .finally(() => { if (!cancelled) setOrdersLoading(false); });
    return () => { cancelled = true; };
  }, [ready, user]);

  const saveName = async (event) => {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") || "").trim();
    if (!name || name.length > 100) return setNameError("Enter a name up to 100 characters.");
    setBusy("name");
    setNameError("");
    try {
      const result = await updateProfileName(name);
      login({ ...user, name: result.name });
      setEditingName(false);
      toast("Name updated.");
    } catch (error) {
      setNameError(friendlyErrorMessage(error, "Could not update your name. Please try again."));
    } finally {
      setBusy("");
    }
  };

  const cancelOrder = async (orderNumber) => {
    if (!window.confirm(`Cancel order ${orderNumber}? This cannot be undone.`)) return;
    setBusy(orderNumber);
    try {
      await cancelAccountOrder(orderNumber);
      setOrders((items) => items.map((order) => order.orderNumber === orderNumber ? { ...order, status: "Cancelled" } : order));
      toast("Order cancelled.");
    } catch (error) {
      toast(error.status === 409 ? error.message : friendlyErrorMessage(error, error.message));
    } finally {
      setBusy("");
    }
  };

  if (!user) return null;
  return (
    <div className="wrap view"><div className="prose account">
      <div className="kicker">My account<span className="ar-i" lang="ar">حسابي</span></div>
      <h1 className="serif vh">Hello, {user.name}</h1>
      <h2 className="co-step"><span>01</span>Your details</h2>
      <p>{user.email}</p>
      {editingName ? (
        <form className="account-name-form" onSubmit={saveName} noValidate>
          <Field label="Your name" name="name" defaultValue={user.name} maxLength={100} autoComplete="name" autoFocus error={nameError} />
          <div className="btns">
            <button className="btn" disabled={busy === "name"}>{busy === "name" ? "Saving" : "Save name"}</button>
            <button type="button" className="btn ghost" onClick={() => { setEditingName(false); setNameError(""); }}>Cancel</button>
          </div>
        </form>
      ) : <button className="account-link" onClick={() => setEditingName(true)}>Edit name</button>}
      <h2 className="co-step"><span>02</span>Wishlist</h2>
      <p>{wish.length ? `${wish.length} ${wish.length === 1 ? "piece" : "pieces"} saved.` : "Nothing saved yet. Tap the heart on a product to keep it here."}</p>
      <h2 className="co-step"><span>03</span>Order history</h2>
      {!hasSupabaseConfig ? <p>Order history will appear here once the store is connected to a backend.</p>
        : ordersLoading ? <p>Loading your orders...</p>
          : ordersError ? <p role="alert">{ordersError}</p>
            : orders.length ? <div className="account-orders">{orders.map((order) => (
              <details key={order.orderNumber}>
                <summary>
                  <strong>{order.orderNumber}</strong>
                  <span>{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ""}</span>
                  <span className={`order-status status-${String(order.status).toLowerCase()}`}>{order.status}</span>
                  <b>{order.total} AED</b>
                </summary>
                <OrderLines order={order} />
                {order.status === "New" && <button className="btn ghost" disabled={busy === order.orderNumber} onClick={() => cancelOrder(order.orderNumber)}>{busy === order.orderNumber ? "Cancelling" : "Cancel order"}</button>}
              </details>
            ))}</div>
              : <p>No orders yet.</p>}
      <div className="btns" style={{ marginTop: 24 }}>
        <Link className="btn" href="/wishlist">View wishlist</Link>
        <button className="btn ghost" onClick={async () => { leaving.current = true; try { await logout(); toast("You are logged out."); router.push("/"); } catch { leaving.current = false; toast("Could not log out. Try again."); } }}>Log out</button>
      </div>
    </div></div>
  );
}
