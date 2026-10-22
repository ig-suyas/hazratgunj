import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Let phones on the same home Wi-Fi use the dev server (http://192.168.1.x:3000).
  allowedDevOrigins: ["192.168.*.*"],
  partialPrefetching: true,
  // A typed /login goes to the staff sign-in (not linked anywhere; kept out of search in robots.ts).
  async redirects() {
    return [{ source: "/login", destination: "/h/login", permanent: false }];
  },
  images: {
    // AVIF first (about a third smaller than WebP for these photos); 60 is the
    // hero photo, which sits under a dark scrim.
    formats: ["image/avif", "image/webp"],
    qualities: [60, 75],
  },
  experimental: {
    // Most guests open the menu once, from a QR code, on mobile data: inline
    // the small Tailwind CSS instead of making it a render-blocking request.
    inlineCss: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
