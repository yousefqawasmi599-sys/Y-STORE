"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getProductImage, productPath } from "@/lib/products";
import { useStore } from "./Store";
import useFocusTrap from "./useFocusTrap";

export default function SearchOverlay() {
  const { ui, closeAll, catalog } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const input = useRef();
  const dialog = useRef(null);
  useFocusTrap(dialog, ui.search, closeAll);
  useEffect(() => { if (ui.search) { setQ(""); input.current?.focus(); } }, [ui.search]);
  if (!ui.search) return null;
  const term = q.trim().toLowerCase();
  const list = catalog.filter((p) => p.active !== false && (!term || (p.name + " " + p.cat).toLowerCase().includes(term)));
  return (
    <div ref={dialog} className="srch" role="dialog" aria-modal="true" aria-label="Search" onClick={(e) => e.target === e.currentTarget && closeAll()}>
      <div className="sbox">
        <input ref={input} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search hoodies, tees, long sleeves" aria-label="Search products" autoComplete="off" />
        <div id="sres">
          {list.length === 0 && <p className="empty">No results. Try "hoodie" or "tee".</p>}
          {list.map((p) => (
            <button key={p.id} onClick={() => { closeAll(); router.push(productPath(p)); }}>
              <img src={getProductImage(p)} alt="" /><span>{p.name}</span><span>{p.price} AED</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
