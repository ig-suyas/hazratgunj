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

// Devanagari headings: the landing-page wordmark. Import this only on pages
// that set Devanagari as text (the logo is an image and needs no font); it is
// preloaded there because the wordmark is the first thing on screen.
export const tiro = Tiro_Devanagari_Hindi({
  weight: "400",
  subsets: ["devanagari"],
  variable: "--font-tiro",
  display: "swap",
});
