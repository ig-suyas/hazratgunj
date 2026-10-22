import type { Metadata } from "next";
import { StaffApp } from "@/components/staff/staff-app";

export const metadata: Metadata = { title: "Staff screen" };

// Browser-only page (see ../layout.tsx): navigations may show a loading frame.
export const instant = false;

export default function StaffPage() {
  return <StaffApp />;
}
