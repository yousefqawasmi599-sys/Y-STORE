import Link from "next/link";
import Hero from "@/components/Hero";
import FeaturedProducts from "@/components/FeaturedProducts";
import CategoryTiles from "@/components/CategoryTiles";
import Newsletter from "@/components/Newsletter";

export const metadata = {
  title: "Signature Streetwear",
  description: "Explore Y signature streetwear, relaxed essentials and everyday pieces.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <div id="top">
      <Hero />
      <div className="orn" aria-hidden="true"><i /><svg viewBox="0 0 24 24" fill="none" stroke="#d9d3c7" strokeWidth="1"><rect x="6" y="6" width="12" height="12" /><rect x="6" y="6" width="12" height="12" transform="rotate(45 12 12)" /></svg><i /></div>
      <section id="shop">
        <div className="wrap">
          <div className="head"><span>Featured products<span className="ar-i" lang="ar">منتجات مميزة</span></span><Link className="link" href="/shop">View all</Link></div>
          <FeaturedProducts />
        </div>
      </section>
      <div className="story" id="story">
        <div className="photo"><img src="/images/story.jpg" alt="Model wearing the Y signature black tee and cap" /></div>
        <div className="copy">
          <div className="kicker" style={{ marginBottom: 12 }}>Our story<span className="ar-i" lang="ar">قصتنا</span></div>
          <h2 className="serif">Your style.<br />Your signature.</h2>
          <p className="ar" lang="ar">أسلوبك هو هويتك.</p>
          <p>Y brings together relaxed silhouettes, understated colours and a signature that stands on its own. Everyday pieces, made part of your own style.</p>
          <Link className="btn ghost" href="/about">Learn more</Link>
        </div>
        <CategoryTiles />
      </div>
      <Newsletter />
    </div>
  );
}
