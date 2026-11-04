import AdminOrderView from "@/components/AdminOrderView";

export default async function AdminInvoicePage({ params }) {
  const { orderNumber } = await params;
  return <AdminOrderView orderNumber={orderNumber} invoice />;
}

export async function generateMetadata({ params }) {
  const { orderNumber } = await params;
  return {
    title: "Order invoice",
    description: "Private printable Y Store order invoice.",
    alternates: { canonical: `/admin/orders/${encodeURIComponent(orderNumber)}/invoice` },
    robots: { index: false, follow: false },
  };
}
