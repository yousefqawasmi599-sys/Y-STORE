"use client";
import { useEffect, useRef } from "react";

// The small Y logo that follows the mouse on every page.
export default function CursorY() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const motionPreference = matchMedia("(prefers-reduced-motion:reduce)");
    let S = el.offsetWidth, tx = 0, ty = 0, x = 0, y = 0, rx = 0, ry = 0, g = 0, seen = false, raf;
    const move = (e) => {
      if (motionPreference.matches || (e.pointerType !== "mouse" && e.pointerType !== "pen")) return;
      S = el.offsetWidth; tx = e.clientX - S / 2; ty = e.clientY - S / 2;
      if (!seen) { x = tx; y = ty; seen = true; }
      el.classList.add("on");
    };
    const leave = () => el.classList.remove("on");
    const down = (e) => {
      if (motionPreference.matches || (e.pointerType !== "mouse" && e.pointerType !== "pen")) return;
      const d = document.createElement("span");
      d.className = "ripple"; d.style.left = e.clientX + "px"; d.style.top = e.clientY + "px";
      document.body.appendChild(d); setTimeout(() => d.remove(), 900); g = 1;
    };
    const clamp = (n) => Math.max(-38, Math.min(38, n));
    function tick() {
      if (motionPreference.matches) return;
      const dx = tx - x, dy = ty - y, k = 0.1;
      x += dx * k; y += dy * k;
      g += (Math.min(1, Math.hypot(dx, dy) / 160) - g) * 0.15;
      rx += (-dy * 0.22 - rx) * 0.1; ry += (dx * 0.22 - ry) * 0.1;
      el.style.setProperty("--g", g.toFixed(3));
      el.style.transform = `translate(${x}px,${y}px) perspective(600px) rotateX(${clamp(rx)}deg) rotateY(${clamp(ry)}deg) scale(${1 + g * 0.06})`;
      raf = requestAnimationFrame(tick);
    }
    const onMotionChange = () => {
      cancelAnimationFrame(raf);
      if (motionPreference.matches) {
        el.classList.remove("on");
        return;
      }
      tick();
    };
    addEventListener("pointermove", move);
    addEventListener("pointerdown", down);
    document.documentElement.addEventListener("pointerleave", leave);
    if (!motionPreference.matches) tick();
    else el.classList.remove("on");
    motionPreference.addEventListener("change", onMotionChange);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", move);
      removeEventListener("pointerdown", down);
      document.documentElement.removeEventListener("pointerleave", leave);
      motionPreference.removeEventListener("change", onMotionChange);
    };
  }, []);
  return (
    <div className="yfollow" ref={ref} aria-hidden="true">
      <svg viewBox="0 0 340 332">
        <circle cx="170" cy="185" r="135" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="3" />
        <g className="spin"><circle cx="170" cy="185" r="105" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth="3" strokeDasharray="3 14" strokeLinecap="round" /></g>
      </svg>
      <span className="ylogo" />
    </div>
  );
}
