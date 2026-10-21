"use client";

import { useEffect } from "react";

/**
 * Fades [data-reveal] blocks in with a short rise, once, as they enter the
 * screen. Content stays visible if this never runs; landing.css skips the
 * effect for reduced motion.
 */
export function Reveal() {
  useEffect(() => {
    const blocks = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.shown = "";
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    // Blocks already on screen stay as they are; only later ones animate.
    for (const block of blocks) {
      if (block.getBoundingClientRect().top < window.innerHeight) block.dataset.shown = "";
      else observer.observe(block);
    }
    document.documentElement.dataset.reveal = "on";
    return () => observer.disconnect();
  }, []);
  return null;
}
