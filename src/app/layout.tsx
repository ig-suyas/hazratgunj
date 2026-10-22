import type { Metadata, Viewport } from "next";
import { restaurant } from "@/data/restaurant";
import { cormorant, mukta } from "@/design/fonts";
import { token } from "@/design/tokens";
import { siteUrl } from "@/lib/site";
import "./globals.css";


const title = `${restaurant.shortName} — Restaurant and Banquet, ${restaurant.branch}, ${restaurant.address.city}`;
const description = `${restaurant.name} on ${restaurant.branch}, ${restaurant.address.city}. North Indian, Chinese and Continental. Open every day, 11 am to 11 pm.`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: title, template: `%s · ${restaurant.shortName}, ${restaurant.branch}` },
  description,
  applicationName: restaurant.shortName,
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: restaurant.shortName,
    title,
    description,
  },
  twitter: { card: "summary_large_image", title, description },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: token("color-cream"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${mukta.variable}`}>
      <body>{children}</body>
    </html>
  );
}
