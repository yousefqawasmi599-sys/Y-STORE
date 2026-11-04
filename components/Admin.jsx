"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useStore } from "./Store";
import { downloadNewsletterCsv, getAdminCategories, getAdminContacts, getAdminNewsletter, getAdminOrders, getAdminProducts, getAdminProfile, getAdminShippingSettings, saveAdminCategory, saveAdminOrderStatus, saveAdminProduct, saveAdminShippingSettings, setAdminContactStatus } from "@/lib/api";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { DEFAULT_SHIPPING_SETTINGS } from "@/lib/shipping";
import { createClient } from "@/lib/supabase/client";
import useFocusTrap from "./useFocusTrap";

const statuses = ["New", "Processing", "Shipped", "Completed", "Cancelled"];
const money = (value) => `${Number(value || 0).toLocaleString()} AED`;
const slugify = (value) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const readOrders = () => {
  try {
    const value = JSON.parse(localStorage.getItem("y-orders") || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export default function Admin() {
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageStatus, setImageStatus] = useState("loading");
  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setNotice("Choose a PNG, JPEG or WebP image up to 5 MB."); return;
    }
    setUploadingImage(true);
    try {
      const storage = createClient().storage.from("product-images");
      const extension = {"image/png":"png", "image/jpeg":"jpg", "image/webp":"webp"}[file.type];
      const filename = `${crypto.randomUUID()}.${extension}`;
      const {error} = await storage.upload(filename, file, {contentType:file.type, upsert:false});
      if (error) throw error;
      const url = storage.getPublicUrl(filename).data.publicUrl;
      setImageStatus("loading");
      setForm((current) => current ? { ...current, img: url } : current);
      setNotice("Image uploaded. Save the product to use it.");
    } catch { setNotice("Image upload failed. Check your admin access and try again."); }
    finally { setUploadingImage(false); }
  };
  const { catalog, setCatalog, categories, setCategories, ready } = useStore();
  const [section, setSection] = useState("overview");
  const [orders, setOrders] = useState([]);
  const [ordersReady, setOrdersReady] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [contactPage, setContactPage] = useState(0);
  const [newsletterPage, setNewsletterPage] = useState(0);
  const [contactsHasMore, setContactsHasMore] = useState(false);
  const [newsletterHasMore, setNewsletterHasMore] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const [csvBusy, setCsvBusy] = useState(false);
  const [shippingForm, setShippingForm] = useState(null);
  const [shippingBusy, setShippingBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState(null);
  const [categoryForm, setCategoryForm] = useState(null);
  const [colorsText, setColorsText] = useState("");
  const [notice, setNotice] = useState("");
  const [access, setAccess] = useState(hasSupabaseConfig ? "checking" : "demo");
  const editorRef = useRef(null);
  useFocusTrap(editorRef, Boolean(form || categoryForm), () => { setForm(null); setCategoryForm(null); });

  useEffect(() => {
    document.body.classList.add("admin-mode");
    return () => document.body.classList.remove("admin-mode");
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!hasSupabaseConfig) {
      setCatalog((items) => items.map((item) => ({ ...item, stock: Number.isFinite(Number(item.stock)) ? Number(item.stock) : 18 })));
      setOrders(readOrders());
      setOrdersReady(true);
      setAccess("demo");
      return;
    }

    let cancelled = false;
    Promise.all([getAdminProfile(), getAdminProducts(), getAdminOrders(), getAdminCategories()])
      .then(([, products, savedOrders, savedCategories]) => {
        if (cancelled) return;
        setCatalog(products);
        setOrders(savedOrders);
        setCategories(savedCategories);
        setAccess("admin");
      })
      .catch((error) => {
        if (cancelled) return;
        setAccess(error.status === 401 ? "unauthenticated" : error.status === 403 ? "forbidden" : error.status === 503 ? "setup" : "error");
        setNotice(error.message);
      })
      .finally(() => { if (!cancelled) setOrdersReady(true); });
    return () => { cancelled = true; };
  }, [ready, setCatalog, setCategories]);

  useEffect(() => {
    if (ordersReady && !hasSupabaseConfig) localStorage.setItem("y-orders", JSON.stringify(orders));
  }, [orders, ordersReady]);

  useEffect(() => {
    if (access !== "admin" || !["contacts", "newsletter"].includes(section)) return;
    let cancelled = false;
    setDataLoading(true);
    setDataError("");
    if (section === "contacts") {
      getAdminContacts(0).then((result) => {
        if (cancelled) return;
        setContacts(result.items);
        setContactsHasMore(result.hasMore);
        setContactPage(0);
      }).catch((error) => { if (!cancelled) setDataError(error.message); })
        .finally(() => { if (!cancelled) setDataLoading(false); });
    } else {
      getAdminNewsletter(0).then((result) => {
        if (cancelled) return;
        setSubscribers(result.items);
        setNewsletterHasMore(result.hasMore);
        setNewsletterPage(0);
      }).catch((error) => { if (!cancelled) setDataError(error.message); })
        .finally(() => { if (!cancelled) setDataLoading(false); });
    }
    return () => { cancelled = true; };
  }, [access, section]);

  useEffect(() => {
    if (section !== "settings" || shippingForm) return;
    if (access !== "admin") { setShippingForm(DEFAULT_SHIPPING_SETTINGS); return; }
    let cancelled = false;
    setDataLoading(true);
    setDataError("");
    getAdminShippingSettings().then((result) => { if (!cancelled) setShippingForm(result); })
      .catch((error) => { if (!cancelled) setDataError(error.message); })
      .finally(() => { if (!cancelled) setDataLoading(false); });
    return () => { cancelled = true; };
  }, [access, section, shippingForm]);

  const activeProducts = catalog.filter((product) => product.active !== false);
  const lowStock = activeProducts.filter((product) => Number(product.stock) <= 5);
  const revenue = orders.filter((order) => order.status !== "Cancelled").reduce((sum, order) => sum + Number(order.total || 0), 0);
  const filteredProducts = catalog.filter((product) => `${product.name} ${product.cat}`.toLowerCase().includes(query.toLowerCase()));
  const filteredOrders = orders.filter((order) => {
    const matchesQuery = `${order.orderNumber} ${order.customer?.name} ${order.customer?.email}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (statusFilter === "all" || order.status === statusFilter);
  });

  const startProductForm = (product = null) => {
    setImageStatus("loading");
    setForm(product ? { ...product } : {
      id: null, name: "", name_ar: "", description: "", cat: categories.find((category) => category.active !== false)?.slug || "", price: "", stock: 0, img: "/images/products/enhanced/hoodies/hoodies_black.png", active: true,
    });
    setColorsText(product?.colors?.map(([name, color]) => `${name}:${color}`).join(", ") || "Black:#111111, White:#ece8e1");
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    if (uploadingImage) return;
    if (imageStatus !== "loaded") { setNotice("Wait for the image preview to load. If it fails, upload an image or use a valid HTTPS/local image path."); return; }
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") || "").trim();
    const price = Number(formData.get("price"));
    const stock = Number(formData.get("stock"));
    const colors = colorsText.split(",").map((entry) => {
      const [label, value] = entry.split(":").map((part) => part.trim());
      return label && value ? [label, value] : null;
    }).filter(Boolean);

    if (!name || !categories.some((category) => category.slug === formData.get("cat") && category.active !== false)
      || !Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0 || colors.length === 0) {
      setNotice("Check the product name, price, stock quantity, and colour format.");
      return;
    }

    const product = {
      id: form.id === null && hasSupabaseConfig ? null : form.id ?? Math.max(0, ...catalog.map((item) => Number(item.id) || 0)) + 1,
      name,
      name_ar: String(formData.get("name_ar") || "").trim(),
      description: String(formData.get("description") || "").trim(),
      cat: String(formData.get("cat")),
      price,
      stock,
      img: String(formData.get("img") || "").trim() || "/images/products/enhanced/hoodies/hoodies_black.png",
      colors,
      variant_stock: (() => {
        const result = {};
        for (const line of String(formData.get("variants") || "").split("\n").filter(line => line.trim())) {
          const [color, size, qty, extra] = line.split("|").map(part => part.trim());
          if (extra !== undefined || !color || !size || qty === "" || !Number.isSafeInteger(Number(qty)) || Number(qty) < 0 || result[`${color}|${size}`] !== undefined) return null;
          result[`${color}|${size}`] = Number(qty);
        }
        return result;
      })(),
      active: form.active !== false,
    };
    try {
      if (!product.variant_stock) throw new Error("Check inventory rows: Colour|Size|Quantity.");
      product.stock = Object.values(product.variant_stock).reduce((sum, qty) => sum + qty, 0);
      const savedProduct = hasSupabaseConfig ? await saveAdminProduct(product) : product;
      setCatalog((items) => form.id === null ? [...items, savedProduct] : items.map((item) => item.id === form.id ? savedProduct : item));
      setForm(null);
      setNotice(form.id === null ? "Product added to the catalogue." : "Product changes saved.");
    } catch (error) {
      setNotice(error.message);
    }
  };

  const startCategoryForm = (category = null) => {
    setCategoryForm(category
      ? { id: category.slug, label: category.label, img: category.img }
      : { id: null, label: "", img: "/images/cat-1.jpg" });
  };

  const saveCategory = async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const label = String(values.get("label") || "").trim();
    const img = String(values.get("img") || "").trim() || "/images/cat-1.jpg";
    const slug = categoryForm.id || slugify(label) || `category-${Date.now().toString(36)}`;
    if (!label || label.length > 60 || slug.length > 60) {
      setNotice("Enter a category name between 1 and 60 characters.");
      return;
    }

    const category = { id: categoryForm.id, slug, label, img, active: true };
    try {
      const savedCategory = hasSupabaseConfig ? await saveAdminCategory(category) : { slug, label, img, active: true };
      setCategories((items) => categoryForm.id
        ? items.map((item) => item.slug === categoryForm.id ? savedCategory : item)
        : [...items, savedCategory]);
      setCategoryForm(null);
      setNotice(categoryForm.id ? "Category updated." : "Category created and added to the storefront.");
    } catch (error) {
      setNotice(error.message);
    }
  };

  const toggleProduct = async (product) => {
    const updated = { ...product, active: product.active === false };
    try {
      const savedProduct = hasSupabaseConfig ? await saveAdminProduct(updated) : updated;
      setCatalog((items) => items.map((item) => item.id === product.id ? savedProduct : item));
      setNotice(product.active === false ? "Product is back in the storefront." : "Product archived from the storefront.");
    } catch (error) {
      setNotice(error.message);
    }
  };

  const updateOrder = async (orderNumber, status) => {
    try {
      if (hasSupabaseConfig) await saveAdminOrderStatus(orderNumber, status);
      setOrders((items) => items.map((order) => order.orderNumber === orderNumber ? { ...order, status } : order));
    } catch (error) {
      setNotice(error.message);
    }
  };

  const updateContactStatus = async (id, status) => {
    try {
      await setAdminContactStatus(id, status);
      setContacts((items) => items.map((item) => item.id === id ? { ...item, status } : item));
    } catch (error) {
      setDataError(error.message);
    }
  };

  const saveShipping = async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const settings = Object.fromEntries(["standard", "express", "freeThreshold"].map((key) => [key, Number(values.get(key))]));
    if (Object.values(settings).some((amount) => !Number.isFinite(amount) || amount < 0)) {
      setNotice("Delivery amounts must be zero or more.");
      return;
    }
    setShippingBusy(true);
    try {
      setShippingForm(await saveAdminShippingSettings(settings));
      setNotice("Delivery rates saved. New checkouts use them right away.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setShippingBusy(false);
    }
  };

  const loadMoreContacts = async () => {
    const nextPage = contactPage + 1;
    setDataLoading(true);
    setDataError("");
    try {
      const result = await getAdminContacts(nextPage);
      setContacts((items) => [...items, ...result.items]);
      setContactPage(nextPage);
      setContactsHasMore(result.hasMore);
    } catch (error) {
      setDataError(error.message);
    } finally {
      setDataLoading(false);
    }
  };

  const loadMoreSubscribers = async () => {
    const nextPage = newsletterPage + 1;
    setDataLoading(true);
    setDataError("");
    try {
      const result = await getAdminNewsletter(nextPage);
      setSubscribers((items) => [...items, ...result.items]);
      setNewsletterPage(nextPage);
      setNewsletterHasMore(result.hasMore);
    } catch (error) {
      setDataError(error.message);
    } finally {
      setDataLoading(false);
    }
  };

  const exportSubscribers = async () => {
    setCsvBusy(true);
    setDataError("");
    try {
      const allSubscribers = [];
      let page = 0;
      let hasMore = true;
      while (hasMore) {
        const result = await getAdminNewsletter(page);
        allSubscribers.push(...result.items);
        hasMore = result.hasMore;
        page += 1;
      }
      downloadNewsletterCsv(allSubscribers);
    } catch (error) {
      setDataError(error.message);
    } finally {
      setCsvBusy(false);
    }
  };

  const navItems = [["overview", "Overview"], ["products", "Products"], ["categories", "Categories"], ["orders", "Orders"], ["contacts", "Contact messages"], ["newsletter", "Newsletter"], ["settings", "Delivery rates"]];

  if (!ready || !ordersReady || access === "checking") return <div className="admin-loading">Loading workspace...</div>;
  if (access !== "admin" && access !== "demo") return (
    <div className="admin-loading"><div><strong>{access === "unauthenticated" ? "Sign in to access admin." : access === "forbidden" ? "Administrator access required." : notice || "Admin data could not be loaded."}</strong><p>{access === "unauthenticated" && <Link href="/login?next=/admin">Log in</Link>} <Link href="/">Back to storefront</Link></p></div></div>
  );

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <Link href="/" className="admin-brand" aria-label="Y home"><span className="admin-mark" role="img" aria-label="Y" /></Link>
        <div className="admin-side-label">WORKSPACE</div>
        <nav aria-label="Admin sections">
          {navItems.map(([key, label]) => <button key={key} className={section === key ? "selected" : ""} onClick={() => { setSection(key); setQuery(""); }} aria-current={section === key ? "page" : undefined}><span className={`admin-nav-icon ${key}`} />{label}{key === "orders" && orders.length > 0 && <i>{orders.length}</i>}</button>)}
        </nav>
        <div className="admin-side-bottom">
          <span className="demo-indicator"><i /> {access === "demo" ? "LOCAL DEMO" : "CONNECTED"}</span>
          <Link href="/">← Back to storefront</Link>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div><span className="admin-eyebrow">ADMIN WORKSPACE</span><h1>{navItems.find(([key]) => key === section)?.[1]}</h1></div>
          <div className="admin-top-meta"><Link href="/" className="admin-view-store"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5m7 7-7-7 7-7" /></svg>View store</Link><span className="admin-date">{new Intl.DateTimeFormat("en", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</span><span className="admin-avatar">Y</span></div>
        </header>

        {notice && <div className="admin-notice" role="status"><span>{notice}</span><button aria-label="Dismiss message" onClick={() => setNotice("")}>×</button></div>}

        {section === "overview" && (
          <div className="admin-content">
            <div className="admin-welcome"><div><p>STORE PULSE</p><h2>Good work starts with a clear view.</h2></div><button className="admin-primary" onClick={() => { setSection("products"); startProductForm(); }}>＋ Add product</button></div>
            <div className="admin-kpis">
              <article><span>Gross sales</span><strong>{money(revenue)}</strong><small>{orders.length} orders</small></article>
              <article><span>Orders</span><strong>{orders.length.toString().padStart(2, "0")}</strong><small>{orders.filter((order) => order.status === "New").length} need attention</small></article>
              <article><span>Active products</span><strong>{activeProducts.length.toString().padStart(2, "0")}</strong><small>{catalog.length - activeProducts.length} archived</small></article>
              <article className={lowStock.length ? "warning" : ""}><span>Low stock</span><strong>{lowStock.length.toString().padStart(2, "0")}</strong><small>{lowStock.length ? "Five units or fewer" : "Stock levels look good"}</small></article>
            </div>

            <div className="admin-overview-grid">
              <section className="admin-panel admin-recent">
                <div className="admin-panel-heading"><div><span className="admin-eyebrow">THE LATEST</span><h2>Recent orders</h2></div><button className="admin-text-button" onClick={() => setSection("orders")}>All orders →</button></div>
                {orders.length ? <OrdersTable orders={orders.slice(0, 5)} onUpdate={updateOrder} compact /> : <EmptyState title="No orders yet" text="Completed demo checkouts will show here." />}
              </section>
              <section className="admin-panel admin-stock-panel">
                <div className="admin-panel-heading"><div><span className="admin-eyebrow">INVENTORY WATCH</span><h2>Needs attention</h2></div><span className="admin-count">{lowStock.length}</span></div>
                {lowStock.length ? <ul className="admin-low-list">{lowStock.slice(0, 5).map((product) => <li key={product.id}><img src={product.img} alt="" /><span>{product.name}<small>{categories.find((category) => category.slug === product.cat)?.label || product.cat}</small></span><strong>{product.stock} left</strong></li>)}</ul> : <EmptyState title="All stocked" text="Products with five or fewer units appear here." />}
                <button className="admin-text-button" onClick={() => setSection("products")}>Manage inventory →</button>
              </section>
            </div>
          </div>
        )}

        {section === "products" && (
          <div className="admin-content">
            <div className="admin-page-heading"><div><p>CATALOGUE</p><h2>Products <span>{catalog.length}</span></h2></div><button className="admin-primary" onClick={() => startProductForm()}>＋ Add product</button></div>
            <div className="admin-toolbar"><label className="admin-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" aria-label="Search products" /></label><span className="admin-result-count">{filteredProducts.length} products</span></div>
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>PRODUCT</th><th>TYPE</th><th>PRICE</th><th>STOCK</th><th>STATUS</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
              {filteredProducts.map((product) => <tr key={product.id}><td><div className="admin-product-cell"><img src={product.img} alt="" /><span>{product.name}<small>SKU Y-{String(product.id).padStart(4, "0")}</small></span></div></td><td>{categories.find((category) => category.slug === product.cat)?.label || product.cat}</td><td>{money(product.price)}</td><td><span className={Number(product.stock) <= 5 ? "admin-stock low" : "admin-stock"}>{product.stock ?? 0} units</span></td><td><span className={`admin-status ${product.active === false ? "inactive" : "active"}`}>{product.active === false ? "Archived" : "Active"}</span></td><td><div className="admin-row-actions"><button onClick={() => startProductForm(product)}>Edit</button><button onClick={() => toggleProduct(product)}>{product.active === false ? "Restore" : "Archive"}</button></div></td></tr>)}
            </tbody></table>{filteredProducts.length === 0 && <EmptyState title="No matching products" text="Try a different search." />}</div>
          </div>
        )}

        {section === "categories" && (
          <div className="admin-content">
            <div className="admin-page-heading"><div><p>STORE NAVIGATION</p><h2>Categories <span>{categories.length}</span></h2></div><button className="admin-primary" onClick={() => startCategoryForm()}>＋ Add category</button></div>
            <p className="admin-category-intro">New categories appear in shop filters, navigation, footer and homepage.</p>
            <div className="admin-category-grid">{categories.map((category) => {
              const count = catalog.filter((product) => product.cat === category.slug).length;
              return <article className="admin-category-row" key={category.slug}>
                <img src={category.img} alt="" />
                <div><strong>{category.label}</strong><small>/shop/{category.slug} · {count} {count === 1 ? "product" : "products"}</small></div>
                <button className="admin-row-edit" onClick={() => startCategoryForm(category)}>Edit</button>
              </article>;
            })}</div>
            {!categories.length && <EmptyState title="No categories yet" text="Add a category before creating products." />}
          </div>
        )}

        {section === "orders" && (
          <div className="admin-content">
            <div className="admin-page-heading"><div><p>FULFILMENT</p><h2>Orders <span>{orders.length}</span></h2></div></div>
            <div className="admin-toolbar"><label className="admin-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order or customer" aria-label="Search orders" /></label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter orders by status"><option value="all">All statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></div>
            <div className="admin-table-wrap"><OrdersTable orders={filteredOrders} onUpdate={updateOrder} /></div>
          </div>
        )}

        {section === "contacts" && (
          <div className="admin-content">
            <div className="admin-page-heading"><div><p>CUSTOMER CARE</p><h2>Contact messages <span>{contacts.length}</span></h2></div></div>
            {dataError && <p className="admin-data-error" role="alert">{dataError}</p>}
            {dataLoading && !contacts.length ? <div className="admin-loading">Loading contact messages...</div>
              : contacts.length ? <div className="admin-contact-list">{contacts.map((contact) => <article className="admin-panel admin-contact-card" key={contact.id}>
                <div className="admin-contact-heading"><div><strong>{contact.name}</strong><a href={`mailto:${encodeURIComponent(contact.email)}`}>{contact.email}</a></div><div><span>{formatDate(contact.created_at)}</span><span className={`admin-status ${contact.status === "New" ? "active" : "inactive"}`}>{contact.status}</span></div></div>
                <p>{contact.message}</p>
                {contact.status !== "Replied" && <div className="admin-row-actions">
                  {contact.status === "New" && <button className="admin-secondary" onClick={() => updateContactStatus(contact.id, "Read")}>Mark as read</button>}
                  <button className="admin-secondary" onClick={() => updateContactStatus(contact.id, "Replied")}>Mark as replied</button>
                </div>}
              </article>)}</div> : !dataError && <EmptyState title="No contact messages" text="New customer messages will appear here." />}
            {contactsHasMore && <button className="admin-secondary admin-load-more" onClick={loadMoreContacts} disabled={dataLoading}>{dataLoading ? "Loading…" : "Load more messages"}</button>}
          </div>
        )}

        {section === "newsletter" && (
          <div className="admin-content">
            <div className="admin-page-heading"><div><p>COMMUNITY</p><h2>Newsletter subscribers <span>{subscribers.length}{newsletterHasMore ? "+" : ""}</span></h2></div><button className="admin-secondary" onClick={exportSubscribers} disabled={csvBusy}>{csvBusy ? "Preparing CSV…" : "Export CSV"}</button></div>
            {dataError && <p className="admin-data-error" role="alert">{dataError}</p>}
            {dataLoading && !subscribers.length ? <div className="admin-loading">Loading subscribers...</div>
              : subscribers.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>EMAIL</th><th>SUBSCRIBED</th></tr></thead><tbody>{subscribers.map((subscriber) => <tr key={subscriber.email}><td>{subscriber.email}</td><td>{formatDate(subscriber.created_at)}</td></tr>)}</tbody></table></div>
              : !dataError && <EmptyState title="No subscribers yet" text="Newsletter signups will appear here." />}
            {newsletterHasMore && <button className="admin-secondary admin-load-more" onClick={loadMoreSubscribers} disabled={dataLoading}>{dataLoading ? "Loading…" : "Load more subscribers"}</button>}
          </div>
        )}

        {section === "settings" && (
          <div className="admin-content">
            <div className="admin-page-heading"><div><p>CHECKOUT</p><h2>Delivery rates</h2></div></div>
            <p className="admin-category-intro">Prices are in AED. Checkout totals are recalculated by the database with these values.</p>
            {dataError && <p className="admin-data-error" role="alert">{dataError}</p>}
            {!shippingForm ? dataLoading && <div className="admin-loading">Loading delivery rates...</div>
              : <form key={JSON.stringify(shippingForm)} className="admin-editor admin-settings" onSubmit={saveShipping}>
                <div className="admin-form-pair">
                  <label>Standard delivery (AED)<input name="standard" type="number" min="0" step="0.01" defaultValue={shippingForm.standard} required disabled={access !== "admin"} /></label>
                  <label>Express delivery (AED)<input name="express" type="number" min="0" step="0.01" defaultValue={shippingForm.express} required disabled={access !== "admin"} /></label>
                </div>
                <label>Free standard delivery from (AED) <small>Orders at or above this subtotal get free standard delivery. Express is always charged.</small><input name="freeThreshold" type="number" min="0" step="0.01" defaultValue={shippingForm.freeThreshold} required disabled={access !== "admin"} /></label>
                {access === "admin"
                  ? <div className="admin-editor-actions"><button className="admin-primary" type="submit" disabled={shippingBusy}>{shippingBusy ? "Saving…" : "Save delivery rates"}</button></div>
                  : <p className="admin-category-intro">Demo mode shows the default rates. Connect Supabase to edit them.</p>}
              </form>}
          </div>
        )}
      </div>

      {form && <div ref={editorRef} className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setForm(null); }}><form className="admin-editor" onSubmit={saveProduct} role="dialog" aria-modal="true" aria-labelledby="admin-editor-title">
        <div className="admin-editor-heading"><div><span className="admin-eyebrow">CATALOGUE ENTRY</span><h2 id="admin-editor-title">{form.id === null ? "Add a product" : "Edit product"}</h2></div><button type="button" aria-label="Close editor" onClick={() => setForm(null)}>×</button></div>
        <label>Product name<input name="name" defaultValue={form.name} required autoFocus /></label>
        <label>Arabic product name<input name="name_ar" defaultValue={form.name_ar || ""} dir="rtl" maxLength={120} /></label>
        {hasSupabaseConfig && <label>Upload product image <small>PNG, JPEG or WebP, up to 5 MB</small><input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploadingImage} onChange={uploadImage} />{uploadingImage && <small>Uploading image…</small>}</label>}
        <label>Description<textarea name="description" defaultValue={form.description || ""} maxLength={3000} rows={4} /></label>
        <div className="admin-form-pair"><label>Category<select name="cat" defaultValue={form.cat} required>{categories.filter((category) => category.active !== false).map((category) => <option key={category.slug} value={category.slug}>{category.label}</option>)}</select></label><label>Price (AED)<input name="price" type="number" min="1" step="1" defaultValue={form.price} required /></label></div>
        <div className="admin-form-pair"><label>Total stock (calculated)<input name="stock" type="number" defaultValue={form.stock} readOnly /></label><label>Image path or HTTPS URL<input name="img" value={form.img || ""} onChange={(event) => { setImageStatus("loading"); setForm({ ...form, img: event.target.value }); }} placeholder="/images/products/enhanced/hoodies/hoodies_black.png" /></label></div>
        <div aria-live="polite">
          {form.img && <img key={form.img} src={form.img.trim()} alt="Product image preview" style={{ width: 120, height: 120, objectFit: "contain" }} onLoad={() => setImageStatus("loaded")} onError={() => setImageStatus("error")} />}
          <p>{imageStatus === "loaded" ? "Image preview loaded." : imageStatus === "error" ? "Image could not load. Upload a file or use a direct HTTPS image URL or a /images/ path." : "Waiting for a valid image preview…"}</p>
        </div>
        <label>Colours <small>Format: Name:#hex, Name:#hex</small><input value={colorsText} onChange={(event) => setColorsText(event.target.value)} /></label>
        <label>Inventory by colour and size <small>One row per variant: Black|M|10. Missing variants are unavailable.</small><textarea name="variants" rows={8} defaultValue={Object.entries(form.variant_stock || {}).map(([key, quantity]) => `${key}|${quantity}`).join("\n")} placeholder={"Black|M|10\nWhite|L|5"} /></label>
        <label className="admin-toggle"><input type="checkbox" checked={form.active !== false} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Visible in storefront</label>
        <div className="admin-editor-actions"><button type="button" className="admin-secondary" onClick={() => setForm(null)}>Cancel</button><button className="admin-primary" type="submit" disabled={uploadingImage || imageStatus !== "loaded"}>Save product</button></div>
      </form></div>}
      {categoryForm && <div ref={editorRef} className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCategoryForm(null); }}><form className="admin-editor" onSubmit={saveCategory} role="dialog" aria-modal="true" aria-labelledby="admin-category-title">
        <div className="admin-editor-heading"><div><span className="admin-eyebrow">STORE NAVIGATION</span><h2 id="admin-category-title">{categoryForm.id ? "Edit category" : "Add a category"}</h2></div><button type="button" aria-label="Close editor" onClick={() => setCategoryForm(null)}>×</button></div>
        <label>Category name<input name="label" defaultValue={categoryForm.label} required maxLength={60} autoFocus /></label>
        <label>Category URL key<input value={categoryForm.id || slugify(categoryForm.label) || "generated-on-save"} readOnly /></label>
        <label>Cover image path or URL<input name="img" defaultValue={categoryForm.img} placeholder="/images/cat-1.jpg" /></label>
        <div className="admin-editor-actions"><button type="button" className="admin-secondary" onClick={() => setCategoryForm(null)}>Cancel</button><button className="admin-primary" type="submit">Save category</button></div>
      </form></div>}
    </div>
  );
}

function OrdersTable({ orders, onUpdate, compact = false }) {
  if (!orders.length) return <EmptyState title="No orders found" text="Orders placed through the demo checkout appear here." />;
  return <table className="admin-table"><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>DATE</th><th>TOTAL</th><th>STATUS</th><th>DETAILS</th></tr></thead><tbody>
    {orders.map((order) => <tr key={order.orderNumber}><td><strong className="admin-order-number">{order.orderNumber}</strong><small className="admin-cell-sub">{order.lines?.length || 0} items</small></td><td>{order.customer?.name || "Guest"}<small className="admin-cell-sub">{order.customer?.email || ""}</small></td><td>{formatDate(order.createdAt)}</td><td>{money(order.total)}</td><td><select className={`admin-status-select status-${String(order.status || "New").toLowerCase()}`} value={order.status || "New"} onChange={(event) => onUpdate(order.orderNumber, event.target.value)} aria-label={`Status for ${order.orderNumber}`}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></td><td><Link href={`/admin/orders/${encodeURIComponent(order.orderNumber)}`}>View</Link></td></tr>)}
  </tbody>{compact && null}</table>;
}

function EmptyState({ title, text }) {
  return <div className="admin-empty"><span>—</span><strong>{title}</strong><p>{text}</p></div>;
}
