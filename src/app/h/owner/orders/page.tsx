import type { Metadata } from "next";
import { OrdersPage } from "@/components/owner/orders-page";

export const metadata: Metadata = { title: "Orders" };

export const instant = false; // browser-only page, see ../layout.tsx

export default function OwnerOrdersPage() {
  return <OrdersPage />;
}
