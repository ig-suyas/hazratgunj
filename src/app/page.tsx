import { Banquet } from "@/components/landing/banquet";
import { Hero } from "@/components/landing/hero";
import { Intro } from "@/components/landing/intro";
import { Reveal } from "@/components/landing/reveal";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { Spaces } from "@/components/landing/spaces";
import { Visit } from "@/components/landing/visit";
import { tiro } from "@/design/fonts";
import "./landing.css";

export default function Home() {
  return (
    <div className={tiro.variable}>
      <SiteHeader />
      <main>
        <Hero />
        <Intro />
        <Spaces />
        <Banquet />
        <Visit />
      </main>
      <SiteFooter />
      <Reveal />
    </div>
  );
}
