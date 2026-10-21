import { getImageProps } from "next/image";
import Link from "next/link";
import { preload } from "react-dom";
import { restaurant } from "@/data/restaurant";
import { features } from "@/features";
import boxOfficeFrontPhoto from "@/assets/venue/box-office-front.webp";
import boxOfficePhoto from "@/assets/venue/box-office.webp";

// Wide screens get the wide, straight-on Box Office shot so the whole room
// shows; phones get the upright one. The breakpoint matches landing.css.
const WIDE = "(min-width: 48rem)";

/**
 * One static, full-bleed photo of an empty room under a flat dark scrim, with
 * the Devanagari wordmark, the address and one action, "View Menu". The only
 * motion is a slight parallax on the photo (landing.css).
 */
export function Hero() {
  const common = { alt: "The Box Office dining room: arched brass screens, a neon sign and green leather chairs", fill: true, sizes: "100vw" };
  const { props: wide } = getImageProps({ ...common, src: boxOfficeFrontPhoto });
  const { props: tall } = getImageProps({ ...common, src: boxOfficePhoto, fetchPriority: "high", loading: "eager" });
  // Preload only the photo this screen will show.
  preload(wide.src, { as: "image", imageSrcSet: wide.srcSet, imageSizes: "100vw", media: WIDE, fetchPriority: "high" });
  preload(tall.src, { as: "image", imageSrcSet: tall.srcSet, imageSizes: "100vw", media: "(max-width: 47.99rem)", fetchPriority: "high" });

  return (
    <section className="lp-hero" aria-labelledby="hero-title">
      <div className="lp-hero-media">
        <picture>
          <source media={WIDE} srcSet={wide.srcSet} sizes="100vw" />
          <img {...tall} alt={common.alt} className="lp-hero-img" />
        </picture>
      </div>
      <div className="lp-hero-scrim" aria-hidden="true" />

      <div className="lp-hero-content">
        <h1 id="hero-title">
          <span lang="hi" className="lp-wordmark">
            {restaurant.wordmark.devanagari}
          </span>
          <span className="sr-only">{restaurant.shortName}, </span>
          <span className="mt-2 block font-display text-title font-medium">Restaurant and Banquet</span>
        </h1>
        <p className="mt-3 text-eyebrow font-semibold uppercase">
          {restaurant.branch}, {restaurant.address.city}
        </p>
        {features.menu && (
          <Link href="/menu" className="lp-btn mt-8">
            View Menu
          </Link>
        )}
      </div>

    </section>
  );
}
