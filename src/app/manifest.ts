import type { MetadataRoute } from "next";
import { restaurant } from "@/data/restaurant";
import { token } from "@/design/tokens";
import { features } from "@/features";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${restaurant.shortName} — ${restaurant.branch}, ${restaurant.address.city}`,
    short_name: restaurant.shortName,
    description: `${restaurant.name}, ${restaurant.branch}, ${restaurant.address.city}.`,
    start_url: features.menu ? "/menu" : "/",
    display: "standalone",
    background_color: token("color-cream"),
    theme_color: token("color-cream"),
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/svg/favicon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
