import { Logo } from "@/components/logo";
import { restaurant } from "@/data/restaurant";

export function SiteFooter() {
  // Extra room at the bottom on phones for the quick actions bar.
  return (
    <footer className="bg-cream px-gutter pt-16 pb-28 md:pb-16">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center">
        <Logo size={96} />
        <p className="text-base">Scan the QR code at your table to order.</p>
        <a href={restaurant.mapsUrl} target="_blank" rel="noopener" className="lp-link">
          Get Directions <span aria-hidden="true">→</span>
        </a>
        <p className="text-sm text-muted">
          © 2026 {restaurant.name}. A unit of {restaurant.operator}.
        </p>
      </div>
    </footer>
  );
}
