import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Let phones on the same home Wi-Fi use the dev server (http://192.168.1.x:3000).
  allowedDevOrigins: ["192.168.*.*"],
  partialPrefetching: true,
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
