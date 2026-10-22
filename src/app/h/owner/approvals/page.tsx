import type { Metadata } from "next";
import { Approvals } from "@/components/owner/approvals";

export const metadata: Metadata = { title: "Approvals" };

export const instant = false; // browser-only page, see ../layout.tsx

export default function OwnerApprovalsPage() {
  return <Approvals />;
}
