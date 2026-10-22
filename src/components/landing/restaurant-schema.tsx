import { restaurant, type Day } from "@/data/restaurant";
import { features } from "@/features";
import { siteUrl } from "@/lib/site";

const DAY: Record<Day, string> = { Mo: "Monday", Tu: "Tuesday", We: "Wednesday", Th: "Thursday", Fr: "Friday", Sa: "Saturday", Su: "Sunday" };

/**
 * schema.org Restaurant data for search and answer engines. Verified facts
 * from src/data/restaurant.ts only; no rating (the review numbers are not
 * verified, and Google ignores self-published ratings anyway).
 */
export function RestaurantSchema() {
  const r = restaurant;
  const data = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": `${siteUrl}/#restaurant`,
    name: r.name,
    alternateName: [r.shortName, r.wordmark.devanagari],
    url: siteUrl,
    logo: `${siteUrl}/logo/logo-576.webp`,
    image: `${siteUrl}/opengraph-image.jpg`,
    telephone: r.phone.tel,
    address: {
      "@type": "PostalAddress",
      streetAddress: `${r.address.line1}, ${r.address.line2}`,
      addressLocality: r.address.city,
      addressRegion: r.address.region,
      postalCode: r.address.postalCode,
      addressCountry: r.address.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: r.geo.lat, longitude: r.geo.lng },
    hasMap: r.mapsUrl,
    openingHoursSpecification: r.openingHours.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.days.map((d) => DAY[d]),
      opens: h.opens,
      closes: h.closes,
    })),
    servesCuisine: r.cuisines,
    // "₹600–1,800 (Google, reported by 146 guests)" → the range only.
    priceRange: r.listing.pricePerPerson.split(" (")[0],
    ...(features.menu ? { hasMenu: `${siteUrl}/menu` } : {}),
    sameAs: [r.social.instagram.url],
  };
  return (
    <script
      type="application/ld+json"
      // JSON with "<" escaped, so no text in the data can close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
