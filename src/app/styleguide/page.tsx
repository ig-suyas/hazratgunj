import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArchDivider } from "@/components/arch-divider";
import { DietMark } from "@/components/diet-mark";
import { DishPlaceholder } from "@/components/dish-placeholder";
import { Logo } from "@/components/logo";
import { tiro } from "@/design/fonts";
import { duration } from "@/design/motion";
import { colorTokens } from "@/design/tokens";
import { restaurant } from "@/data/restaurant";
import archPhoto from "@/assets/venue/box-office.webp";

// Internal reference for the design tokens (dev only). Swatches are read
// straight from src/app/globals.css.
export const metadata: Metadata = { title: "Tokens", robots: { index: false, follow: false } };

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-5 text-eyebrow font-semibold uppercase text-brass-ink">{children}</p>
);

const Section = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <section className={`px-gutter py-14 ${className}`}>
    <div className="mx-auto max-w-5xl">{children}</div>
  </section>
);

export default function Styleguide() {
  if (process.env.NODE_ENV === "production") notFound();
  const colors = colorTokens();

  return (
    <main className={`${tiro.variable} min-h-dvh bg-paper text-charcoal`}>
      <Section className="pt-20">
        <Eyebrow>Logo (client artwork, theme colours)</Eyebrow>
        <div className="flex flex-wrap items-end gap-8">
          <Logo size={200} priority />
          <Logo size={88} />
          <Logo size={56} />
          <span className="grid size-20 place-items-center rounded-card bg-cream">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/svg/favicon.svg" alt="Favicon" width={64} height={64} />
          </span>
        </div>
      </Section>

      <ArchDivider />

      <Section>
        <Eyebrow>Colour tokens</Eyebrow>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {colors.map((c) => (
            <li key={c.name} className="overflow-hidden rounded-card bg-cream shadow-card">
              <div className="h-16" style={{ background: `var(--color-${c.name})` }} />
              <div className="space-y-0.5 p-3 text-sm">
                <p className="font-semibold">{c.name}</p>
                <p className="tabular text-muted">{c.value}</p>
                {c.note && <p className="text-muted">{c.note}</p>}
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <ArchDivider />

      <Section>
        <Eyebrow>Cormorant Garamond · Tiro Devanagari Hindi · Mukta</Eyebrow>
        <div className="space-y-5">
          <p className="font-display text-display font-medium">Pranaam, Gorakhpur</p>
          <p className="font-display text-headline font-medium">Lunch on Park Road</p>
          <p lang="hi" className="font-deva text-title leading-deva">
            {restaurant.greeting.devanagari} · {restaurant.wordmark.devanagari}
          </p>
          <p className="max-w-prose text-base text-muted">
            Mukta for menu text and interface. Prices in tabular figures:{" "}
            <span className="tabular font-semibold text-charcoal">₹89 · ₹449 · ₹599</span>
          </p>
        </div>
      </Section>

      <ArchDivider />

      <Section>
        <Eyebrow>Arch: mask, frame, divider · checkerboard · hairline</Eyebrow>
        <div className="grid items-end gap-10 md:grid-cols-[1fr_1fr_1.2fr]">
          <Image src={archPhoto} alt="" sizes="30vw" placeholder="blur" className="mask-arch aspect-[4/5] w-full object-cover" />
          <div className="[container-type:inline-size]">
            <DishPlaceholder label="Signature Shahi Tukda" />
          </div>
          <div className="space-y-8">
            <ArchDivider />
            <div className="checker-rule" />
            <div className="relative h-24 overflow-hidden rounded-card bg-cream">
              <div className="checker-field absolute inset-0 [--checker:1.25rem]" />
            </div>
            <div className="hairline" />
            <div className="flex flex-wrap gap-3">
              <button className="min-h-tap rounded-pill bg-bottle px-6 font-semibold text-paper shadow-card">View Menu</button>
              <button className="min-h-tap rounded-pill border border-brass px-6 font-semibold text-brass-ink">Call us</button>
              <span className="inline-flex items-center gap-2 text-sm">
                <DietMark veg /> Veg <DietMark veg={false} /> Non-veg
              </span>
            </div>
          </div>
        </div>
      </Section>

      <Section>
        <Eyebrow>Motion</Eyebrow>
        <ul className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
          {Object.entries(duration).map(([k, v]) => (
            <li key={k} className="rounded-card bg-cream p-4">
              <p className="font-semibold">{k}</p>
              <p className="tabular text-muted">{Math.round(v * 1000)} ms</p>
            </li>
          ))}
        </ul>
      </Section>
    </main>
  );
}
