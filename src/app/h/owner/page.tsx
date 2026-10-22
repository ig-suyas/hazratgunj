import type { Metadata } from "next";
import { Overview } from "@/components/owner/overview";

export const metadata: Metadata = { title: "Overview" };

export const instant = false; // browser-only page, see ../layout.tsx

export default function OwnerOverviewPage() {
  return <Overview />;
}
