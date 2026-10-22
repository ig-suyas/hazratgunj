import { redirect } from "next/navigation";
import { basePath } from "@/config/demo";

// Browser-only page (see ../layout.tsx): navigations may show a loading frame.
export const instant = false;

export default function StaffIndex() {
  redirect(`${basePath}/login`);
}
