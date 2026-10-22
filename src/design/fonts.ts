import { Cormorant_Garamond, Mukta, Tiro_Devanagari_Hindi } from "next/font/google";

// Headings: elegant serif. Two static weights keep the menu page light.
export const cormorant = Cormorant_Garamond({
  weight: ["500", "600"],
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
});

// UI and body. latin-ext carries ₹; it loads only when ₹ appears.
export const mukta = Mukta({
  weight: ["400", "600"],
  subsets: ["latin"],
  variable: "--font-mukta",
  display: "swap",
});

// Devanagari display face. The landing wordmark is an outline of it
// (scripts/build-wordmark.mjs), so no public page downloads it; only the
// dev-only style guide sets it as text. Not preloaded: this module is imported
// by the root layout, and a preload here would reach every page.
export const tiro = Tiro_Devanagari_Hindi({
  weight: "400",
  subsets: ["devanagari"],
  variable: "--font-tiro",
  display: "swap",
  preload: false,
});
