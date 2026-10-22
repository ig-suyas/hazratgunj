import { Banquet } from "@/components/landing/banquet";
import { Hero } from "@/components/landing/hero";
import { Intro } from "@/components/landing/intro";
import { MobileActions } from "@/components/landing/mobile-actions";
import { RestaurantSchema } from "@/components/landing/restaurant-schema";
import { Reveal } from "@/components/landing/reveal";
import { Reviews } from "@/components/landing/reviews";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { Spaces } from "@/components/landing/spaces";
import { Visit } from "@/components/landing/visit";
import "./landing.css";

export default function Home() {
  return (
    <div>
      <SiteHeader />
      <main>
        <Hero />
        <Intro />
        <Spaces />
        <Banquet />
        <Reviews />
        <Visit />
      </main>
      <SiteFooter />
      <MobileActions />
      <Reveal />
      <RestaurantSchema />
    </div>
  );
}
