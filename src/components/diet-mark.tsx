/** FSSAI marks: green circle in a square (veg), brown triangle in a square (non-veg). */
export function DietMark({ veg, size = 16, className }: { veg: boolean; size?: number; className?: string }) {
  const color = veg ? "var(--color-veg)" : "var(--color-nonveg)";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      role="img"
      aria-label={veg ? "Vegetarian" : "Non-vegetarian"}
      className={className}
    >
      <rect x="1" y="1" width="14" height="14" rx="2" fill="none" stroke={color} strokeWidth="1.5" />
      {veg ? <circle cx="8" cy="8" r="3.6" fill={color} /> : <path d="M8 4.1 12.2 11.4H3.8Z" fill={color} />}
    </svg>
  );
}
