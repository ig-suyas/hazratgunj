"use client";

import dynamic from "next/dynamic";
import { useDeferredValue, useId, useState } from "react";
import { useLive } from "@/components/app/hooks";
import { Button, Card, DemoDataLabel, ErrorState, Loading, PageHeader, inputClass, selectClass } from "@/components/app/ui";
import type { Range } from "@/components/reports/range-timeline";
import { demo } from "@/config/demo";
import { getOrders, getTimeline, type OrderStatus } from "@/lib/api";
import { count, money, rangeLabel } from "@/lib/fmt";
import { OrderList } from "./order-list";

// The shared date-range timeline (same one as Reports), loaded only here.
const RangeTimeline = dynamic(() => import("@/components/reports/range-timeline").then((m) => m.RangeTimeline), {
  ssr: false,
  loading: () => <Loading rows={2} label="Loading the timeline" />,
});

const PAGE = 50;
const STATUSES: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "received", label: "New" },
  { value: "preparing", label: "Preparing" },
  { value: "served", label: "Served" },
  { value: "declined", label: "Declined" },
  { value: "cancelled", label: "Cancelled" },
];

/** Every order of the last 12 months, filtered and paged (50 at a time). */
export function OrdersPage() {
  const id = useId();
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [table, setTable] = useState<number | null>(null);
  // null = all 12 months
  const [range, setRange] = useState<Range | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const q = useDeferredValue(query.trim());
  const filter = { status, table, from: range?.from, to: range?.to, q: q || undefined };
  const key = JSON.stringify({ ...filter, page });
  const data = useLive(() => getOrders({ ...filter, page, pageSize: PAGE }), key, ["orders"]);
  const r = data.data;
  const timeline = useLive(getTimeline, "timeline", ["orders"]);
  const t = timeline.data;
  const pages = r ? Math.max(1, Math.ceil(r.total / PAGE)) : 1;
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(0);
  };

  return (
    <>
      <PageHeader title="Orders" description={`Detailed orders are kept for ${demo.retentionMonths} months.`} actions={<DemoDataLabel />} />
      <Card className="mb-4 min-w-0 p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Date range</h2>
        <p className="mb-3 text-sm text-muted">Daily sales over the last 12 months. The list below follows the days you pick.</p>
        {t ? (
          <RangeTimeline timeline={t} value={range ?? { from: t.start, to: t.end }} onChange={reset(setRange)} />
        ) : timeline.error ? (
          <ErrorState error={timeline.error} onRetry={timeline.reload} />
        ) : (
          <Loading rows={2} label="Loading the timeline" />
        )}
      </Card>
      <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,1fr))]">
        <div>
          <label htmlFor={`${id}-q`} className="mb-1 block text-sm font-semibold">
            Search
          </label>
          <input id={`${id}-q`} type="search" value={query} onChange={(e) => reset(setQuery)(e.target.value)} placeholder="Order id, dish or note" className={inputClass} />
        </div>
        <div>
          <label htmlFor={`${id}-s`} className="mb-1 block text-sm font-semibold">
            Status
          </label>
          <select id={`${id}-s`} value={status} onChange={(e) => reset(setStatus)(e.target.value as OrderStatus | "all")} className={selectClass}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-t`} className="mb-1 block text-sm font-semibold">
            Table
          </label>
          <select id={`${id}-t`} value={table ?? ""} onChange={(e) => reset(setTable)(e.target.value ? Number(e.target.value) : null)} className={selectClass}>
            <option value="">All tables</option>
            {Array.from({ length: demo.tableCount }, (_, i) => (
              <option key={i} value={i + 1}>
                Table {i + 1}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {data.error && !r ? (
        <ErrorState error={data.error} onRetry={data.reload} />
      ) : !r ? (
        <Loading label="Loading orders" rows={6} />
      ) : (
        <Card className="p-4 sm:p-5" as="section">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2" aria-live="polite">
            <p className="font-semibold">
              <span className="tabular">{count(r.total)}</span> orders · {rangeLabel(r.from, r.to)}
            </p>
            <p className="text-sm text-muted">
              Sales from served orders: <span className="font-semibold text-charcoal tabular">{money(r.sales)}</span>
              {data.loading && " · updating…"}
            </p>
          </div>
          <OrderList orders={r.rows} empty="No orders match these filters." showDate />
          <nav aria-label="Pages" className="mt-4 flex items-center justify-between gap-3 border-t border-sand pt-4">
            <Button size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-sm text-muted tabular">
              Page {page + 1} of {count(pages)}
            </span>
            <Button size="sm" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </nav>
        </Card>
      )}
    </>
  );
}
