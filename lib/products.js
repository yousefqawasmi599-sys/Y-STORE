// Product data. Replace with your database or API later.
export const SIZES = ["S", "M", "L", "XL", "XXL"];
export const ONE_SIZE = "ONE SIZE";

const ROOM_COLORS = [
  ["Black", "#0b0b0c"],
  ["White", "#f2f0ec"],
  ["Cream", "#eadfca"],
  ["Beige", "#d6bf9c"],
  ["Dark Grey", "#3b3b3e"],
  ["Olive Green", "#4b5330"],
  ["Brown", "#4a2e20"],
  ["Navy", "#14213d"],
  ["Pink", "#e8b4bd"],
  ["Light Blue", "#9dbfe6"],
];

const withRoomColors = (colors) => [
  ...colors,
  ...ROOM_COLORS.filter(([name]) => !colors.some(([existing]) => existing === name)),
];

export const DEFAULT_CATEGORIES = [
  { slug: "hoodies", label: "Hoodies", img: "/images/cat-3.jpg", active: true },
  { slug: "tees", label: "T-Shirts", img: "/images/cat-1.jpg", active: true },
  { slug: "long-sleeves", label: "Long Sleeves", img: "/images/cat-2.jpg", active: true },
  { slug: "caps", label: "Caps", img: "/images/products/enhanced/caps/caps_black.png", active: true },
  { slug: "headbands", label: "Headbands", img: "/images/products/enhanced/headbands/headbands_black.png", active: true },
];

export const CATS = Object.fromEntries([["all", "All"], ...DEFAULT_CATEGORIES.map(({ slug, label }) => [slug, label])]);

const C = {
  a: [["White", "#ece8e1"], ["Black", "#111111"], ["Blue", "#3d6fd1"]],
  b: [["Sand", "#d8c4b0"], ["Clay", "#d98a6a"], ["Red", "#c23a3a"]],
  c: [["White", "#ece8e1"], ["Black", "#111111"], ["Grey", "#9aa4b0"]],
  d: [["Black", "#111111"], ["White", "#ece8e1"], ["Blue", "#3d6fd1"]],
};

const imageSources = {
  hoodies: ["hoodies", "hoodies"],
  tees: ["tshirts", "tshirts"],
  "long-sleeves": ["long_sleeve", "long_sleeve"],
  caps: ["caps", "caps"],
  headbands: ["headbands", "headbands"],
};

const availableImageColors = new Set(ROOM_COLORS.map(([name]) => name.toLowerCase()));

export function getProductImage(product, color) {
  const savedImage = typeof product?.img === "string" ? product.img.trim() : "";
  const source = imageSources[product?.cat];
  if (color === undefined) return savedImage || (source ? `/images/products/enhanced/${source[0]}/${source[1]}_black.png` : "");
  if (!source) return savedImage;
  const [folder, prefix] = source;
  const bundledPattern = new RegExp(`^/images/products/enhanced/${folder}/${prefix}_(black|white|cream|beige|dark_grey|olive_green|brown|navy|pink|light_blue)\\.png$`);
  if (!bundledPattern.test(savedImage)) return savedImage;
  const colorKey = typeof color === "string" ? color.trim().toLowerCase() : "";
  if (!availableImageColors.has(colorKey)
    || (product.cat === "caps" && colorKey === "beige")
    || (product.cat === "headbands" && ["beige", "olive green"].includes(colorKey))) return savedImage;
  return `/images/products/enhanced/${folder}/${prefix}_${colorKey.replaceAll(" ", "_")}.png`;
}

export function getProductSizes(product) {
  return product?.sizes || (product?.cat === "caps" || product?.cat === "headbands" ? [ONE_SIZE] : SIZES);
}

export const products = [
  { id: 0, name: "Essential Hoodie", price: 369, cat: "hoodies", img: "/images/products/enhanced/hoodies/hoodies_black.png", colors: withRoomColors(C.a) },
  { id: 1, name: "Classic Hoodie", price: 399, cat: "hoodies", img: "/images/products/enhanced/hoodies/hoodies_black.png", colors: C.b },
  { id: 2, name: "Signature Hoodie", price: 379, cat: "hoodies", img: "/images/products/enhanced/hoodies/hoodies_black.png", colors: C.c },
  { id: 3, name: "Core Tee", price: 249, cat: "tees", img: "/images/products/enhanced/tshirts/tshirts_black.png", colors: withRoomColors(C.a) },
  { id: 4, name: "Long Sleeve Tee", price: 279, cat: "long-sleeves", img: "/images/products/enhanced/long_sleeve/long_sleeve_black.png", colors: withRoomColors(C.a) },
  { id: 5, name: "Oversized Tee", price: 229, cat: "tees", img: "/images/products/enhanced/tshirts/tshirts_black.png", colors: C.c },
  { id: 6, name: "Zip Hoodie", price: 429, cat: "hoodies", img: "/images/products/enhanced/hoodies/hoodies_black.png", colors: C.d },
  { id: 7, name: "Heavy Long Sleeve", price: 299, cat: "long-sleeves", img: "/images/products/enhanced/long_sleeve/long_sleeve_black.png", colors: C.b },
  { id: 8, name: "Y Signature Cap", price: 39, cat: "caps", img: "/images/products/enhanced/caps/caps_black.png", colors: ROOM_COLORS.filter(([name]) => name !== "Beige"), sizes: [ONE_SIZE] },
  { id: 9, name: "Y Sport Headband", price: 25, cat: "headbands", img: "/images/products/enhanced/headbands/headbands_black.png", colors: ROOM_COLORS.filter(([name]) => name !== "Beige" && name !== "Olive Green"), sizes: [ONE_SIZE] },
];

export function getVariantStock(product, size, color) {
  if (product?.variant_stock && typeof product.variant_stock === "object") return Number(product.variant_stock[`${color}|${size}`] ?? 0);
  return Number(product?.stock ?? 18);
}

// Product URLs end in the id, so links keep working when a product is renamed.
export function productPath(product) {
  const slug = String(product?.name || "product").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product";
  return `/product/${slug}-${product.id}`;
}

export function productIdFromSlug(slug) {
  const match = /(?:^|-)(\d{1,9})$/.exec(String(slug || ""));
  return match ? Number(match[1]) : null;
}

export const EMIRATES =["Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah"];
