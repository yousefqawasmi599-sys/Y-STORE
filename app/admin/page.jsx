import Admin from "@/components/Admin";

export const metadata = {
  title: "Admin dashboard",
  description: "Private Y Store administration dashboard.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <Admin />;
}