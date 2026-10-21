import photos from "@/assets/dish-photos.json";
import type { MenuItem } from "@/lib/data";

type Photo = { src: string; width: number; height: number; blur: string };
const PHOTOS = photos as Record<string, Photo>;

/**
 * The dish's photo, if any: one set in the menu data, or one built by
 * `npm run build:photos` from public/images/<dish-id>.jpg. Paths are bases:
 * add "-320.webp" or "-480.webp" (thumbnail) or "-full.webp" (sheet).
 */
export function dishPhoto(item: MenuItem): { src: string; blur?: string } | null {
  if (item.image) return { src: item.image };
  const p = PHOTOS[item.id];
  return p ? { src: p.src, blur: p.blur } : null;
}
