/**
 * Single source of truth for restaurant facts.
 *
 * Rule: every value is either VERIFIED (source noted beside it) or wrapped in
 * `missing(...)`. The UI must never render a `missing` value — use `isMissing`
 * to hide it. Run `listMissing()` to see everything still to collect.
 *
 * Verified on 2026-10-21 against the Google Business listing the client shared
 * (https://share.google/efaIBazIHsOvw0YZ2 → "Hazratgunj Restaurant and Banquet
 * Hall | Park Road", Maps CID 13072315978512044501), plus the client's own
 * photos and videos of the venue.
 */

export type Placeholder = { readonly __placeholder: true; readonly note: string };

const missing = (note: string): Placeholder => ({ __placeholder: true, note });

export const isMissing = (value: unknown): value is Placeholder =>
  typeof value === "object" && value !== null && "__placeholder" in value;

export type Day = "Mo" | "Tu" | "We" | "Th" | "Fr" | "Sa" | "Su";

export const restaurant = {
  verifiedOn: "2026-10-21",

  // Google listing title.
  name: "Hazratgunj Restaurant and Banquet Hall",
  shortName: "Hazratgunj",
  branch: "Park Road",

  // As lettered on the roundel, the entrance and the neon wall sign.
  // Note the nukta: हज़रतगंज (not हजरतगंज).
  wordmark: { devanagari: "हज़रतगंज", latin: "Hazratgunj" },

  // Facade sign (owner photo on Google) and the in-venue standee (IMG_0982):
  // "A unit of Hazrat Hospitality and Services".
  operator: "Hazrat Hospitality and Services",

  // Lobby neon sign (photo: lobby-pranam) and the owner's Google description.
  greeting: { devanagari: "प्रणाम गोरखपुर", latin: "Pranaam Gorakhpur" },

  // Google listing.
  address: {
    line1: "ARBIT-28, Park Road",
    line2: "Above Kalyan Jewellers, Bilandpur",
    city: "Gorakhpur",
    region: "Uttar Pradesh",
    postalCode: "273001",
    country: "IN",
    full: "ARBIT-28, Park Rd, above Kalyan Jewellers, Bilandpur, Gorakhpur, Uttar Pradesh 273001",
  },

  // Google Maps place page.
  geo: { lat: 26.7531741, lng: 83.3775099, plusCode: "Q93H+72 Gorakhpur" },
  mapsUrl: "https://maps.google.com/?cid=13072315978512044501",
  directionsUrl: "https://www.google.com/maps/dir/?api=1&destination=26.7531741%2C83.3775099",

  // Google listing ("090769 23125").
  phone: { display: "+91 90769 23125", tel: "+919076923125" },

  // Google listing: 11 am–11 pm, every day.
  // Conflict: Zomato / District list 11:30 am–12 midnight. Confirm with owner.
  timeZone: "Asia/Kolkata",
  openingHours: [
    { days: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as Day[], opens: "11:00", closes: "23:00" },
  ],

  // Zomato listing (Google shows only "Restaurant"). Menu highlights on Google
  // agree: North Indian curries and breads, Indo-Chinese starters, desserts.
  cuisines: ["North Indian", "Chinese", "Continental"],

  // Seating areas, named on signs in the client's photos and videos.
  // Fact only — not used as decoration in the current theme.
  sections: ["Garden", "Pavilion", "Balcony", "Box Office"],

  social: {
    // Instagram profile linked from Google search results.
    instagram: { handle: "hazratgunj_restaurant", url: "https://www.instagram.com/hazratgunj_restaurant/" },
    facebook: missing("A 'Hazratgunj Restaurant' Facebook page exists; need the exact page URL."),
  },

  // In-venue standee (IMG_0982) lists two branches: "Park Road (Civil Lines)"
  // and "Airport Road (Mohaddipur)". This site is for Park Road only.
  otherBranches: [
    {
      name: "Airport Road",
      area: "Mohaddipur",
      phone: missing("Airport Road enquiry number (standee text unreadable in video)."),
    },
  ],

  website: missing("No website on the Google listing. Final domain for the site?"),
  email: missing("No public email found."),

  logo: {
    // The site uses a typographic wordmark (src/components/wordmark.tsx,
    // built by scripts/build-wordmark.mjs). The neon roundel is not used.
    official: missing("Official vector logo file (AI/SVG/PDF), if the owner has one."),
  },

  // Printed banquet menu (assets/source/menu, pages 1–4, 17, 19).
  banquet: {
    phones: [
      { display: "+91 90769 23124", tel: "+919076923124" },
      { display: "+91 90769 23125", tel: "+919076923125" },
      { display: "+91 90769 23126", tel: "+919076923126" },
    ],
    perPlateFrom: { veg: 1049, nonVeg: 1249 }, // + tax
    sessions: { lunch: "10 am–4 pm", dinner: "6 pm till the end of the event (last buffet 11:30 pm)" },
    capacity: missing("Banquet capacity. WedMeGood lists 350–600 guests; unconfirmed."),
  },

  story: {
    // Owner-written description on Google (verbatim, emoji removed). Tone
    // reference only; not to be published as a quote without approval.
    ownerDescription:
      "Pranaam Gorakhpur. Serving one thousand flavours with classy experience and uncountable memories.",
    yearOpened: missing("Year the Park Road restaurant opened."),
    nameMeaning: missing(
      "Confirm the Lucknow link: the owner's Google photos feature Rumi Darwaza and Bara Imambara with the logo.",
    ),
  },

  legal: {
    fssai: missing("FSSAI licence number (commonly shown on menus)."),
    // Printed on every banquet menu page.
    gstin: "09AAPFH4852E2Z3",
  },

  // Footer of every à la carte menu page.
  pricing: {
    taxNote: "All prices are in INR and exclusive of applicable taxes.",
    serviceCharge: missing("Any service charge? The menu mentions only taxes."),
  },

  // Google listing, for reference only (not displayed).
  listing: {
    pricePerPerson: "₹600–1,800 (Google, reported by 146 guests)",
  },

  // Shown in the landing page's reviews section. VERIFY: rating and count as
  // given by the owner on 2026-10-22, not checked against the live listing.
  googleRating: { value: 4.5, countLabel: "4.5K+", verify: true },
  // VERIFY: the share link the owner gave for the Google listing (same place as mapsUrl).
  googleReviewsUrl: "https://share.google/efaIBazIHsOvw0YZ2",
} as const;

export type Restaurant = typeof restaurant;

/** Every placeholder still in the config, with its dotted path. */
export function listMissing(node: unknown = restaurant, path = ""): { path: string; note: string }[] {
  if (isMissing(node)) return [{ path, note: node.note }];
  if (typeof node !== "object" || node === null) return [];
  return Object.entries(node).flatMap(([key, value]) =>
    listMissing(value, path ? `${path}.${key}` : key),
  );
}
