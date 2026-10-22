import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { demo } from "@/config/demo";
import { DEMO_HINT } from "@/lib/auth/accounts";

export const metadata: Metadata = { title: "Sign in" };

// Browser-only page (see ../layout.tsx): navigations may show a loading frame.
export const instant = false;

export default function LoginPage() {
  // The demo PINs are sent only with this page, and only while the hint is on.
  return <LoginForm demoLogins={demo.showDemoHint ? DEMO_HINT : undefined} />;
}
