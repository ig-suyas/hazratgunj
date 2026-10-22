import Image from "next/image";
import Link from "next/link";
import { restaurant } from "@/data/restaurant";
import { features } from "@/features";
import boxOfficePhoto from "@/assets/venue/box-office.webp";
import { WORDMARK } from "./wordmark-path";

/**
 * One static, full-bleed photo of an empty room under a flat dark scrim, with
 * the Devanagari wordmark, the name in Latin letters, and the three things a
 * visitor came for: the menu, a call, directions. The only motion is a slight
 * parallax on the photo on tablets (landing.css).
 *
 * The photo is the upright Box Office shot at every width. Phones and laptops
 * crop only its top (AC unit and ducts) so the neon shows; tablets show a band
 * across the booths (landing.css). The straight-on Box Office shot appears
 * once, under "The rooms".
 */
export function Hero() {
  return (
    <section id="hero" className="lp-hero" aria-labelledby="hero-title">
      <div className="lp-hero-media">
        <Image
          src={boxOfficePhoto}
          alt="The Box Office dining room: brass arched screens, leather booths and green chairs"
          fill
          sizes="100vw"
          quality={60}
          preload
          fetchPriority="high"
          className="lp-hero-img"
        />
      </div>
      <div className="lp-hero-scrim" aria-hidden="true" />

      <div className="lp-hero-content">
        <h1 id="hero-title">
          {/* Outlined from Tiro Devanagari Hindi (scripts/build-wordmark.mjs). The name is
              given as a label, not hidden text, so no Devanagari font is downloaded. */}
          <svg
            role="img"
            aria-label={restaurant.wordmark.devanagari}
            lang="hi"
            viewBox={WORDMARK.viewBox}
            className="lp-wordmark"
            style={{ height: `${WORDMARK.heightEm}em`, aspectRatio: WORDMARK.viewBox.split(" ").slice(2).join(" / ") }}
          >
            <path d={WORDMARK.d} fill="currentColor" />
          </svg>
          <span className="mt-3 block font-display text-title font-medium">
            {restaurant.shortName} Restaurant and Banquet
          </span>
        </h1>
        <p className="mt-3 text-eyebrow font-semibold uppercase">
          {restaurant.branch}, {restaurant.address.city}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
          {features.menu && (
            <Link href="/menu" className="lp-btn lp-btn-on-dark">
              View Menu
            </Link>
          )}
          <a href={`tel:${restaurant.phone.tel}`} className="lp-link lp-link-on-dark lp-link-pad">
            Call<span className="sr-only"> {restaurant.phone.display}</span>
          </a>
          <a href={restaurant.directionsUrl} target="_blank" rel="noopener noreferrer" className="lp-link lp-link-on-dark">
            Directions<span className="sr-only"> (opens Google Maps)</span>
          </a>
        </div>
      </div>
    </section>
  );
}
