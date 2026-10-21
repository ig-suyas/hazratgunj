import { restaurant } from "@/data/restaurant";
import { openingHoursRows } from "@/lib/format";

/** Address, hours and phone on deep green. Every value comes from src/data/restaurant.ts. */
export function Visit() {
  const { address, phone, social } = restaurant;
  return (
    <section className="bg-bottle px-gutter py-16 text-paper md:py-24" aria-labelledby="visit-title">
      <div className="mx-auto max-w-6xl">
        <div data-reveal>
          <p className="text-eyebrow font-semibold uppercase text-sand">Visit us</p>
          <h2 id="visit-title" className="mt-3 font-display text-headline font-medium">
            {restaurant.branch}, {address.city}
          </h2>
        </div>

        <div className="mt-12 grid gap-10 border-t border-paper/25 pt-10 md:grid-cols-3 md:gap-8" data-reveal>
          <div>
            <h3 className="text-eyebrow font-semibold uppercase text-sand">Address</h3>
            <address className="mt-3 text-base not-italic leading-relaxed">
              {address.line1}
              <br />
              {address.line2}
              <br />
              {address.city}, {address.region} {address.postalCode}
            </address>
          </div>
          <div>
            <h3 className="text-eyebrow font-semibold uppercase text-sand">Hours</h3>
            <dl className="mt-3 text-base">
              {openingHoursRows().map((row) => (
                <div key={row.days}>
                  <dt>{row.days}</dt>
                  <dd className="tabular font-semibold">{row.time}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h3 className="text-eyebrow font-semibold uppercase text-sand">Phone</h3>
            <p className="mt-3 text-base">
              <a href={`tel:${phone.tel}`} className="tabular font-semibold">
                {phone.display}
              </a>
            </p>
            <p className="mt-2 text-sm">
              <a href={social.instagram.url} target="_blank" rel="noopener" className="text-beige underline underline-offset-4">
                Instagram @{social.instagram.handle}
              </a>
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4">
          <a href={restaurant.mapsUrl} target="_blank" rel="noopener" className="lp-btn lp-btn-on-dark">
            Get Directions
          </a>
          <a href={`tel:${phone.tel}`} className="lp-link lp-link-on-dark">
            Call <span className="tabular">{phone.display}</span>
          </a>
        </div>
      </div>
    </section>
  );
}
