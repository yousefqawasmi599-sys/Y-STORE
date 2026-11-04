"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { products as initialProducts, DEFAULT_CATEGORIES, getVariantStock, getProductSizes } from "@/lib/products";
import { getAdminProfile, getShippingSettings, getStoreCategories, getStoreProducts } from "@/lib/api";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { DEFAULT_SHIPPING_SETTINGS } from "@/lib/shipping";

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

const load = (key, fallback) => {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
};
const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };

function mergeProductDefaults(savedProducts) {
  const saved = Array.isArray(savedProducts) ? savedProducts : [];
  const existing = saved.map((product) => {
    const defaults = initialProducts.find((item) => String(item.id) === String(product?.id));
    if (!defaults) return product;
    const colors = Array.isArray(product.colors) ? product.colors : [];
    return {
      ...defaults,
      ...product,
      img: typeof product.img === "string" && product.img.trim() ? product.img.trim() : defaults.img,
      colors: [...colors, ...defaults.colors.filter(([name]) => !colors.some(([savedName]) => savedName === name))],
      sizes: defaults.sizes || product.sizes,
    };
  });
  return [...existing, ...initialProducts.filter((product) =>
    !existing.some((savedProduct) => String(savedProduct?.id) === String(product.id)))];
}

function mergeCategoryDefaults(savedCategories) {
  const saved = Array.isArray(savedCategories) ? savedCategories : [];
  return [...saved, ...DEFAULT_CATEGORIES.filter((category) =>
    !saved.some((savedCategory) => savedCategory?.slug === category.slug))];
}

export function StoreProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [catalog, setCatalog] = useState(initialProducts);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [wish, setWish] = useState([]);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);
  const [shippingSettings, setShippingSettings] = useState(DEFAULT_SHIPPING_SETTINGS);
  const [shippingSettingsError, setShippingSettingsError] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const [categoriesError, setCategoriesError] = useState("");
  const [ready, setReady] = useState(false);
  const [ui, setUi] = useState({ cart: false, menu: false, search: false, pdp: null });
  const [toastMsg, setToastMsg] = useState("");
  const [lastOrder, setLastOrder] = useState("");
  const timer = useRef();
  const adminCheckUserId = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let authSubscription;
    const initialize = async () => {
      const savedCatalog = load("y-products", initialProducts);
      const savedCategories = load("y-categories", DEFAULT_CATEGORIES);
      let availableCatalog = mergeProductDefaults(savedCatalog);
      let availableCategories = mergeCategoryDefaults(savedCategories);
      if (hasSupabaseConfig) {
        const [remoteCatalog, remoteCategories, remoteShipping] = await Promise.all([
          getStoreProducts().catch((error) => ({ error })),
          getStoreCategories().catch((error) => ({ error })),
          getShippingSettings().catch((error) => ({ error })),
        ]);
        if (Array.isArray(remoteCatalog)) availableCatalog = remoteCatalog;
        if (Array.isArray(remoteCategories)) availableCategories = remoteCategories;
        if (remoteCatalog?.error) setCatalogError("Products could not be refreshed. Showing saved items where available.");
        if (remoteCategories?.error) setCategoriesError("Store categories could not be refreshed.");
        if (remoteShipping?.error) setShippingSettingsError("Delivery rates could not be loaded. Please try again later.");
        else if (remoteShipping) setShippingSettings(remoteShipping);
      }
      if (cancelled) return;
      setCatalog(availableCatalog);
      setCategories(availableCategories);
      const savedCart = load("y-cart", []);
      const savedWish = load("y-wish", []);
      setCart(Array.isArray(savedCart) ? savedCart.filter((line) =>
        line && typeof line.k === "string" && Number.isSafeInteger(Number(line.id))
        && Number.isInteger(line.q) && line.q > 0 && typeof line.size === "string"
        && typeof line.color === "string") : []);
      setWish(Array.isArray(savedWish) ? savedWish.filter((id) => typeof id === "number" || typeof id === "string") : []);

      if (hasSupabaseConfig) {
        const supabase = createSupabaseClient();
        const setSessionUser = (session) => {
          const authUser = session?.user;
          const userId = authUser?.id ?? null;
          setUser(authUser ? {
            name: authUser.user_metadata?.full_name || authUser.email?.split("@")[0],
            email: authUser.email,
            id: userId,
          } : null);
          if (adminCheckUserId.current === userId) return;
          adminCheckUserId.current = userId;
          setIsAdmin(false);
          setAdminChecked(false);
          if (!userId) return;
          getAdminProfile()
            .then(() => {
              if (cancelled || adminCheckUserId.current !== userId) return;
              setIsAdmin(true);
              setAdminChecked(true);
            })
            .catch(() => {
              if (cancelled || adminCheckUserId.current !== userId) return;
              setIsAdmin(false);
              setAdminChecked(true);
            });
        };
        const { data } = supabase.auth.onAuthStateChange((_event, session) => setSessionUser(session));
        authSubscription = data.subscription;
        const { data: sessionData } = await supabase.auth.getSession();
        if (cancelled) return;
        setSessionUser(sessionData.session);
      } else {
        setUser(load("y-user", null));
        setIsAdmin(true);
        setAdminChecked(true);
      }
      if (!cancelled) setReady(true);
    };
    initialize();
    return () => {
      cancelled = true;
      adminCheckUserId.current = null;
      authSubscription?.unsubscribe();
    };
  }, []);
  useEffect(() => { if (ready && !hasSupabaseConfig) save("y-products", catalog); }, [catalog, ready]);
  useEffect(() => { if (ready && !hasSupabaseConfig) save("y-categories", categories); }, [categories, ready]);
  useEffect(() => { if (ready) save("y-cart", cart); }, [cart, ready]);
  useEffect(() => { if (ready) save("y-wish", wish); }, [wish, ready]);
  useEffect(() => { if (ready && !hasSupabaseConfig) save("y-user", user); }, [user, ready]);

  const closeAll = useCallback(() => setUi({ cart: false, menu: false, search: false, pdp: null }), []);
  const open = (key, value = true) => setUi({ cart: false, menu: false, search: false, pdp: null, [key]: value });

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && closeAll();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [closeAll]);
  const locked = ui.cart || ui.menu || ui.search || ui.pdp !== null;
  useEffect(() => { document.body.classList.toggle("lock", locked); }, [locked]);

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastMsg(""), 1800);
  }, []);

  const add = (id, size, color) => {
    const product = catalog.find((product) => product.id === id);
    if (!product || product.active === false || !getProductSizes(product).includes(size) || !product.colors.some(([name]) => name === color)) return false;
    const stock = getVariantStock(product, size, color);
    if (stock <= 0) return false;
    const k = `${id}|${size}|${color}`;
    setCart((items) => {
      const existing = items.find((line) => line.k === k);
      if (existing) {
        if (existing.q >= stock) return items;
        return items.map((line) => line.k === k ? { ...line, q: line.q + 1 } : line);
      }
      return [...items, { k, id, size, color, q: 1 }];
    });
    return true;
  };
  const changeQty = (k, d) => setCart((items) => items.map((line) => {
    if (line.k !== k) return line;
    const stock = getVariantStock(catalog.find((product) => product.id === line.id), line.size, line.color);
    return { ...line, q: Math.min(stock, line.q + d) };
  }).filter((line) => line.q > 0));
  const remove = (k) => setCart((c) => c.filter((l) => l.k !== k));
  const toggleWish = (id) => setWish((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id]));
  const logout = async () => {
    if (hasSupabaseConfig) {
      adminCheckUserId.current = null;
      setIsAdmin(false);
      setAdminChecked(false);
      const { error } = await createSupabaseClient().auth.signOut();
      if (error) throw error;
    } else {
      setIsAdmin(true);
      setAdminChecked(true);
    }
    setUser(null);
  };

  const lines = cart.map((line) => ({ ...line, p: catalog.find((product) => product.id === line.id) })).filter((line) => line.p);
  const unavailableCartLines = cart.filter((line) => !catalog.some((product) => product.id === line.id));
  const subtotal = lines.reduce((s, l) => s + l.p.price * l.q, 0);
  const count = lines.reduce((s, l) => s + l.q, 0);

  const value = {
    ready, ui, open, closeAll, toast, toastMsg,
    shippingSettings, shippingSettingsError,
    catalogError, categoriesError,
    catalog, setCatalog, categories, setCategories,
    cart, lines, unavailableCartLines, subtotal, count, add, changeQty, remove, clearCart: () => setCart([]),
    wish, toggleWish,
    user, login: setUser, logout, isAdmin, adminChecked,
    lastOrder, setLastOrder,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
