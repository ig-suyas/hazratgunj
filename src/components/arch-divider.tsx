import { archPath } from "@/design/arch";

// The same cusped arch as the image mask, 48 wide × 60 tall, opened at the
// bottom so it stands on the hairline (base at y = 39.5).
const ARCH = archPath({ width: 48, height: 60 })
  .replace(/^M0 60L/, "M0 39.5L")
  .replace(/L48 60Z$/, "L48 39.5");

/**
 * Section divider: a brass hairline with the pointed, cusped arch rising
 * from its centre.
 */
export function ArchDivider({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`flex items-end text-brass ${className}`}>
      <span className="mb-[0.5px] h-px flex-1 bg-current" />
      <svg viewBox="-0.5 0 49 40" className="h-8 w-[2.45rem] shrink-0 overflow-visible">
        <path d={ARCH} fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="mb-[0.5px] h-px flex-1 bg-current" />
    </div>
  );
}
