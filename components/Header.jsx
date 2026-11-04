"use client";
import Link from "next/link";
import { useRef } from "react";
import { useStore } from "./Store";
import useFocusTrap from "./useFocusTrap";
import { BagIcon, HeartIcon, SearchIcon, UserIcon } from "./Icons";

export default function Header() {
  const { ui, open, closeAll, count, user, categories, isAdmin, adminChecked, shippingSettings } = useStore();
  const menuRef = useRef(null);
  useFocusTrap(menuRef, ui.menu, closeAll);
  const anyOpen = ui.cart || ui.menu;
  const categoryLinks = categories.filter((category) => category.active !== false).map((category) => ({
    href: `/shop/${category.slug}`, label: category.label, ar: "",
  }));
  const mainLinks = [
    { href: "/", label: "Home", ar: "الرئيسية" },
    { href: "/shop", label: "Shop", ar: "المتجر" },
    ...categoryLinks.slice(0, 2),
    { href: "/locker-room", label: "Y Room 3D", ar: "غرفة عرض Y" },
    { href: "/about", label: "Our Story", ar: "قصتنا" },
  ];
  const menuLinks = [mainLinks[0], mainLinks[1], ...categoryLinks, mainLinks[mainLinks.length - 2], mainLinks[mainLinks.length - 1]];
  return (
    <>
      <div className="bar">Free shipping on orders over {shippingSettings.freeThreshold} AED</div>
      <header>
        <div className="wrap nav">
          <button className="burger" aria-label={ui.menu ? "Close menu" : "Open menu"} aria-expanded={ui.menu} aria-controls="menu"
            onClick={() => (ui.menu ? closeAll() : open("menu"))}>
            <span /><span />
          </button>
          <ul>{mainLinks.map(({ href, label, ar }) => <li key={href}><Link href={href}>{label}{ar && <span className="ar-s" lang="ar">{ar}</span>}</Link></li>)}</ul>
          <Link href="/" aria-label="Y home">
            <span className="logo" role="img" aria-label="Y" />
          </Link>
          <div className="icons">
            <button aria-label="Search" onClick={() => open("search")}><SearchIcon /></button>
            <Link href="/wishlist" aria-label="Wishlist"><HeartIcon /></Link>
            <Link href={user ? "/account" : "/login"} aria-label={user ? "My account" : "Log in"}><UserIcon /></Link>
            <button aria-label={`Open cart, ${count} items`} data-cart-button onClick={() => open("cart")}><BagIcon />{count > 0 && <span className="count">{count}</span>}</button>
            {adminChecked && isAdmin && <Link className="admin-header-link" href="/admin" aria-label="Admin dashboard">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="8" height="8" /><rect x="13" y="3" width="8" height="5" /><rect x="13" y="10" width="8" height="11" /><rect x="3" y="13" width="8" height="8" /></svg>
              <span>Admin</span>
            </Link>}
          </div>
        </div>
      </header>
      <div className={"veil" + (anyOpen ? " on" : "")} onClick={closeAll} aria-hidden="true" />
      <nav ref={menuRef} className={"menu" + (ui.menu ? " on" : "")} id="menu" aria-label="Main menu" aria-hidden={!ui.menu} inert={!ui.menu} tabIndex={-1} onClick={(e) => e.target.closest("a") && closeAll()}>
        {menuLinks.map(({ href, label, ar }) => <Link key={href} href={href}>{label}{ar && <span className="ar-i" lang="ar">{ar}</span>}</Link>)}
        <Link href="/wishlist">Wishlist<span className="ar-i" lang="ar">المفضلة</span></Link>
        <Link href={user ? "/account" : "/login"}>{user ? "My account" : "Log in"}</Link>
        {adminChecked && isAdmin && <Link href="/admin">Admin<span className="ar-i" lang="ar">لوحة التحكم</span></Link>}
      </nav>
    </>
  );
}
