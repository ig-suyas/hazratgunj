"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Logo } from "@/components/logo";
import { features } from "@/features";

/** Slim sticky header: transparent over the hero photo, solid cream once the page scrolls. */
export function SiteHeader() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = ref.current;
    if (!header) return;
    const update = () => {
      header.dataset.solid = String(window.scrollY > 24);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header ref={ref} className="lp-header" data-solid="false">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-gutter">
        <Link href="/" aria-label="Hazratgunj home">
          <Logo size={64} priority className="size-14 md:size-16" />
        </Link>
        {features.menu && (
          <Link href="/menu" className="lp-link lp-header-menu">
            Menu
          </Link>
        )}
      </div>
    </header>
  );
}
