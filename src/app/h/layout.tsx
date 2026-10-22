import type { Metadata } from "next";
import { AppFrame } from "@/components/app/app-frame";
import "./app.css";

// Staff and owner pages: not linked from the public site, never indexed
// (see also src/app/robots.ts).
export const metadata: Metadata = {
  title: { default: "Staff", template: "%s · Hazratgunj staff" },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

// These pages render in the browser only (their data is the device's demo
// store), so navigations into them are allowed to show a loading frame.
export const instant = false;

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <AppFrame>{children}</AppFrame>;
}
