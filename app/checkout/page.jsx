import Checkout from "@/components/Checkout";

export const metadata = {
  title: "Checkout",
  description: "Review your delivery information and place your Y Store order.",
  robots: { index: false, follow: false },
};
export default function CheckoutPage() { return <Checkout />; }
