import reviewsJson from "@/data/reviews.json";
import { restaurant } from "@/data/restaurant";
import { ReviewsMotion } from "./reviews-motion";

type Review = {
  id: string;
  name: string;
  initials: string;
  stars: number;
  text: string;
  excerpt: string;
  excerptCut: boolean;
  excerptShort: string;
  excerptShortCut: boolean;
  wallText: string;
  wallCut: boolean;
  featured: number | null;
};

// Google reviews copied by the restaurant (src/data/reviews.txt → npm run
// build:reviews). Wording is exactly as on Google; only emoji are removed.
const reviews = (reviewsJson as { reviews: Review[] }).reviews;
const front = reviews.filter((r) => r.featured !== null).sort((a, b) => a.featured! - b.featured!);
const { googleRating, googleReviewsUrl } = restaurant;

/** Each wall row starts at a different review, so the rows never line up. */
const wallRows = [0, 4, 7].map((start) => [...reviews.slice(start), ...reviews.slice(0, start)]);

const STAR = "M12 2.6l2.85 5.95 6.55.8-4.83 4.52 1.25 6.48L12 17.2l-5.82 3.15 1.25-6.48L2.6 9.35l6.55-.8z";

/** Brass stars; a fraction fills part of the last star. Decorative: callers give the text. */
function Stars({ value, size = 16, className = "" }: { value: number; size?: number; className?: string }) {
  return (
    <span aria-hidden="true" className={`inline-flex gap-0.5 ${className}`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" className="lp-star">
            <path d={STAR} className="lp-star-empty" />
            {fill > 0 && (
              <path d={STAR} className="lp-star-full" style={fill < 1 ? { clipPath: `inset(0 ${(1 - fill) * 100}% 0 0)` } : undefined} />
            )}
          </svg>
        );
      })}
    </span>
  );
}

function WallCard({ r }: { r: Review }) {
  return (
    <div className="lp-wall-card">
      <Stars value={r.stars} size={12} />
      <p className="lp-review-text mt-1.5 text-sm">
        {r.wallText}
        {r.wallCut && "…"}
      </p>
      <p className="mt-2 text-xs font-semibold">{r.name}</p>
    </div>
  );
}

/** Google reviews: five cards in front, a slow wall of reviews drifting behind them. */
export function Reviews() {
  return (
    <section id="reviews" className="lp-reviews bg-cream py-16 md:py-24" aria-labelledby="reviews-title">
      <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-x-10 gap-y-6 px-gutter" data-reveal>
        <div>
          <p className="text-eyebrow font-semibold uppercase text-brass-ink">Guest reviews</p>
          <h2 id="reviews-title" className="mt-3 font-display text-title font-medium text-balance md:text-headline">
            In our guests&rsquo; own words
          </h2>
        </div>
        <p className="flex items-center gap-4">
          <span className="sr-only">
            {googleRating.value} out of 5 stars, {googleRating.countLabel} Google reviews
          </span>
          <span aria-hidden="true" className="font-display text-[4rem] leading-none font-medium md:text-[5rem]">
            {googleRating.value}
          </span>
          <span aria-hidden="true" className="flex flex-col gap-1.5">
            <Stars value={googleRating.value} size={20} />
            <span className="text-sm text-muted">
              <span className="tabular font-semibold text-charcoal">{googleRating.countLabel}</span> reviews on Google
            </span>
          </span>
        </p>
      </div>

      <div className="lp-reviews-stage mt-10 md:mt-12">
        {/* Background texture only: hidden from assistive tech and never focusable. */}
        <div className="lp-wall" aria-hidden="true" inert>
          {wallRows.map((row, i) => (
            <div key={i} className="lp-wall-row">
              <div className="lp-wall-track">
                {[...row, ...row].map((r, k) => (
                  <WallCard key={`${r.id}-${k}`} r={r} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <ul className="lp-cluster" aria-label="Five guest reviews">
          {front.map((r) => (
            <li key={r.id} className="lp-card">
              <figure className="flex h-full flex-col">
                <p className="flex items-center gap-2">
                  <Stars value={r.stars} />
                  <span className="sr-only">{r.stars} out of 5 stars</span>
                </p>
                {/* Below 1280px cards are narrower: a shorter cut keeps each within about four lines. */}
                <blockquote className="lp-review-text mt-3 flex-1 text-[0.9375rem]">
                  <p className="whitespace-pre-line xl:hidden">
                    {r.excerptShort}
                    {r.excerptShortCut && "…"}
                  </p>
                  <p className="whitespace-pre-line max-xl:hidden">
                    {r.excerpt}
                    {r.excerptCut && "…"}
                  </p>
                </blockquote>
                {(r.excerptShortCut || r.excerptCut) && (
                  <p className={`mt-2 text-sm ${r.excerptShortCut && !r.excerptCut ? "xl:hidden" : !r.excerptShortCut && r.excerptCut ? "max-xl:hidden" : ""}`}>
                    <a href={googleReviewsUrl} target="_blank" rel="noopener noreferrer" className="lp-card-more">
                      Read more on Google<span className="sr-only"> (full review by {r.name}, opens in a new tab)</span>
                    </a>
                  </p>
                )}
                <figcaption className="mt-4 flex items-center gap-3 border-t border-sand pt-3">
                  <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-pill bg-beige text-sm font-semibold text-bottle">
                    {r.initials}
                  </span>
                  <span className="leading-tight">
                    <span className="block font-semibold">{r.name}</span>
                    <span className="block text-sm text-muted">Google review</span>
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>

      <div className="mx-auto mt-8 flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-gutter">
        <a href={googleReviewsUrl} target="_blank" rel="noopener noreferrer" className="lp-link">
          Read all reviews on Google<span className="sr-only"> (opens in a new tab)</span> <span aria-hidden="true">→</span>
        </a>
        <p className="text-sm text-muted">Shown as written on Google.</p>
      </div>
      <ReviewsMotion />
    </section>
  );
}
