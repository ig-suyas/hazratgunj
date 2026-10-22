import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MenuApp } from "@/components/menu/menu-app";
import { restaurant } from "@/data/restaurant";
import { features } from "@/features";
import { getMenu } from "@/lib/api";
import "./menu.css";

export const metadata: Metadata = {
  title: "Menu",
  description: `The ${restaurant.shortName} menu: tandoor, curries, biryani, Chinese, continental, desserts and drinks.`,
};

// Static page. Ordering turns on in the browser for guests who open it from
// their table's QR link (/menu?t=<token>); see src/components/menu/guest.ts.
export default async function MenuPage() {
  if (!features.menu) notFound();
  const menu = await getMenu();
  return <MenuApp menu={menu} taxNote={menu.meta.taxNote} />;
}
