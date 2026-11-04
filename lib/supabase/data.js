const sizes = new Set(["S", "M", "L", "XL", "XXL", "ONE SIZE"]);
const statuses = new Set(["New", "Processing", "Shipped", "Completed", "Cancelled"]);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function mapCategory(row) {
  return { slug: row.slug, label: row.label, img: row.img, active: row.active };
}

export function validateCategory(value) {
  const slug = typeof value?.slug === "string" ? value.slug.trim().toLowerCase() : "";
  const label = typeof value?.label === "string" ? value.label.trim() : "";
  const img = typeof value?.img === "string" && value.img.trim() ? value.img.trim() : "/images/cat-1.jpg";
  if (!slugPattern.test(slug) || slug.length > 60 || !label || label.length > 60 || img.length > 1000) return null;
  return { slug, label, img, active: value.active !== false };
}

export function mapProduct(row) {
  const legacyCategories = { hoodie: "hoodies", tee: "tees", ls: "long-sleeves" };
  return {
    ...row,
    name_ar: row.name_ar ?? "",
    description: row.description ?? "",
    id: Number(row.id),
    cat: legacyCategories[row.cat] || row.cat,
    price: Number(row.price),
    stock: Number(row.stock),
  };
}

export function validateProduct(value) {
  const name = typeof value?.name === "string" ? value.name.trim() : "";
  const nameAr = typeof value?.name_ar === "string" ? value.name_ar.trim() : "";
  const description = typeof value?.description === "string" ? value.description.trim() : "";
  const price = Number(value?.price);
  const stock = Number(value?.stock);
  const img = typeof value?.img === "string" && value.img.trim() ? value.img.trim() : "/images/products/enhanced/hoodies/hoodies_black.png";
  let validImage = img.startsWith("/") && !img.startsWith("//") && !/[\\\r\n]/.test(img);
  if (!validImage) {
    try { const url = new URL(img); validImage = url.protocol === "https:" && !url.username && !url.password; } catch {}
  }
  if (!validImage) return null;
  const variants = value?.variant_stock;
  if (!variants || typeof variants !== "object" || Array.isArray(variants) || Object.keys(variants).length > 200) return null;
  const colors = Array.isArray(value?.colors) ? value.colors : [];
  const validColors = colors.length > 0 && colors.every((color) =>
    Array.isArray(color) && typeof color[0] === "string" && color[0].trim()
    && typeof color[1] === "string" && /^#[0-9a-f]{6}$/i.test(color[1]));

  if (!name || name.length > 120 || nameAr.length > 120 || description.length > 3000
    || typeof value?.cat !== "string" || !slugPattern.test(value.cat)
    || !Number.isFinite(price) || price <= 0 || price > 100000
    || !Number.isInteger(stock) || stock < 0 || stock > 1000000
    || img.length > 1000 || !validColors) return null;

  for (const [key, quantity] of Object.entries(variants)) {
    const [color, size, extra] = key.split("|");
    if (extra !== undefined || !colors.some(([name]) => name === color) || !sizes.has(size) || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > 999999) return null;
    if (["caps", "headbands"].includes(value.cat) !== (size === "ONE SIZE")) return null;
  }
  const total = Object.values(variants).reduce((sum, value) => sum + value, 0);
  if (total > 1000000) return null;
  return { name, name_ar: nameAr, description, cat: value.cat, price, stock: total, variant_stock: variants, img, colors, active: value.active !== false };
}

export function mapOrder(row) {
  return {
    orderNumber: row.order_number,
    customer: row.customer,
    status: row.status,
    shipping: row.shipping,
    payment: row.payment,
    subtotal: Number(row.subtotal),
    delivery: Number(row.delivery),
    total: Number(row.total),
    createdAt: row.created_at,
    lines: (row.order_items || []).map((line) => ({
      id: line.product_id,
      name: line.product_name,
      size: line.size,
      color: line.color,
      q: line.qty,
      price: Number(line.unit_price),
    })),
  };
}

export function validateShippingSettings(value) {
  const amounts = [value?.standard, value?.express, value?.freeThreshold]
    .map((amount) => typeof amount === "number" || (typeof amount === "string" && amount.trim()) ? Number(amount) : NaN);
  if (amounts.some((amount) => !Number.isFinite(amount) || amount < 0 || amount > 100000 || Math.abs(Math.round(amount * 100) - amount * 100) > 1e-6)) return null;
  const [standard, express, freeThreshold] = amounts;
  return { standard_delivery_aed: standard, express_delivery_aed: express, free_shipping_threshold_aed: freeThreshold };
}

export function mapShippingSettings(row) {
  return {
    standard: Number(row.standard_delivery_aed),
    express: Number(row.express_delivery_aed),
    freeThreshold: Number(row.free_shipping_threshold_aed),
  };
}

export const orderNumberPattern = /^Y-[0-9A-F]{8}$/;

export function isOrderStatus(value) {
  return statuses.has(value);
}

export function isOrderSize(value) {
  return sizes.has(value);
}
