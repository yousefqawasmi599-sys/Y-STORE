"use client";
import Link from "next/link";
import { useStore } from "./Store";

export default function Footer() {
  const { categories } = useStore();
  return (
    <footer>
      <div className="wrap">
        <div className="fbrand">
          <span className="logo" role="img" aria-label="Y" />
          <p className="serif">Your style. Your signature.</p>
          <p className="ar" lang="ar">أسلوبك هو هويتك.</p>
        </div>
        <div><h5>Shop<span className="ar-i" lang="ar" style={{ fontSize: 14 }}>المتجر</span></h5><ul>
          {categories.filter((category) => category.active !== false).map((category) => <li key={category.slug}><Link href={`/shop/${category.slug}`}>{category.label}</Link></li>)}
        </ul></div>
        <div><h5>About<span className="ar-i" lang="ar" style={{ fontSize: 14 }}>عنّا</span></h5><ul>
          <li><Link href="/locker-room">Y Room 3D</Link></li>
          <li><Link href="/about">Our Story</Link></li>
          <li><Link href="/contact">Contact</Link></li></ul></div>
        <div><h5>Support<span className="ar-i" lang="ar" style={{ fontSize: 14 }}>الدعم</span></h5><ul>
          <li><Link href="/track">Track Order</Link></li>
          <li><Link href="/shipping">Shipping &amp; Returns</Link></li>
          <li><Link href="/privacy">Privacy Policy</Link></li>
          <li><Link href="/terms">Terms &amp; Conditions</Link></li></ul></div>
      </div>
      <div className="wrap fbottom">
        <span>© {new Date().getFullYear()} Y. All rights reserved.</span>
        <span>Prices in AED · Delivery across the UAE</span>
      </div>
    </footer>
  );
}
