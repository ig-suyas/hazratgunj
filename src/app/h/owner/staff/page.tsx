import type { Metadata } from "next";
import { StaffPage } from "@/components/owner/staff-page";

export const metadata: Metadata = { title: "Staff" };

export const instant = false; // browser-only page, see ../layout.tsx

export default function OwnerStaffPage() {
  return <StaffPage />;
}
