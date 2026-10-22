"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { restaurant } from "@/data/restaurant";
import { features } from "@/features";

/**
 * Phones only: Menu · Call · Directions within thumb reach once the hero has
 * scrolled away (the hero carries the same three actions).
 */
export function MobileActions() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const hero = document.getElementById("hero");
    if (!hero) return;
    const observer = new IntersectionObserver(([entry]) => setShown(!entry.isIntersecting), { rootMargin: "0px 0px -35% 0px" });
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="Quick actions" className="lp-actions" data-shown={shown} inert={!shown}>
      {features.menu && (
        <Link href="/menu" className="lp-action lp-action-primary">
          Menu
        </Link>
      )}
      <a href={`tel:${restaurant.phone.tel}`} className="lp-action">
        Call
      </a>
      <a href={restaurant.directionsUrl} target="_blank" rel="noopener noreferrer" className="lp-action">
        Directions<span className="sr-only"> (opens Google Maps)</span>
      </a>
    </nav>
  );
}
