import type { Metadata } from "next";
import { MenuEditor } from "@/components/owner/menu-editor";

export const metadata: Metadata = { title: "Menu" };

export const instant = false; // browser-only page, see ../layout.tsx

export default function OwnerMenuPage() {
  return <MenuEditor />;
}
