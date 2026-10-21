import type { MenuItem } from "@/lib/data";
import { monogram } from "@/lib/menu-filter";
import { dishPhoto } from "./dish-photo";

/**
 * Menu thumbnail (4:5). Shows the dish photo when there is one (see
 * dish-photo.ts), otherwise a beige tile with the brass arch and the dish's
 * initial. Photos lazy-load, with a blurred preview behind them.
 */
export function DishThumb({ item, className = "" }: { item: MenuItem; className?: string }) {
  const photo = dishPhoto(item);
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP from the image pipeline
      <img
        src={`${photo.src}-480.webp`}
        srcSet={`${photo.src}-320.webp 320w, ${photo.src}-480.webp 480w`}
        sizes="6.25rem"
        alt=""
        width={480}
        height={600}
        loading="lazy"
        decoding="async"
        style={photo.blur ? { backgroundImage: `url(${photo.blur})`, backgroundSize: "cover" } : undefined}
        className={`aspect-[4/5] w-full rounded-thumb bg-beige object-cover ${className}`}
      />
    );
  }
  return (
    <div aria-hidden="true" className={`dish-ph aspect-[4/5] w-full rounded-thumb ${className}`}>
      <span>{monogram(item.name)}</span>
    </div>
  );
}
