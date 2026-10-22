import type { Metadata } from "next";
import { BlockedGuests } from "@/components/blocked/blocked-guests";
import { PageHeader } from "@/components/app/ui";

export const metadata: Metadata = { title: "Blocked guests" };

export const instant = false; // browser-only page, see ../layout.tsx

export default function OwnerBlockedPage() {
  return (
    <>
      <PageHeader title="Blocked guests" description="Guests staff blocked from ordering, for example someone ordering from outside after photographing a table's QR code." />
      <BlockedGuests />
    </>
  );
}
