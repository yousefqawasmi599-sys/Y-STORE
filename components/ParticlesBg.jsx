"use client";
import { useEffect, useRef } from "react";

export default function ParticlesBg() {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    const ctx = cv.getContext("2d");
    const mq = matchMedia("(prefers-reduced-motion:reduce)");
    let W = 0, H = 0, particles = [], raf = 0, last = 0, resizeTimer;
    const rnd = (a, b) => a + Math.random() * (b - a);

    function createParticles() {
      const count = Math.min(W < 700 ? 34 : 88, Math.round((W * H) / 22000));
      particles = Array.from({ length: count }, () => ({
        x: rnd(0, W), y: rnd(0, H), radius: rnd(0.45, 1.15),
        alpha: rnd(0.08, 0.2), angle: rnd(0, Math.PI * 2), speed: rnd(0.06, 0.18),
      }));
    }

    function size() {
      W = innerWidth; H = innerHeight;
      const dpr = Math.min(devicePixelRatio || 1, W < 700 ? 1.5 : 2);
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      createParticles();
    }

    function frame(t) {
      const dt = Math.min(0.05, (t - last) / 1000 || 0);
      last = t;
      ctx.clearRect(0, 0, W, H);
      for (const particle of particles) {
        if (!mq.matches) {
          particle.x += Math.cos(particle.angle) * particle.speed * dt * 60;
          particle.y += Math.sin(particle.angle) * particle.speed * dt * 60;
          if (particle.x < 0) particle.x = W;
          else if (particle.x > W) particle.x = 0;
          if (particle.y < 0) particle.y = H;
          else if (particle.y > H) particle.y = 0;
        }
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(172, 175, 181, ${particle.alpha})`;
        ctx.fill();
      }
      if (!mq.matches) raf = requestAnimationFrame(frame);
    }

    function start() {
      cancelAnimationFrame(raf); last = performance.now();
      if (mq.matches) frame(last); else raf = requestAnimationFrame(frame);
    }
    const onResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { size(); start(); }, 180); };
    const onVisibilityChange = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else start();
    };

    size();
    start();
    addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibilityChange);
    mq.addEventListener("change", start);
    return () => {
      cancelAnimationFrame(raf); clearTimeout(resizeTimer);
      removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      mq.removeEventListener("change", start);
    };
  }, []);
  return <canvas id="bgfx" ref={ref} aria-hidden="true" />;
}
