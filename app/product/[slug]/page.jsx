import { notFound, permanentRedirect } from "next/navigation";
import ProductView from "@/components/ProductView";
import { getProductImage, productIdFromSlug, productPath } from "@/lib/products";
import { getPublicProduct } from "@/lib/supabase/public";

const siteUrl = process.env.SITE_URL || "http://localhost:3000";

// undefined means the lookup failed, so the page still renders from the client catalogue.
async function loadProduct(slug) {
  const id = productIdFromSlug(slug);
  if (id === null) notFound();
  const product = await getPublicProduct(id).catch(() => undefined);
  if (product === null) notFound();
  return { id, product };
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { product } = await loadProduct(slug);
  if (!product) return { title: "Product" };
  const description = product.description || `${product.name} by Y. ${product.price} AED, delivered across the UAE.`;
  const image = getProductImage(product);
  return {
    title: product.name,
    description,
    alternates: { canonical: productPath(product) },
    openGraph: { title: product.name, description, images: image ? [{ url: image, alt: product.name }] : undefined },
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const { id, product } = await loadProduct(slug);
  if (product && productPath(product) !== `/product/${slug}`) permanentRedirect(productPath(product));
  const structuredData = product && {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || undefined,
    image: new URL(getProductImage(product), siteUrl).toString(),
    brand: { "@type": "Brand", name: "Y" },
    offers: {
      "@type": "Offer",
      url: new URL(productPath(product), siteUrl).toString(),
      price: product.price,
      priceCurrency: "AED",
      availability: Number(product.stock) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };
  return (
    <>
      {structuredData && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />}
      <ProductView id={id} />
    </>
  );
}
