import type { Metadata } from "next";
import { ReportsLoader } from "@/components/reports/reports-loader";

export const metadata: Metadata = { title: "Reports" };

export const instant = false; // browser-only page, see ../layout.tsx

export default function OwnerReportsPage() {
  return <ReportsLoader />;
}
