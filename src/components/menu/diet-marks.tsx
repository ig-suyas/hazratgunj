import { DietMark } from "@/components/diet-mark";
import type { MenuItem } from "@/lib/data";
import { diets } from "@/lib/menu-filter";

/** FSSAI mark(s) for a dish; mixed dishes show both. */
export function DietMarks({ item, size = 16 }: { item: MenuItem; size?: number }) {
  const d = diets(item);
  if (d.veg && d.nonveg) {
    return (
      <span className="inline-flex gap-1" role="img" aria-label="Veg and non-veg options">
        <DietMark veg size={size} />
        <DietMark veg={false} size={size} />
      </span>
    );
  }
  return <DietMark veg={d.veg} size={size} />;
}
