import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MenuApp } from "@/components/menu/menu-app";
import { restaurant } from "@/data/restaurant";
import { features } from "@/features";
import { getMenu } from "@/lib/data";
import "./menu.css";

export const metadata: Metadata = {
  title: "Menu",
  description: `The ${restaurant.shortName} menu: tandoor, curries, biryani, Chinese, continental, desserts and drinks.`,
};

// Static, read-only page (no ordering). QR links may carry ?table=7; it is ignored.
export default async function MenuPage() {
  if (!features.menu) notFound();
  const menu = await getMenu();
  return <MenuApp menu={menu} taxNote={menu.meta.taxNote} />;
}
