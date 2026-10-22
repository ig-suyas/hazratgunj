import type { Metadata } from "next";
import { Discounts } from "@/components/owner/discounts";

export const metadata: Metadata = { title: "Discounts" };

export const instant = false; // browser-only page, see ../layout.tsx

export default function OwnerDiscountsPage() {
  return <Discounts />;
}
