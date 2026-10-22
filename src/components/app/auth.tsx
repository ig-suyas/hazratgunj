"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { basePath } from "@/config/demo";
import { getCurrentUser, logout, subscribe, type AuthUser, type Role } from "@/lib/api";
import { Spinner } from "./ui";

const UserContext = createContext<AuthUser | null>(null);

/** The signed-in account. Only inside <RequireRole>. */
export function useUser() {
  const user = useContext(UserContext);
  if (!user) throw new Error("useUser outside RequireRole");
  return user;
}

export const homeFor = (role: Role) => `${basePath}/${role === "owner" ? "owner" : "staff"}`;

let signingOut = false;

/** Clears the session cookie, then loads the sign-in page fresh (no cached staff or owner screens left). */
export async function signOut() {
  signingOut = true;
  await logout();
  window.location.replace(`${basePath}/login`);
}

/**
 * Second guard behind src/proxy.ts (which already refuses the wrong role on
 * the server): re-checks the cookie with the server on mount, when another
 * tab signs out, and when the browser restores the page from its back cache.
 */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  const allowed = !!user && roles.includes(user.role);

  useEffect(() => {
    let alive = true;
    const check = () =>
      getCurrentUser().then((u) => {
        if (!alive || signingOut) return;
        setUser(u);
        if (!u) window.location.replace(`${basePath}/login?next=${encodeURIComponent(location.pathname + location.search)}`);
        else if (!roles.includes(u.role)) router.replace(homeFor(u.role));
      });
    check();
    // Signing out in another tab, or the account being removed, ends this one too.
    const unsub = subscribe((t) => (t.has("*") || t.has("staff") || t.has("device:auth")) && check());
    const onShow = (e: PageTransitionEvent) => e.persisted && check();
    window.addEventListener("pageshow", onShow);
    return () => {
      alive = false;
      unsub();
      window.removeEventListener("pageshow", onShow);
    };
    // roles is a constant per page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  if (!allowed) {
    return (
      <div role="status" className="grid min-h-dvh place-items-center text-muted">
        <span className="flex items-center gap-2">
          <Spinner /> Checking access…
        </span>
      </div>
    );
  }
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}
