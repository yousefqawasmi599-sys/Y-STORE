// Single place where the front end talks to a backend.
// With NEXT_PUBLIC_API_URL empty, every function below is a local mock so the site works on its own.
// Set NEXT_PUBLIC_API_URL (see .env.example) and build the endpoints listed in README.md to go live.
import { products as initialProducts } from "./products";
import { createClient as createSupabaseClient } from "./supabase/client";
import { hasSupabaseConfig } from "./supabase/config";
import { DEFAULT_SHIPPING_SETTINGS } from "./shipping";

const BASE = process.env.NEXT_PUBLIC_API_URL || "";
const wait = (ms = 500) => new Promise((r) => setTimeout(r, ms));

export function friendlyErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (error?.status === 409) return "Some selected colours or sizes are unavailable. Refresh the shop and update your cart.";
  if (error?.status === 429) return "Too many attempts. Please wait a minute before trying again.";
  const message = typeof error?.message === "string" ? error.message : "";
  const normalized = message.toLowerCase();
  if (error instanceof TypeError || /network|fetch failed|failed to fetch|load failed|offline|timed out/i.test(message)) {
    return "Connection problem. Check your internet connection and try again.";
  }
  if (/email rate limit exceeded|over_email_send_rate_limit|too many requests|rate limit/.test(normalized)) {
    return "Too many verification emails were requested. Wait a while before trying again.";
  }
  if (/token has expired|invalid.*(token|otp)|otp.*invalid|token.*invalid/.test(normalized)) {
    return "That code is invalid or expired. Check the newest email and try again.";
  }
  if (/email not confirmed/.test(normalized)) {
    return "Verify your email with the code we sent before logging in.";
  }
  if (/invalid login credentials/.test(normalized)) {
    return "Email or password is incorrect.";
  }
  if (/user already registered/.test(normalized)) {
    return "An account already exists for this email. Log in instead.";
  }
  return fallback;
}

async function post(path, body) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Connection problem. Check your internet connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || "Something went wrong. Please try again.");
    error.status = res.status;
    throw error;
  }
  return data;
}

async function requestJson(path, method = "GET", body) {
  let res;
  try {
    res = await fetch(path, {
      method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new Error("Connection problem. Check your internet connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || "Something went wrong. Please try again.");
    error.status = res.status;
    throw error;
  }
  return data;
}

export async function getStoreProducts() {
  return hasSupabaseConfig ? requestJson("/api/products") : null;
}

export async function getStoreCategories() {
  return hasSupabaseConfig ? requestJson("/api/categories") : null;
}

export async function getAdminProfile() {
  return requestJson("/api/admin/me");
}

export async function getAdminCategories() {
  return requestJson("/api/admin/categories");
}

export async function saveAdminCategory(category) {
  const isNew = category.id === null;
  const path = isNew ? "/api/admin/categories" : `/api/admin/categories/${encodeURIComponent(category.id)}`;
  return requestJson(path, isNew ? "POST" : "PATCH", category);
}

export async function getAdminProducts() {
  return requestJson("/api/admin/products");
}

export async function saveAdminProduct(product) {
  const isNew = product.id === null;
  const path = isNew ? "/api/admin/products" : `/api/admin/products/${product.id}`;
  return requestJson(path, isNew ? "POST" : "PATCH", product);
}

export async function getAdminOrders() {
  const orders = [];
  for (let page = 0, hasMore = true; hasMore; page += 1) {
    const result = await requestJson(`/api/admin/orders?page=${page}`);
    orders.push(...result.items);
    hasMore = result.hasMore;
  }
  return orders;
}

export async function getAdminShippingSettings() {
  return requestJson("/api/admin/settings");
}

export async function saveAdminShippingSettings(settings) {
  return requestJson("/api/admin/settings", "PATCH", settings);
}

export async function getAdminOrder(orderNumber) {
  return requestJson(`/api/admin/orders/${encodeURIComponent(orderNumber)}`);
}

export async function getAdminContacts(page = 0) {
  return requestJson(`/api/admin/contacts?page=${page}`);
}

export async function setAdminContactStatus(id, status) {
  return requestJson(`/api/admin/contacts/${encodeURIComponent(id)}`, "PATCH", { status });
}

export async function getAdminNewsletter(page = 0) {
  return requestJson(`/api/admin/newsletter?page=${page}`);
}

export function downloadNewsletterCsv(subscribers) {
  const escapeCell = (value) => {
    const safeValue = /^[=+\-@]/.test(String(value)) ? `'${value}` : value;
    return `"${String(safeValue ?? "").replaceAll('"', '""')}"`;
  };
  const csv = [["Email", "Subscribed at"], ...subscribers.map((subscriber) => [subscriber.email, subscriber.created_at])]
    .map((row) => row.map(escapeCell).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "y-store-newsletter-subscribers.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export async function getShippingSettings() {
  return requestJson("/api/shipping-settings");
}

export async function getAccountOrders() {
  return requestJson("/api/account/orders");
}

export async function cancelAccountOrder(orderNumber) {
  return requestJson(`/api/account/orders/${encodeURIComponent(orderNumber)}`, "PATCH", { status: "Cancelled" });
}

export async function trackOrder({ orderNumber, email }) {
  if (!hasSupabaseConfig) throw new Error("Order tracking is available after connecting Supabase.");
  return requestJson("/api/orders/track", "POST", { orderNumber, email });
}

export async function updateProfileName(name) {
  if (!hasSupabaseConfig) return { name };
  const { data, error } = await createSupabaseClient().auth.updateUser({ data: { full_name: name } });
  if (error) throw new Error(error.message);
  return { name: data.user?.user_metadata?.full_name || name };
}

export async function saveAdminOrderStatus(orderNumber, status) {
  return requestJson(`/api/admin/orders/${encodeURIComponent(orderNumber)}`, "PATCH", { status });
}

export async function sendPasswordReset(email) {
  if (hasSupabaseConfig) {
    const { error } = await createSupabaseClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  }
  if (BASE) return post("/auth/forgot-password", { email });
  throw new Error("Password recovery is available after connecting Supabase.");
}

export async function updatePassword(password) {
  if (!hasSupabaseConfig) throw new Error("Password recovery is not configured.");
  const { data, error } = await createSupabaseClient().auth.updateUser({ password });
  if (error) throw new Error(error.message);
  return data.user;
}

// Returns { name, email }
export async function login({ email, password }) {
  if (hasSupabaseConfig) {
    const { data, error } = await createSupabaseClient().auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return { name: data.user.user_metadata?.full_name || email.split("@")[0], email: data.user.email };
  }
  if (!BASE) { await wait(); return { name: email.split("@")[0], email }; }
  return post("/auth/login", { email, password });
}
// Returns { name, email }
export async function register({ name, email, password }) {
  if (hasSupabaseConfig) {
    const { data, error } = await createSupabaseClient().auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/account`,
      },
    });
    if (error) throw new Error(error.message);
    return {
      name: data.user?.user_metadata?.full_name || name,
      email: data.user?.email || email,
      pendingVerification: !data.session,
    };
  }
  if (!BASE) { await wait(); return { name, email }; }
  return post("/auth/register", { name, email, password });
}

export async function verifySignupOtp({ email, token }) {
  if (!hasSupabaseConfig) throw new Error("Email verification is not configured.");
  const { data, error } = await createSupabaseClient().auth.verifyOtp({
    email,
    token,
    type: "signup",
  });
  if (error) throw error;
  return {
    name: data.user?.user_metadata?.full_name || email.split("@")[0],
    email: data.user?.email || email,
    session: data.session,
  };
}

export async function resendSignupOtp(email) {
  if (!hasSupabaseConfig) throw new Error("Email verification is not configured.");
  const { error } = await createSupabaseClient().auth.resend({ type: "signup", email });
  if (error) throw error;
  return { ok: true };
}
export async function sendLoginOtp(email) {
  if (!hasSupabaseConfig) throw new Error("Email sign-in is not configured.");
  const { error } = await createSupabaseClient().auth.signInWithOtp({
    email, options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/auth/callback?next=/account` },
  });
  if (error) throw error;
  return { email, pendingVerification: true, verificationType: "email" };
}

export async function verifyEmailOtp({ email, token }) {
  if (!hasSupabaseConfig) throw new Error("Email sign-in is not configured.");
  const { data, error } = await createSupabaseClient().auth.verifyOtp({ email, token, type: "email" });
  if (error) throw error;
  return { email: data.user?.email || email, name: data.user?.user_metadata?.full_name, session: data.session };
}
// order: { customer, lines: [{ productId, size, color, qty }], shipping, payment }. Returns { orderNumber }
export async function createOrder(order) {
  if (hasSupabaseConfig) return requestJson("/api/orders", "POST", order);
  if (!BASE) {
    await wait();
    const orderNumber = "Y-" + Date.now().toString().slice(-6);
    let catalog = initialProducts;
    let previousOrders = [];
    try {
      const savedCatalog = JSON.parse(localStorage.getItem("y-products"));
      const savedOrders = JSON.parse(localStorage.getItem("y-orders"));
      if (Array.isArray(savedCatalog)) catalog = savedCatalog;
      if (Array.isArray(savedOrders)) previousOrders = savedOrders;
    } catch {}
    const lines = order.lines.map((line) => {
      const product = catalog.find((item) => item.id === line.productId) || initialProducts.find((item) => item.id === line.productId);
      return { ...line, name: product?.name || "Product", price: product?.price || 0 };
    });
    const subtotal = lines.reduce((sum, line) => sum + line.price * line.qty, 0);
    const delivery = order.shipping === "exp" ? DEFAULT_SHIPPING_SETTINGS.express
      : subtotal >= DEFAULT_SHIPPING_SETTINGS.freeThreshold ? 0 : DEFAULT_SHIPPING_SETTINGS.standard;
    localStorage.setItem("y-orders", JSON.stringify([{
      ...order, orderNumber, lines, subtotal, delivery, total: subtotal + delivery,
      status: "New", createdAt: new Date().toISOString(),
    }, ...previousOrders]));
    return { orderNumber };
  }
  return post("/orders", order);
}
export async function sendContact(msg) {
  if (hasSupabaseConfig) return requestJson("/api/contact", "POST", msg);
  if (!BASE) { await wait(300); return { ok: true }; }
  return post("/contact", msg);
}
export async function subscribe(email, website = "") {
  if (hasSupabaseConfig) return requestJson("/api/newsletter", "POST", { email, website });
  if (!BASE) { await wait(300); return { ok: true }; }
  return post("/newsletter", { email, website });
}
