import Image from "next/image";
import Link from "next/link";
import { restaurant } from "@/data/restaurant";
import { features } from "@/features";
import hallPhoto from "@/assets/venue/rattan-hall.webp";

/**
 * Editorial introduction: a short statement and paragraph beside one photo.
 * Every fact comes from src/data/restaurant.ts or the client's photos.
 */
export function Intro() {
  const facts = ["Restaurant and banquet", restaurant.cuisines.join(" · "), `${restaurant.branch}, ${restaurant.address.city}`];
  return (
    <section className="bg-cream px-gutter py-16 md:py-24" aria-labelledby="intro-title">
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-12 md:items-center md:gap-8">
        <div className="md:col-span-6" data-reveal>
          <h2 id="intro-title" className="font-display text-headline font-medium text-balance">
            A restaurant and banquet hall on {restaurant.branch}, {restaurant.address.city}.
          </h2>
          <p className="mt-6 max-w-[65ch] text-base text-muted md:text-lg">
            {restaurant.shortName} serves North Indian, Chinese and Continental food in four dining rooms, the Garden, the
            Pavilion, the Balcony and the Box Office, above Kalyan Jewellers. It is run by {restaurant.operator}.
          </p>

          <ul className="lp-facts mt-10">
            {facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>

          {features.menu && (
            <Link href="/menu" className="lp-link mt-10">
              Explore the menu
              <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>

        <div className="-mx-gutter md:col-span-5 md:col-start-8 md:mx-0" data-reveal>
          <Image
            src={hallPhoto}
            alt="Rattan chairs with floral cushions in the dining hall, the Pavilion behind brass screens"
            sizes="(min-width: 48rem) 40vw, 100vw"
            placeholder="blur"
            className="h-auto w-full"
          />
        </div>
      </div>
    </section>
  );
}
