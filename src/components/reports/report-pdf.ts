// Sales report PDF (A4), made in the browser and loaded only when a download is
// requested. Charts are drawn by the same chart settings as the screen, on
// off-screen canvases, and placed as images; tables run across pages.
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { getSalesReport, type SalesReport } from "@/lib/api";
import { change, count, money, monthLabel, percent, rangeLabel, WEEKDAYS_LONG } from "@/lib/fmt";
import { categoryOption, dishesOption, groupPoints, heatOption, HOURS, hourLabel, palette, pickDishes, tableSalesOption, trendOption, weekdayOption, type Grain } from "./chart-options";
import { echarts, type ChartOption } from "./echarts";
import { A4, INK, addFooters, applyGeist, logoPng, restaurantName, restaurantPlace } from "./pdf-kit";

const W = A4.w - A4.margin * 2;
const BOTTOM = A4.h - 20;

/** Draws a chart on a hidden canvas and returns it as a JPEG (white ground; far smaller in the PDF than PNG). */
function chartImage(option: ChartOption, px: { w: number; h: number }) {
  const el = document.createElement("div");
  el.style.cssText = `position:fixed;left:-10000px;top:0;width:${px.w}px;height:${px.h}px`;
  document.body.appendChild(el);
  const c = echarts.init(el, undefined, { renderer: "canvas", width: px.w, height: px.h });
  c.setOption({ ...option, animation: false });
  const url = c.getDataURL({ type: "jpeg", pixelRatio: 2, backgroundColor: "#ffffff" });
  c.dispose();
  el.remove();
  return url;
}

type Table = { head: string[]; body: (string | number)[][]; right?: number[] };

export async function downloadReportPdf({ from, to, title }: { from: string; to: string; title: string }) {
  const r = await getSalesReport({ from, to, compare: true });
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  await applyGeist(doc);
  const logo = await logoPng();
  const p = palette();
  let y = A4.margin;

  const space = (h: number) => {
    if (y + h > BOTTOM) {
      doc.addPage();
      y = A4.margin;
    }
  };
  const heading = (text: string, sub?: string) => {
    space(16);
    doc.setFontSize(13);
    doc.setTextColor(...INK.bottle);
    doc.text(text, A4.margin, y + 5);
    y += 7;
    if (sub) {
      doc.setFontSize(8.5);
      doc.setTextColor(...INK.muted);
      doc.text(sub, A4.margin, y + 3);
      y += 5;
    }
    y += 1;
  };
  const image = (option: ChartOption, mmH: number, pxH = Math.round((mmH / W) * 900)) => {
    space(mmH + 2);
    doc.addImage(chartImage(option, { w: 900, h: pxH }), "JPEG", A4.margin, y, W, mmH);
    y += mmH + 4;
  };
  const table = (t: Table) => {
    autoTable(doc, {
      startY: y,
      head: [t.head],
      body: t.body,
      margin: { left: A4.margin, right: A4.margin, bottom: 22 },
      styles: { font: "Geist", fontSize: 8.5, cellPadding: 1.6, textColor: rgb(INK.charcoal), lineColor: rgb(INK.sand), lineWidth: 0.1 },
      headStyles: { fillColor: rgb(INK.cream), textColor: rgb(INK.bottle), fontStyle: "normal" },
      alternateRowStyles: { fillColor: [251, 248, 242] },
      columnStyles: Object.fromEntries((t.right ?? []).map((i) => [i, { halign: "right" as const }])),
    });
    y = ((doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY ?? y) + 6;
  };

  // Header
  doc.addImage(logo, "PNG", A4.margin, y, 22, 22);
  doc.setFontSize(14);
  doc.setTextColor(...INK.charcoal);
  doc.text(restaurantName, A4.margin + 27, y + 6);
  doc.setFontSize(9);
  doc.setTextColor(...INK.muted);
  doc.text(restaurantPlace, A4.margin + 27, y + 11);
  doc.setFontSize(17);
  doc.setTextColor(...INK.bottle);
  doc.text(title, A4.margin + 27, y + 19);
  doc.setFontSize(10);
  doc.setTextColor(...INK.charcoal);
  doc.text(`${rangeLabel(r.from, r.to)} · ${r.days} ${r.days === 1 ? "day" : "days"}`, A4.margin + 27, y + 25);
  doc.setDrawColor(...INK.brass);
  doc.setLineWidth(0.3);
  doc.roundedRect(A4.w - A4.margin - 24, y + 1, 24, 7, 2, 2);
  doc.setFontSize(7.5);
  doc.setTextColor(...INK.brassInk);
  doc.text("DEMO DATA", A4.w - A4.margin - 12, y + 5.6, { align: "center" });
  y += 30;
  doc.line(A4.margin, y, A4.w - A4.margin, y);
  y += 5;

  // KPI summary
  const prevNote = r.prevRange ? `vs ${rangeLabel(r.prevRange.from, r.prevRange.to)}` : "no earlier data";
  const kpis: [string, string, number, number | undefined][] = [
    ["Total sales", money(r.kpis.sales), r.kpis.sales, r.prev?.sales],
    ["Orders", count(r.kpis.orders), r.kpis.orders, r.prev?.orders],
    ["Average bill", money(Math.round(r.kpis.avgBill)), r.kpis.avgBill, r.prev?.avgBill],
    ["Discounts given", money(r.kpis.discount), r.kpis.discount, r.prev?.discount],
  ];
  const bw = (W - 9) / 4;
  kpis.forEach(([label, value, now, prev], i) => {
    const x = A4.margin + i * (bw + 3);
    doc.setDrawColor(...INK.sand);
    doc.setFillColor(251, 248, 242);
    doc.roundedRect(x, y, bw, 24, 2, 2, "FD");
    doc.setFontSize(8);
    doc.setTextColor(...INK.muted);
    doc.text(label, x + 3, y + 5.5);
    doc.setFontSize(13);
    doc.setTextColor(...INK.charcoal);
    doc.text(value, x + 3, y + 13);
    const c = change(now, prev);
    doc.setFontSize(7.5);
    doc.setTextColor(...INK.muted);
    doc.text(c === null ? "No comparison" : `${c >= 0 ? "+" : ""}${c.toFixed(1)}% ${prevNote}`, x + 3, y + 19.5, { maxWidth: bw - 5 });
  });
  y += 28;
  doc.setFontSize(8.5);
  doc.setTextColor(...INK.muted);
  const o = r.outcomes;
  doc.text(
    `Sales are served orders after discounts, before taxes. Orders placed: ${count(r.kpis.placed)} (served ${count(o.served)}, rejected ${count(o.declined)}, cancelled ${count(o.cancelled)}, blocked guest ${count(o.blocked)}, open ${count(o.open)}).`,
    A4.margin,
    y + 3,
    { maxWidth: W },
  );
  y += 10;

  const grain: Grain = r.days > 92 ? "month" : r.days > 31 ? "week" : "day";
  heading("Sales trend", `By ${grain}${r.prevRange ? "; dashed line: previous period" : ""}`);
  image(trendOption(p, r, grain, !!r.prevRange, true), 68);

  heading("Category split", "Share of sales");
  image(categoryOption(p, r, true), 58, 300);
  table({
    head: ["Category", "Sales", "Share", "Items sold"],
    body: r.categories.map((c) => [c.name, money(c.revenue), percent((c.revenue / (r.kpis.sales || 1)) * 100), count(c.qty)]),
    right: [1, 2, 3],
  });

  const best = pickDishes(r, "best", "qty");
  heading("Best-selling dishes", "Top 10 by quantity");
  image(dishesOption(p, best, "qty", true), 70);
  table({ head: ["#", "Dish", "Category", "Sold", "Revenue"], body: best.map((d, i) => [i + 1, d.name, d.categoryName, count(d.qty), money(d.revenue)]), right: [0, 3, 4] });
  heading("Slowest dishes", "Bottom 10 by quantity");
  table({
    head: ["#", "Dish", "Category", "Sold", "Revenue"],
    body: pickDishes(r, "worst", "qty").map((d, i) => [i + 1, d.name, d.categoryName, count(d.qty), money(d.revenue)]),
    right: [0, 3, 4],
  });

  heading("Peak hours", "Orders placed, by weekday and hour");
  image(heatOption(p, r, true), 70);
  heading("Busiest days", "Average orders a day");
  image(weekdayOption(p, r, true), 52);
  heading("Table performance");
  image(tableSalesOption(p, r, true), 48);
  table({
    head: ["Table", "Sales", "Orders", "Visits", "Average stay"],
    body: r.tables.map((t) => [`Table ${t.table}`, money(t.sales), count(t.orders), count(t.sessions), `${Math.round(t.avgSessionMin)} min`]),
    right: [1, 2, 3, 4],
  });

  heading("Month by month", "Within this report's range");
  table({
    head: ["Month", "Sales", "Orders", "Average bill", "Best dish", "Growth"],
    body: [
      ...r.months.map((m) => [
        `${monthLabel(m.month)}${m.partial ? " (part)" : ""}`,
        money(m.sales),
        count(m.orders),
        money(Math.round(m.avgBill)),
        m.bestDish ?? "—",
        m.growth === null ? "—" : `${m.growth >= 0 ? "+" : ""}${m.growth.toFixed(1)}%`,
      ]),
      ["Total", money(r.kpis.sales), count(r.kpis.orders), money(Math.round(r.kpis.avgBill)), "", ""],
    ],
    right: [1, 2, 3, 5],
  });

  heading("Peak hours in numbers");
  table({ head: ["Day", ...HOURS.map(hourLabel)], body: r.heat.map((row, wd) => [WEEKDAYS_LONG[wd].slice(0, 3), ...HOURS.map((h) => row[h])]), right: HOURS.map((_, i) => i + 1) });

  heading("Most common guest notes");
  table({ head: ["#", "Note", "Times"], body: r.notes.map((n, i) => [i + 1, n.note, count(n.count)]), right: [0, 2] });

  heading("Sales by period");
  table({ head: ["Period", "Sales", "Orders"], body: groupPoints(r.daily, grain).map((g) => [g.label, money(g.sales), count(g.orders)]), right: [1, 2] });

  addFooters(doc, `${restaurantName} · ${title} · ${rangeLabel(r.from, r.to)} · Demo data`);
  doc.save(`hazratgunj-${slug(title)}-${r.from}-to-${r.to}.pdf`);
  return r satisfies SalesReport;
}

const rgb = (c: readonly [number, number, number]) => [...c] as [number, number, number];
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
