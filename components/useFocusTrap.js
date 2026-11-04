"use client";
import { useEffect, useRef } from "react";

const focusableSelector = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

export default function useFocusTrap(ref, active, onEscape) {
  const previousFocus = useRef(null);
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;

  useEffect(() => {
    if (!active || !ref.current) return undefined;
    const container = ref.current;
    previousFocus.current = document.activeElement;
    const focusable = () => [...container.querySelectorAll(focusableSelector)]
      .filter((element) => element.getClientRects().length > 0);
    const items = focusable();
    (items[0] || container).focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        escapeRef.current?.();
        return;
      }
      if (event.key !== "Tab") return;
      const current = focusable();
      if (!current.length) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = current[0];
      const last = current[current.length - 1];
      if (event.shiftKey && (document.activeElement === first || !container.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !container.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previousFocus.current?.isConnected) previousFocus.current.focus();
      previousFocus.current = null;
    };
  }, [active, ref]);
}
