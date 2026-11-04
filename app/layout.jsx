import "./globals.css";
import { StoreProvider } from "@/components/Store";
import ParticlesBg from "@/components/ParticlesBg";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import SearchOverlay from "@/components/SearchOverlay";
import ProductModal from "@/components/ProductModal";
import CursorY from "@/components/CursorY";
import Toast from "@/components/Toast";
import StoreDataNotice from "@/components/StoreDataNotice";

export const metadata = {
  metadataBase: new URL(process.env.SITE_URL || "http://localhost:3000"),
  title: { default: "Y — Signature Streetwear", template: "%s | Y" },
  description: "Y signature streetwear. Relaxed silhouettes, understated colours and everyday essentials.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Y Store",
    title: "Y — Signature Streetwear",
    description: "Y signature streetwear. Relaxed silhouettes, understated colours and everyday essentials.",
    images: [{ url: "/images/y-social.jpg", width: 1200, height: 630, alt: "Y signature black hoodie and tee" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Y — Signature Streetwear",
    description: "Y signature streetwear. Relaxed silhouettes, understated colours and everyday essentials.",
    images: ["/images/y-social.jpg"],
  },
};
export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=Jost:wght@300;400;500&family=Amiri:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@400&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ParticlesBg />
        <StoreProvider>
          <Header />
          <StoreDataNotice />
          <main>{children}</main>
          <Footer />
          <CartDrawer />
          <SearchOverlay />
          <ProductModal />
          <CursorY />
          <Toast />
        </StoreProvider>
      </body>
    </html>
  );
}
