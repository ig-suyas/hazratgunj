"use client";

import { useMemo, useState } from "react";
import { useLive } from "@/components/app/hooks";
import { Button, DemoDataLabel, ErrorState, Loading, PageHeader, Segmented, Switch, toast } from "@/components/app/ui";
import { getSalesReport, getTimeline, type SalesReport, type Timeline } from "@/lib/api";
import { change, count, dayLabel, daysBetween, monthLabel, money, percent, rangeLabel, WEEKDAYS_LONG } from "@/lib/fmt";
import { ChartCard, DataTable, EChart } from "./chart";
import {
  HOURS,
  categoryOption,
  categorySlices,
  dishesOption,
  groupPoints,
  heatOption,
  hourLabel,
  palette,
  pickDishes,
  sessionOption,
  tableSalesOption,
  trendOption,
  weekdayOption,
  type Grain,
} from "./chart-options";
import { RangeTimeline, monthsBetween, presetRange, type Range } from "./range-timeline";

export default function ReportsPage() {
  const timeline = useLive(getTimeline, "timeline", ["orders"]);
  if (timeline.error && !timeline.data) return <ErrorState error={timeline.error} onRetry={timeline.reload} />;
  if (!timeline.data)
    return (
      <>
        <PageHeader title="Reports" description="Building the year of demo orders…" actions={<DemoDataLabel />} />
        <Loading rows={5} label="Loading the sales data" />
      </>
    );
  return <Reports timeline={timeline.data} />;
}

function Reports({ timeline }: { timeline: Timeline }) {
  const today = timeline.end;
  const start = timeline.start;
  const [range, setRange] = useState<Range>(() => presetRange("month", today, start));
  const [compare, setCompare] = useState(true);
  const [grain, setGrain] = useState<Grain>("day");
  const [side, setSide] = useState<"best" | "worst">("best");
  const [metric, setMetric] = useState<"qty" | "revenue">("qty");
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);
  const p = useMemo(() => palette(), []);

  const report = useLive(() => getSalesReport({ ...range, compare: true }), `${range.from}:${range.to}`, ["orders"]);
  const r = report.data;
  const days = daysBetween(range.from, range.to) + 1;
  const effectiveGrain: Grain = grain === "day" && days > 120 ? "week" : grain;
  const opts = useMemo(
    () =>
      r && {
        trend: trendOption(p, r, effectiveGrain, compare),
        category: categoryOption(p, r),
        heat: heatOption(p, r),
        weekday: weekdayOption(p, r),
        tableSales: tableSalesOption(p, r),
        session: sessionOption(p, r),
      },
    [p, r, effectiveGrain, compare],
  );
  const dishList = useMemo(() => (r ? pickDishes(r, side, metric) : []), [r, side, metric]);
  const dishOpt = useMemo(() => dishesOption(p, dishList, metric), [p, dishList, metric]);

  const months = useMemo(() => monthsBetween(start, today), [start, today]);

  const downloadPdf = async (key: string, from: string, to: string, title: string) => {
    setPdfBusy(key);
    try {
      const { downloadReportPdf } = await import("./report-pdf");
      await downloadReportPdf({ from, to, title });
      toast("PDF downloaded");
    } catch {
      toast("The PDF could not be made. Please try again.");
    } finally {
      setPdfBusy(null);
    }
  };

  const prevLabel = r?.prevRange ? `vs ${rangeLabel(r.prevRange.from, r.prevRange.to)}` : "No earlier data in the 12 months";

  return (
    <>
      <PageHeader
        title="Reports"
        description={`Sales are served orders after discounts, before taxes. ${rangeLabel(range.from, range.to)}.`}
        actions={
          <>
            <DemoDataLabel className="self-center" />
            <Button variant="primary" busy={pdfBusy === "range"} onClick={() => downloadPdf("range", range.from, range.to, "Sales report")}>
              Download PDF
            </Button>
          </>
        }
      />

      {/* The shared date-range timeline: everything below and the PDF follow it. */}
      <ChartCard
        title="Date range"
        subtitle="Daily sales over the last 12 months. Every chart, total and PDF below follows the days you pick."
        className="mb-4"
        controls={
          <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
            <Switch checked={compare} onChange={setCompare} label="Compare to previous period" />
            Compare to previous period
          </label>
        }
        table={<DataTable head={["Month", "Sales", "Orders"]} numeric={[1, 2]} rows={monthTotals(timeline).map((m) => [monthLabel(m.month), money(m.sales), count(m.orders)])} />}
      >
        <RangeTimeline timeline={timeline} value={range} onChange={setRange} />
      </ChartCard>

      {report.error && !r ? (
        <ErrorState error={report.error} onRetry={report.reload} />
      ) : !r || !opts ? (
        <Loading rows={4} label="Loading the report" />
      ) : (
        <div className={`space-y-4 transition-opacity ${report.loading ? "opacity-60" : ""}`} aria-busy={report.loading}>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Total sales" value={money(r.kpis.sales)} now={r.kpis.sales} prev={r.prev?.sales} series={r.daily.map((d) => d.sales)} compareLabel={prevLabel} />
            <Kpi label="Orders" value={count(r.kpis.orders)} now={r.kpis.orders} prev={r.prev?.orders} series={r.daily.map((d) => d.orders)} compareLabel={prevLabel} />
            <Kpi
              label="Average bill"
              value={money(Math.round(r.kpis.avgBill))}
              now={r.kpis.avgBill}
              prev={r.prev?.avgBill}
              series={r.daily.map((d) => (d.orders ? d.sales / d.orders : 0))}
              compareLabel={prevLabel}
            />
            <Kpi label="Discounts given" value={money(r.kpis.discount)} now={r.kpis.discount} prev={r.prev?.discount} series={r.daily.map((d) => d.discount)} compareLabel={prevLabel} lowerIsNeutral />
          </div>

          <ChartCard
            title="Sales trend"
            subtitle={compare && r.prevRange ? `Dashed line: ${rangeLabel(r.prevRange.from, r.prevRange.to)}` : "Sales by period"}
            controls={
              <Segmented
                label="Group by"
                size="sm"
                value={effectiveGrain}
                onChange={setGrain}
                options={[
                  { value: "day", label: "Day" },
                  { value: "week", label: "Week" },
                  { value: "month", label: "Month" },
                ]}
              />
            }
            table={<DataTable head={["Period", "Sales", "Orders"]} numeric={[1, 2]} rows={groupPoints(r.daily, effectiveGrain).map((g) => [g.label, money(g.sales), count(g.orders)])} />}
          >
            <EChart option={opts.trend} height={280} label="Sales trend line chart" />
          </ChartCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title={side === "best" ? "Best-selling dishes" : "Slowest dishes"}
              subtitle={`Top 10 by ${metric === "qty" ? "quantity" : "revenue"}`}
              controls={
                <>
                  <Segmented
                    label="Best or worst"
                    size="sm"
                    value={side}
                    onChange={setSide}
                    options={[
                      { value: "best", label: "Best" },
                      { value: "worst", label: "Worst" },
                    ]}
                  />
                  <Segmented
                    label="Measure"
                    size="sm"
                    value={metric}
                    onChange={setMetric}
                    options={[
                      { value: "qty", label: "Qty" },
                      { value: "revenue", label: "₹" },
                    ]}
                  />
                </>
              }
              table={<DataTable head={["Dish", "Category", "Sold", "Revenue"]} numeric={[2, 3]} rows={dishList.map((d) => [d.name, d.categoryName, count(d.qty), money(d.revenue)])} />}
            >
              <EChart option={dishOpt} height={340} label={`${side === "best" ? "Best" : "Worst"} selling dishes bar chart`} />
            </ChartCard>

            <ChartCard
              title="Category split"
              subtitle="Share of sales"
              table={<DataTable head={["Category", "Sales", "Share"]} numeric={[1, 2]} rows={r.categories.map((c) => [c.name, money(c.revenue), percent((c.revenue / (r.kpis.sales || 1)) * 100)])} />}
            >
              <EChart option={opts.category} height={300} label="Category share donut chart" />
              <p className="text-sm text-muted">Top five categories; the rest are grouped as Other ({categorySlices(r).length > 5 ? r.categories.length - 5 : 0} categories).</p>
            </ChartCard>
          </div>

          <ChartCard
            title="Peak hours"
            subtitle="Orders placed, by weekday and hour"
            table={<DataTable head={["Day", ...HOURS.map(hourLabel)]} numeric={HOURS.map((_, i) => i + 1)} rows={r.heat.map((row, wd) => [WEEKDAYS_LONG[wd], ...HOURS.map((h) => row[h])])} />}
          >
            <div className="overflow-x-auto">
              <div className="min-w-[36rem]">
                <EChart option={opts.heat} height={300} label="Heatmap of orders by weekday and hour" />
              </div>
            </div>
          </ChartCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Busiest days"
              subtitle="Average orders a day, by weekday"
              table={<DataTable head={["Day", "Orders a day", "Sales"]} numeric={[1, 2]} rows={r.weekdays.map((w) => [WEEKDAYS_LONG[w.weekday], w.days ? (w.orders / w.days).toFixed(0) : "0", money(w.sales)])} />}
            >
              <EChart option={opts.weekday} height={260} label="Average orders per weekday bar chart" />
            </ChartCard>
            <Outcomes r={r} />
          </div>

          <ChartCard
            title="Table performance"
            subtitle="Sales per table, and how long guests stay"
            table={<DataTable head={["Table", "Sales", "Orders", "Visits", "Avg stay"]} numeric={[1, 2, 3, 4]} rows={r.tables.map((t) => [`Table ${t.table}`, money(t.sales), count(t.orders), count(t.sessions), `${Math.round(t.avgSessionMin)} min`])} />}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-muted">Sales</p>
                <EChart option={opts.tableSales} height={240} label="Sales per table bar chart" />
              </div>
              <div>
                <p className="text-sm font-semibold text-muted">Average stay</p>
                <EChart option={opts.session} height={240} label="Average session minutes per table bar chart" />
              </div>
            </div>
          </ChartCard>

          <MonthTable r={r} />

          <div className="grid gap-4 lg:grid-cols-2">
            <Notes r={r} />
            <ReadyReports months={months} start={start} today={today} busy={pdfBusy} onDownload={downloadPdf} />
          </div>
        </div>
      )}
    </>
  );
}

function monthTotals(t: Timeline) {
  const m = new Map<string, { month: string; sales: number; orders: number }>();
  for (const d of t.days) {
    const k = d.key.slice(0, 7);
    const x = m.get(k) ?? { month: k, sales: 0, orders: 0 };
    x.sales += d.sales;
    x.orders += d.orders;
    m.set(k, x);
  }
  return [...m.values()];
}

function Sparkline({ values }: { values: number[] }) {
  // At most ~60 points: long ranges are averaged into buckets.
  const step = Math.max(1, Math.ceil(values.length / 60));
  const pts: number[] = [];
  for (let i = 0; i < values.length; i += step) {
    const chunk = values.slice(i, i + step);
    pts.push(chunk.reduce((a, b) => a + b, 0) / chunk.length);
  }
  if (pts.length < 2) return <div className="h-8" />;
  const max = Math.max(...pts) || 1;
  const min = Math.min(...pts);
  const w = 120;
  const h = 32;
  const d = pts.map((v, i) => `${((i / (pts.length - 1)) * w).toFixed(1)},${(h - 3 - ((v - min) / (max - min || 1)) * (h - 6)).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-8 w-full" aria-hidden="true">
      <polyline points={d} fill="none" stroke="var(--color-bottle)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

function Kpi({
  label,
  value,
  now,
  prev,
  series,
  compareLabel,
  lowerIsNeutral = false,
}: {
  label: string;
  value: string;
  now: number;
  prev: number | undefined;
  series: number[];
  compareLabel: string;
  lowerIsNeutral?: boolean;
}) {
  const c = change(now, prev);
  return (
    <div className="rounded-card border border-sand bg-paper p-4">
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="mt-1 text-[1.6rem] leading-tight font-semibold tabular">{value}</p>
      <p className="mt-1 text-sm">
        {c === null ? (
          <span className="text-muted">No comparison</span>
        ) : (
          <>
            <span className={`font-semibold tabular ${c >= 0 || lowerIsNeutral ? "text-bottle" : "text-nonveg"}`}>
              <span aria-hidden="true">{c >= 0 ? "↑" : "↓"}</span> {c >= 0 ? "+" : ""}
              {c.toFixed(1)}%
            </span>{" "}
            <span className="text-muted">{compareLabel}</span>
          </>
        )}
      </p>
      <div className="mt-2">
        <Sparkline values={series} />
      </div>
    </div>
  );
}

const OUTCOME_COLORS = ["#257a55", "#2e6fbf", "#cf6a2c", "#a8509a", "#a87c0c"];

function Outcomes({ r }: { r: SalesReport }) {
  const o = r.outcomes;
  const rows = [
    { label: "Accepted and served", value: o.served, color: OUTCOME_COLORS[0] },
    { label: "Still open", value: o.open, color: OUTCOME_COLORS[1] },
    { label: "Rejected by staff", value: o.declined, color: OUTCOME_COLORS[2] },
    { label: "Cancelled", value: o.cancelled, color: OUTCOME_COLORS[4] },
    { label: "Blocked guest", value: o.blocked, color: OUTCOME_COLORS[3] },
  ];
  const total = rows.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <ChartCard title="Order outcomes" subtitle={`${count(total)} orders placed`}>
      <div className="flex h-4 overflow-hidden rounded-pill bg-beige" aria-hidden="true">
        {rows.map((x) =>
          x.value ? <span key={x.label} style={{ width: `${(x.value / total) * 100}%`, background: x.color }} className="border-r-2 border-paper last:border-0" /> : null,
        )}
      </div>
      <ul className="mt-4 space-y-2">
        {rows.map((x) => (
          <li key={x.label} className="flex items-center gap-3">
            <span aria-hidden="true" className="size-3 shrink-0 rounded-xs" style={{ background: x.color }} />
            <span className="flex-1">{x.label}</span>
            <span className="font-semibold tabular">{count(x.value)}</span>
            <span className="w-16 text-right text-sm text-muted tabular">{percent((x.value / total) * 100)}</span>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}

function MonthTable({ r }: { r: SalesReport }) {
  return (
    <section aria-labelledby="months-h" className="rounded-card border border-sand bg-paper p-4 sm:p-5">
      <h2 id="months-h" className="text-lg font-semibold">
        Month by month
      </h2>
      <p className="mb-3 text-sm text-muted">Within the selected range. Growth compares each month with the one above it.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-sand text-left">
              <th scope="col" className="py-2 pr-3">Month</th>
              <th scope="col" className="py-2 pr-3 text-right">Sales</th>
              <th scope="col" className="py-2 pr-3 text-right">Orders</th>
              <th scope="col" className="py-2 pr-3 text-right">Average bill</th>
              <th scope="col" className="py-2 pr-3">Best dish</th>
              <th scope="col" className="py-2 text-right">Growth</th>
            </tr>
          </thead>
          <tbody>
            {r.months.map((m) => (
              <tr key={m.month} className="border-b border-sand/60">
                <th scope="row" className="py-2 pr-3 text-left font-semibold">
                  {monthLabel(m.month)}
                  {m.partial && <span className="ml-1 font-normal text-muted">(part)</span>}
                </th>
                <td className="py-2 pr-3 text-right tabular">{money(m.sales)}</td>
                <td className="py-2 pr-3 text-right tabular">{count(m.orders)}</td>
                <td className="py-2 pr-3 text-right tabular">{money(Math.round(m.avgBill))}</td>
                <td className="py-2 pr-3">{m.bestDish ?? "—"}</td>
                <td className="py-2 text-right tabular">{m.growth === null ? "—" : `${m.growth >= 0 ? "+" : ""}${m.growth.toFixed(1)}%`}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <th scope="row" className="py-2 pr-3 text-left">Total</th>
              <td className="py-2 pr-3 text-right tabular">{money(r.kpis.sales)}</td>
              <td className="py-2 pr-3 text-right tabular">{count(r.kpis.orders)}</td>
              <td className="py-2 pr-3 text-right tabular">{money(Math.round(r.kpis.avgBill))}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function Notes({ r }: { r: SalesReport }) {
  const max = r.notes[0]?.count ?? 1;
  return (
    <section aria-labelledby="notes-h" className="rounded-card border border-sand bg-paper p-4 sm:p-5">
      <h2 id="notes-h" className="text-lg font-semibold">
        Most common guest notes
      </h2>
      <p className="mb-3 text-sm text-muted">Notes guests added to dishes</p>
      {r.notes.length === 0 ? (
        <p className="text-muted">No notes in this range.</p>
      ) : (
        <ol className="space-y-2">
          {r.notes.map((n, i) => (
            <li key={n.note} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3">
              <span className="text-sm text-muted tabular">{i + 1}</span>
              <span>
                {n.note}
                <span className="mt-1 block h-1.5 rounded-pill bg-beige">
                  <span className="block h-full rounded-pill bg-bottle" style={{ width: `${(n.count / max) * 100}%` }} />
                </span>
              </span>
              <span className="font-semibold tabular">{count(n.count)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function ReadyReports({
  months,
  start,
  today,
  busy,
  onDownload,
}: {
  months: string[];
  start: string;
  today: string;
  busy: string | null;
  onDownload: (key: string, from: string, to: string, title: string) => void;
}) {
  // The last 12 months: whole months, the current one up to today.
  const list = months.slice(-12).reverse();
  return (
    <section aria-labelledby="ready-h" className="rounded-card border border-sand bg-paper p-4 sm:p-5">
      <h2 id="ready-h" className="text-lg font-semibold">
        Ready-made reports
      </h2>
      <p className="mb-3 text-sm text-muted">A4 PDFs with charts and tables.</p>
      <ul className="divide-y divide-sand">
        <li className="flex items-center justify-between gap-3 py-2">
          <span>
            <span className="font-semibold">Full year</span>
            <span className="block text-sm text-muted">{rangeLabel(start, today)}</span>
          </span>
          <Button size="sm" busy={busy === "year"} onClick={() => onDownload("year", start, today, "Annual sales report")}>
            PDF
          </Button>
        </li>
        {list.map((m) => {
          const [y, mo] = m.split("-").map(Number);
          const last = `${m}-${String(new Date(Date.UTC(y, mo, 0)).getUTCDate()).padStart(2, "0")}`;
          const from = `${m}-01` < start ? start : `${m}-01`;
          const to = last > today ? today : last;
          return (
            <li key={m} className="flex items-center justify-between gap-3 py-2">
              <span>
                <span className="font-semibold">{monthLabel(m)}</span>
                {to < last && <span className="block text-sm text-muted">To {dayLabel(to)}</span>}
              </span>
              <Button size="sm" busy={busy === m} onClick={() => onDownload(m, from, to, `Monthly report, ${monthLabel(m)}`)}>
                PDF
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
