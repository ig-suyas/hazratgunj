import type { Metadata } from "next";
import { TablesQr } from "@/components/owner/tables-qr";

export const metadata: Metadata = { title: "Tables and QR" };

export const instant = false; // browser-only page, see ../layout.tsx

export default function OwnerTablesPage() {
  return <TablesQr />;
}
