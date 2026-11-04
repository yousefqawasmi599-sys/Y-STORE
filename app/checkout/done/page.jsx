"use client";
import Link from "next/link";
import { useStore } from "@/components/Store";

export default function Done() {
  const { lastOrder } = useStore();
  return (
    <div className="wrap view done">
      {lastOrder ? (
        <>
          <svg className="done-mark" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
            <rect x="14" y="14" width="36" height="36" transform="rotate(45 32 32)" /><path d="m24 32.5 5.5 5.5L41 26.5" strokeWidth="1.4" />
          </svg>
          <div className="kicker">Thank you<span className="ar-i" lang="ar">شكراً لك</span></div>
          <h1 className="serif vh">Order confirmed</h1>
          <p className="done-number">Order number <strong>{lastOrder}</strong></p>
          <p>Keep this number with the email you used at checkout to follow your order. You pay in cash when it arrives.</p>
        </>
      ) : (
        <>
          <h1 className="serif vh">No recent order</h1>
          <p>There is no order to show. Start from the shop.</p>
        </>
      )}
      <div className="btns">
        {lastOrder && <Link className="btn" href={`/track?order=${encodeURIComponent(lastOrder)}`}>Track order</Link>}
        <Link className={lastOrder ? "btn ghost" : "btn"} href="/shop">Keep shopping</Link>
      </div>
    </div>
  );
}
