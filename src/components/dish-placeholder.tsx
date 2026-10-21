import { ARCH_PATH } from "@/design/arch";

// The arch outline, open at the bottom.
const ARCH_OUTLINE = ARCH_PATH.replace(/Z$/, "");

/**
 * Shown in place of a dish photo until the client's photos arrive: a beige
 * tile with a brass arch outline and a label set inside it.
 */
export function DishPlaceholder({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div className={`relative grid aspect-[4/5] w-full place-items-center overflow-hidden rounded-thumb bg-beige ${className}`}>
      <svg
        viewBox="0 0 400 500"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="absolute top-[12%] left-[16%] h-[88%] w-[68%] overflow-visible text-brass"
      >
        <path d={ARCH_OUTLINE} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="relative px-[22%] pt-[20%] text-center font-display text-placeholder leading-tight font-semibold text-brass-ink [text-wrap:balance]">
        {label}
      </span>
    </div>
  );
}
