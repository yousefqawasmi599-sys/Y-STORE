import AdminOrderView from "@/components/AdminOrderView";

export default async function AdminOrderPage({ params }) {
  const { orderNumber } = await params;
  return <AdminOrderView orderNumber={orderNumber} />;
}

export async function generateMetadata({ params }) {
  const { orderNumber } = await params;
  return {
    title: "Order details",
    description: "Private Y Store order details.",
    alternates: { canonical: `/admin/orders/${encodeURIComponent(orderNumber)}` },
    robots: { index: false, follow: false },
  };
}
