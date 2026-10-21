import { restaurant } from "@/data/restaurant";
import { formatPrice } from "@/lib/format";

/** Banquet enquiries. Details from the printed banquet menu only (capacity is unconfirmed, so not shown). */
export function Banquet() {
  const { banquet } = restaurant;
  const [main, ...others] = banquet.phones;
  const details = [
    { term: "Lunch", value: banquet.sessions.lunch },
    { term: "Dinner", value: banquet.sessions.dinner },
    {
      term: "Per plate",
      value: `From ${formatPrice(banquet.perPlateFrom.veg)} veg, ${formatPrice(banquet.perPlateFrom.nonVeg)} non-veg, plus tax`,
    },
  ];

  return (
    <section className="bg-beige px-gutter py-16 md:py-24" aria-labelledby="banquet-title">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-5" data-reveal>
          <p className="text-eyebrow font-semibold uppercase text-brass-ink">Banquet</p>
          <h2 id="banquet-title" className="mt-3 font-display text-headline font-medium text-balance">
            Banquet enquiries
          </h2>
          <a href={`tel:${main.tel}`} className="lp-btn mt-8">
            Call to enquire
          </a>
          <p className="mt-4 text-sm text-muted">
            <span className="tabular">{main.display}</span>
            {others.map((p) => (
              <span key={p.tel}>
                {" · "}
                <a href={`tel:${p.tel}`} className="tabular text-charcoal">
                  {p.display}
                </a>
              </span>
            ))}
          </p>
        </div>

        <dl className="md:col-span-6 md:col-start-7" data-reveal>
          {details.map((d) => (
            <div key={d.term} className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4 border-b border-sand py-4 first:border-t">
              <dt className="text-sm font-semibold text-muted">{d.term}</dt>
              <dd className="text-base">{d.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
