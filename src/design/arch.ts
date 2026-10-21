/**
 * The pointed arch, simplified from the scalloped doorway inside Hazratgunj
 * (assets/source/photos/arch.png): straight jambs and one smooth pointed head.
 * Path format is always `M0 H L0 S C… C… L W H Z`, closed along the bottom.
 *
 * Three uses, all from this one shape:
 *  - mask for large images      → public/brand/arch.svg        (.mask-arch)
 *  - thin brass frame           → public/brand/arch-outline.svg, or archPath()
 *  - section divider            → <ArchDivider />
 * `scripts/build-arch.mjs` writes the two SVG files.
 */

export const ARCH_VIEWBOX = { width: 400, height: 500 } as const;

const f = (n: number) => +n.toFixed(2);

export function archPath({
  width = ARCH_VIEWBOX.width as number,
  height = ARCH_VIEWBOX.height as number,
  springing = 0.48, // where the head starts, as a fraction of height from the top
  point = 0.16, // horizontal pull of the curve near the tip (smaller = sharper)
}: { width?: number; height?: number; springing?: number; point?: number } = {}): string {
  const w = width, h = height, s = height * springing, mid = width / 2;
  // Each half: vertical tangent at the springing, then a gentle ogee into the tip.
  const c1y = s * 0.42;
  const c2x = w * point, c2y = s * 0.22;
  return (
    `M0 ${f(h)}L0 ${f(s)}` +
    `C0 ${f(c1y)} ${f(mid - c2x)} ${f(c2y)} ${f(mid)} 0` +
    `C${f(mid + c2x)} ${f(c2y)} ${f(w)} ${f(c1y)} ${f(w)} ${f(s)}` +
    `L${f(w)} ${f(h)}Z`
  );
}

export const ARCH_PATH = archPath();
