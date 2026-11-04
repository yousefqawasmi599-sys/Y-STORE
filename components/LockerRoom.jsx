"use client";
import { useEffect, useRef, useState } from "react";
import { getProductSizes, getVariantStock } from "@/lib/products";
import { useStore } from "./Store";

const productCategory = {
  hoodies: "hoodies",
  tshirts: "tees",
  long_sleeve: "long-sleeves",
  caps: "caps",
  headbands: "headbands",
};

function colorLabel(value) {
  return typeof value === "string"
    ? value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")
    : "";
}

export default function LockerRoom() {
  const frameRef = useRef(null);
  const [roomHtml, setRoomHtml] = useState("");
  const [loadError, setLoadError] = useState("");
  const { catalog, cart, add, open, toast } = useStore();

  useEffect(() => {
    const controller = new AbortController();
    fetch("/locker-room/room.html", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Locker Room returned ${response.status}.`);
        return response.text();
      })
      .then(setRoomHtml)
      .catch((error) => {
        if (error.name !== "AbortError") setLoadError("The 3D Locker Room could not be loaded. Please refresh and try again.");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const onMessage = (event) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (event.origin !== "null" && event.origin !== window.location.origin) return;
      if (!event.data || typeof event.data !== "object") return;

      if (event.data.type === "y-open-cart") {
        open("cart");
        return;
      }
      if (event.data.type !== "y-locker-add") return;

      const category = productCategory[event.data.category];
      const size = event.data.size;
      const color = colorLabel(event.data.color);
      if (!category || typeof size !== "string" || !color) return;

      const product = catalog.find((item) => item.cat === category && item.active !== false);
      if (!product) {
        toast("This Locker Room item is not in the current store catalog.");
        return;
      }
      if (!getProductSizes(product).includes(size)) {
        toast("Choose an available size before adding this item.");
        return;
      }
      if (!product.colors.some(([name]) => name === color)) {
        toast("This color is not available for the matching store item.");
        return;
      }
      const stock = getVariantStock(product, size, color);
      const currentQuantity = cart.find((line) =>
        line.id === product.id && line.size === size && line.color === color)?.q ?? 0;
      if (stock <= 0 || currentQuantity >= stock) {
        toast("No more units are available.");
        return;
      }
      if (!add(product.id, size, color)) {
        toast("This item could not be added to your cart.");
        return;
      }

      toast("Added to cart");
      open("cart");
    };

    addEventListener("message", onMessage);
    return () => removeEventListener("message", onMessage);
  }, [add, cart, catalog, open, toast]);

  if (loadError) return <p className="locker-room-loading" role="alert">{loadError}</p>;
  if (!roomHtml) return <p className="locker-room-loading" role="status">Loading the Y Locker Room…</p>;

  return (
    <iframe
      ref={frameRef}
      className="locker-room-frame"
      title="Y Store 3D Locker Room"
      srcDoc={roomHtml}
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
    />
  );
}
