"use client";

import { useEffect } from "react";

/**
 * Lets the reviews wall drift only while the section is on screen (landing.css
 * pauses it otherwise; it never moves for reduced motion).
 */
export function ReviewsMotion() {
  useEffect(() => {
    const section = document.getElementById("reviews");
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) section.dataset.playing = "";
      else delete section.dataset.playing;
    });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);
  return null;
}
