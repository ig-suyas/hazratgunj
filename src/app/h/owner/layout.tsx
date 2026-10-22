import { OwnerShell } from "@/components/owner/owner-shell";

// Browser-only pages (see ../layout.tsx): navigations may show a loading frame.
export const instant = false;

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return <OwnerShell>{children}</OwnerShell>;
}
