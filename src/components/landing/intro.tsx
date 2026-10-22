import Image from "next/image";
import Link from "next/link";
import { features } from "@/features";
import { openingHoursRows } from "@/lib/format";
import hallPhoto from "@/assets/venue/rattan-hall.webp";

/**
 * Editorial introduction: what there is to eat, where, and when, beside one
 * photo. Every fact comes from src/data/restaurant.ts or the printed menu
 * (src/data/menu.json); the location is said once, by the hero.
 */
export function Intro() {
  const hours = openingHoursRows()[0];
  const facts = [`Open ${hours.days.toLowerCase()}, ${hours.time}`, "Veg and non-veg", "Banquet hall for events"];
  return (
    <section className="bg-cream px-gutter py-16 md:py-24" aria-labelledby="intro-title">
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-12 md:items-center md:gap-8">
        <div className="md:col-span-6" data-reveal>
          <h2 id="intro-title" className="font-display text-headline font-medium text-balance">
            North Indian, Chinese and Continental, under one roof.
          </h2>
          {/* Rooms named here are the ones shown under "The rooms" (spaces.tsx). */}
          <p className="mt-6 max-w-[65ch] text-base text-muted md:text-lg">
            From the tandoor, curries and biryani to Indo-Chinese starters, continental plates, desserts and shakes. Eat in
            the Garden, the Pavilion or the Box Office, above Kalyan Jewellers.
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
