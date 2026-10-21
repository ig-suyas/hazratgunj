// The client's logo (public/svg/logo.svg) in its original colours, rendered by
// scripts/build-logo.mjs and served as small WebP sizes: the vector file is
// over 60 KB gzipped, too heavy to inline on every page.
const WIDTHS = [96, 144, 192, 288, 384, 576] as const;

/** Round logo. `size` is the displayed width in CSS pixels. */
export function Logo({
  size,
  className = "",
  priority = false,
  alt = "Hazratgunj Restaurant and Banquet",
}: {
  size: number;
  className?: string;
  priority?: boolean;
  alt?: string;
}) {
  const fallback = WIDTHS.find((w) => w >= size * 2) ?? WIDTHS.at(-1)!;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP set; next/image would re-encode it
    <img
      src={`/logo/logo-${fallback}.webp`}
      srcSet={WIDTHS.map((w) => `/logo/logo-${w}.webp ${w}w`).join(", ")}
      sizes={`${size}px`}
      width={size}
      height={size}
      alt={alt}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      className={className}
    />
  );
}
