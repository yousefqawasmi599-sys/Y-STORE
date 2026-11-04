"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const SLIDES = [
  { a: "Simply", b: "Y.", ar: "هويتك. بأسلوبك.", p: "Quiet details. A distinct signature. Essentials that feel like you.", img: "/images/hero.jpg", alt: "Y signature black hoodie with an off-white embroidered logo" },
  { a: "Your everyday", b: "signature.", ar: "بصمتك، كل يوم.", p: "Relaxed silhouettes and the Y mark. Your wardrobe, your way.", img: "/images/story.jpg", alt: "Model wearing a black Y signature tee and cap" },
  { a: "Less noise.", b: "More you.", ar: "تفاصيل هادئة. حضور واضح.", p: "Hoodies, tees and finishing touches. Discover the Y essentials.", img: "/images/products/enhanced/hoodies/hoodies_black.png", alt: "Classic black hoodie" },
];

export default function Hero() {
  const [n, setN] = useState(0);
  const [fade, setFade] = useState(false);
  const [paused, setPaused] = useState(false);
  const busy = useRef(false);

  const go = (d) => {
    if (busy.current) return;
    busy.current = true; setFade(true);
    setTimeout(() => { setN((v) => (v + d + SLIDES.length) % SLIDES.length); setFade(false); busy.current = false; }, 320);
  };
  useEffect(() => {
    if (paused || matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    const t = setInterval(() => go(1), 6500);
    return () => clearInterval(t);
  }, [paused]);

  const s = SLIDES[n], f = fade ? "sw1" : "";
  return (
    <div className="hero" id="hero" onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)}>
      <div className="bigar" aria-hidden="true" lang="ar">هوية</div>
      <div className="hctl">
        <button aria-label="Previous slide" onClick={() => go(-1)}>‹</button>
        <span>{`0${n + 1}`}</span>
        {/* Remounts with the slide timer so the fill restarts in step with it. */}
        <i className={"hprog" + (paused ? " paused" : "")} key={`${n}-${paused}`} aria-hidden="true" />
        <span>{`0${SLIDES.length}`}</span>
        <button aria-label="Next slide" onClick={() => go(1)}>›</button>
      </div>
      <div className="wrap">
        <div className="kicker">Premium streetwear<span className="ar-i" lang="ar">ستريت وير فاخر</span></div>
        <h1 className={"serif " + f}>{s.a}<br />{s.b}</h1>
        <div className={"h1ar " + f} lang="ar">{s.ar}</div>
        <p className={f}>{s.p}</p>
        <div className="btns">
          <Link className="btn" href="/shop">Shop now</Link>
          <Link className="link" href="/locker-room">Explore Y in 3D</Link>
          <a className="link" href="#story">Discover more</a>
        </div>
      </div>
      <div className="hero-art"><img className={f} src={s.img} alt={s.alt} /></div>
    </div>
  );
}
