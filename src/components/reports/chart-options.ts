/**
 * Chart settings shared by the screen and the PDF, so both draw the same
 * charts from the same numbers. Colours come from the theme tokens; the five
 * category hues are theme-family tones checked for colour-blind separation
 * (green, blue, terracotta, plum, ochre) with sand for "Other".
 */
import type { SalesReport } from "@/lib/api";
import { addDays, dayLabel, monthLabel, moneyShort, money, count, WEEKDAYS, weekdayOf, formatTime, dayStart } from "@/lib/fmt";
import type { ChartOption } from "./echarts";

export type Palette = {
  ink: string;
  muted: string;
  grid: string;
  surface: string;
  primary: string;
  primarySoft: string;
  compare: string;
  brass: string;
  series: string[];
  other: string;
  ramp: string[];
  font: string;
};

/** Theme colours read from the CSS variables (fallbacks match globals.css). */
export function palette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    ink: v("--color-charcoal", "#2a2420"),
    muted: v("--color-muted", "#5e5348"),
    grid: v("--color-sand", "#d9c8a8"),
    surface: v("--color-paper", "#fbf8f2"),
    primary: v("--color-bottle", "#2f3e34"),
    primarySoft: "#8fb39d",
    compare: v("--color-brass", "#b08d4f"),
    brass: v("--color-brass-ink", "#7a5e2c"),
    series: ["#257a55", "#2e6fbf", "#cf6a2c", "#a8509a", "#a87c0c"],
    other: v("--color-sand", "#d9c8a8"),
    ramp: ["#f4efe4", "#d6e4d9", "#9fc2ab", "#5f9677", "#2f6b4f", "#2f3e34"],
    font: getComputedStyle(document.body).fontFamily || "system-ui, sans-serif",
  };
}

const base = (p: Palette, big = false) => ({
  animation: !big,
  textStyle: { fontFamily: p.font, color: p.ink, fontSize: big ? 15 : 12 },
  tooltip: {
    backgroundColor: p.surface,
    borderColor: p.grid,
    textStyle: { color: p.ink, fontFamily: p.font, fontSize: 13 },
    extraCssText: "border-radius:10px;box-shadow:0 8px 24px -14px rgba(42,36,32,.3);",
  },
  aria: { enabled: true },
});

const axisLabel = (p: Palette, big = false) => ({ color: p.muted, fontFamily: p.font, fontSize: big ? 14 : 12 });
const splitLine = (p: Palette) => ({ lineStyle: { color: p.grid, opacity: 0.6 } });
const valueAxis = (p: Palette, big: boolean, money = true, name?: string) => ({
  type: "value" as const,
  name,
  nameTextStyle: axisLabel(p, big),
  axisLabel: { ...axisLabel(p, big), formatter: money ? (x: number) => moneyShort(x) : (x: number) => count(x) },
  splitLine: splitLine(p),
});

// --- Trend --------------------------------------------------------------------

export type Grain = "day" | "week" | "month";

export function groupPoints(points: SalesReport["daily"], grain: Grain) {
  if (grain === "day") return points.map((d) => ({ key: d.key, label: dayLabel(d.key, false), sales: d.sales, orders: d.orders }));
  const m = new Map<string, { key: string; label: string; sales: number; orders: number }>();
  for (const d of points) {
    const key = grain === "week" ? addDays(d.key, -weekdayOf(d.key)) : d.key.slice(0, 7);
    const label = grain === "week" ? `Week of ${dayLabel(key, false)}` : monthLabel(key);
    const g = m.get(key) ?? { key, label, sales: 0, orders: 0 };
    g.sales += d.sales;
    g.orders += d.orders;
    m.set(key, g);
  }
  return [...m.values()];
}

export function trendOption(p: Palette, r: SalesReport, grain: Grain, compare: boolean, big = false): ChartOption {
  const cur = groupPoints(r.daily, grain);
  const prev = compare && r.prevDaily ? groupPoints(r.prevDaily, grain) : null;
  return {
    ...base(p, big),
    grid: { left: big ? 70 : 56, right: 16, top: prev ? 36 : 16, bottom: 40 },
    legend: prev ? { top: 0, left: 0, textStyle: axisLabel(p, big), data: ["This period", "Previous period"] } : undefined,
    tooltip: { ...base(p).tooltip, trigger: "axis", valueFormatter: (x: unknown) => money(Number(x)) },
    xAxis: {
      type: "category",
      data: cur.map((c) => c.label),
      axisLabel: { ...axisLabel(p, big), hideOverlap: true },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: p.grid } },
    },
    yAxis: valueAxis(p, big, true),
    series: [
      {
        name: "This period",
        type: "line",
        data: cur.map((c) => c.sales),
        smooth: false,
        symbol: "circle",
        symbolSize: cur.length > 40 ? 0 : 8,
        lineStyle: { width: 2, color: p.primary },
        itemStyle: { color: p.primary, borderColor: p.surface, borderWidth: 2 },
        areaStyle: { color: p.primarySoft, opacity: 0.3 },
      },
      ...(prev
        ? [
            {
              name: "Previous period",
              type: "line",
              data: cur.map((_, i) => prev[i]?.sales ?? null),
              symbol: "none",
              lineStyle: { width: 2, type: "dashed", color: p.compare },
              itemStyle: { color: p.compare },
            },
          ]
        : []),
    ],
  };
}

// --- Dishes -------------------------------------------------------------------

export function pickDishes(r: SalesReport, side: "best" | "worst", metric: "qty" | "revenue", limit = 10) {
  const list = [...r.dishes].sort((a, b) => (metric === "qty" ? b.qty - a.qty || b.revenue - a.revenue : b.revenue - a.revenue));
  return side === "best" ? list.slice(0, limit) : list.slice(-limit).reverse();
}

export function dishesOption(p: Palette, list: SalesReport["dishes"], metric: "qty" | "revenue", big = false): ChartOption {
  const rows = [...list].reverse();
  return {
    ...base(p, big),
    grid: { left: 8, right: 64, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      ...base(p).tooltip,
      trigger: "item",
      formatter: (x: { dataIndex: number }) => {
        const d = rows[x.dataIndex];
        return `<b>${d.name}</b><br/>${count(d.qty)} sold · ${money(d.revenue)}`;
      },
    },
    xAxis: { ...valueAxis(p, big, metric === "revenue"), show: false },
    yAxis: {
      type: "category",
      data: rows.map((d) => (d.name.length > 26 ? `${d.name.slice(0, 25)}…` : d.name)),
      axisLabel: { ...axisLabel(p, big), color: p.ink },
      axisTick: { show: false },
      axisLine: { show: false },
    },
    series: [
      {
        type: "bar",
        data: rows.map((d) => (metric === "qty" ? d.qty : d.revenue)),
        barMaxWidth: 18,
        itemStyle: { color: p.primary, borderRadius: [0, 4, 4, 0] },
        label: {
          show: true,
          position: "right",
          color: p.ink,
          fontFamily: p.font,
          fontSize: big ? 14 : 12,
          formatter: (x: { value: number }) => (metric === "qty" ? count(x.value) : moneyShort(x.value)),
        },
      },
    ],
  };
}

// --- Peak hours ---------------------------------------------------------------

export const HOURS = Array.from({ length: 13 }, (_, i) => i + 11); // 11 am to 11 pm
export const hourLabel = (h: number) => formatTime(dayStart("2026-01-01") + h * 3_600_000).replace(":00", "");

export function heatOption(p: Palette, r: SalesReport, big = false): ChartOption {
  const data: [number, number, number][] = [];
  let max = 0;
  r.heat.forEach((row, wd) =>
    HOURS.forEach((h, x) => {
      data.push([x, wd, row[h]]);
      max = Math.max(max, row[h]);
    }),
  );
  return {
    ...base(p, big),
    grid: { left: 48, right: 12, top: 8, bottom: 64 },
    tooltip: {
      ...base(p).tooltip,
      formatter: (x: { value: [number, number, number] }) => `${WEEKDAYS[x.value[1]]}, ${hourLabel(HOURS[x.value[0]])}<br/><b>${count(x.value[2])}</b> orders`,
    },
    xAxis: { type: "category", data: HOURS.map(hourLabel), axisLabel: { ...axisLabel(p, big), interval: big ? 0 : 1 }, axisTick: { show: false }, axisLine: { show: false }, splitArea: { show: false } },
    yAxis: { type: "category", data: [...WEEKDAYS], inverse: true, axisLabel: axisLabel(p, big), axisTick: { show: false }, axisLine: { show: false } },
    visualMap: {
      min: 0,
      max: Math.max(1, max),
      orient: "horizontal",
      left: "center",
      bottom: 0,
      itemWidth: 12,
      itemHeight: 160,
      calculable: false,
      text: ["More orders", "Fewer"],
      textStyle: axisLabel(p, big),
      inRange: { color: p.ramp },
    },
    series: [{ type: "heatmap", data, itemStyle: { borderColor: p.surface, borderWidth: 2, borderRadius: 3 }, emphasis: { itemStyle: { borderColor: p.ink, borderWidth: 1 } } }],
  };
}

// --- Category split -----------------------------------------------------------

export function categorySlices(r: SalesReport) {
  const total = r.categories.reduce((s, c) => s + c.revenue, 0) || 1;
  const top = r.categories.slice(0, 5);
  const rest = r.categories.slice(5).reduce((s, c) => s + c.revenue, 0);
  const slices = top.map((c) => ({ name: c.name, value: c.revenue }));
  if (rest > 0) slices.push({ name: "Other", value: rest });
  return slices.map((s) => ({ ...s, share: (s.value / total) * 100 }));
}

export const sliceColour = (p: Palette, name: string, i: number) => (name === "Other" ? p.other : p.series[i]);

/** `legend: false` draws the donut alone (the screen renders its own legend beside it; the PDF keeps the canvas legend). */
export function categoryOption(p: Palette, r: SalesReport, big = false, legend = true): ChartOption {
  const slices = categorySlices(r);
  return {
    ...base(p, big),
    tooltip: { ...base(p).tooltip, trigger: "item", confine: true, formatter: (x: { name: string; value: number; percent: number }) => `<b>${x.name}</b><br/>${money(x.value)} · ${x.percent.toFixed(1)}%` },
    legend: {
      show: legend,
      orient: "vertical",
      right: 0,
      top: "middle",
      icon: "roundRect",
      itemWidth: 12,
      itemHeight: 12,
      textStyle: { ...axisLabel(p, big), color: p.ink },
      formatter: (name: string) => {
        const s = slices.find((x) => x.name === name);
        return s ? `${name}  ${s.share.toFixed(1)}%` : name;
      },
    },
    series: [
      {
        type: "pie",
        radius: legend ? ["52%", "80%"] : ["62%", "92%"],
        center: legend ? ["32%", "50%"] : ["50%", "50%"],
        avoidLabelOverlap: true,
        label: { show: false },
        itemStyle: { borderColor: p.surface, borderWidth: 2 },
        data: slices.map((s, i) => ({ name: s.name, value: s.value, itemStyle: { color: sliceColour(p, s.name, i) } })),
      },
    ],
  };
}

// --- Weekdays and tables ------------------------------------------------------

export function weekdayOption(p: Palette, r: SalesReport, big = false): ChartOption {
  const rows = r.weekdays.map((w) => ({ label: WEEKDAYS[w.weekday], avg: w.days ? w.orders / w.days : 0, days: w.days }));
  return {
    ...base(p, big),
    grid: { left: 44, right: 12, top: 16, bottom: 32 },
    tooltip: {
      ...base(p).tooltip,
      trigger: "item",
      formatter: (x: { dataIndex: number }) => `<b>${rows[x.dataIndex].label}</b><br/>${rows[x.dataIndex].avg.toFixed(0)} orders a day (${rows[x.dataIndex].days} days)`,
    },
    xAxis: { type: "category", data: rows.map((r) => r.label), axisLabel: axisLabel(p, big), axisTick: { show: false }, axisLine: { lineStyle: { color: p.grid } } },
    yAxis: valueAxis(p, big, false),
    series: [{ type: "bar", data: rows.map((r) => Math.round(r.avg)), barMaxWidth: 36, itemStyle: { color: p.primary, borderRadius: [4, 4, 0, 0] } }],
  };
}

export function tableSalesOption(p: Palette, r: SalesReport, big = false): ChartOption {
  return {
    ...base(p, big),
    grid: { left: 52, right: 12, top: 16, bottom: 32 },
    tooltip: {
      ...base(p).tooltip,
      trigger: "item",
      formatter: (x: { dataIndex: number }) => {
        const t = r.tables[x.dataIndex];
        return `<b>Table ${t.table}</b><br/>${money(t.sales)} · ${count(t.orders)} orders`;
      },
    },
    xAxis: { type: "category", data: r.tables.map((t) => String(t.table)), name: "Table", nameLocation: "middle", nameGap: 22, nameTextStyle: axisLabel(p, big), axisLabel: axisLabel(p, big), axisTick: { show: false }, axisLine: { lineStyle: { color: p.grid } } },
    yAxis: valueAxis(p, big, true),
    series: [{ type: "bar", data: r.tables.map((t) => t.sales), barMaxWidth: 28, itemStyle: { color: p.primary, borderRadius: [4, 4, 0, 0] } }],
  };
}

export function sessionOption(p: Palette, r: SalesReport, big = false): ChartOption {
  return {
    ...base(p, big),
    grid: { left: 44, right: 12, top: 16, bottom: 32 },
    tooltip: { ...base(p).tooltip, trigger: "item", formatter: (x: { dataIndex: number }) => `<b>Table ${r.tables[x.dataIndex].table}</b><br/>${Math.round(r.tables[x.dataIndex].avgSessionMin)} min on average` },
    xAxis: { type: "category", data: r.tables.map((t) => String(t.table)), name: "Table", nameLocation: "middle", nameGap: 22, nameTextStyle: axisLabel(p, big), axisLabel: axisLabel(p, big), axisTick: { show: false }, axisLine: { lineStyle: { color: p.grid } } },
    yAxis: { ...valueAxis(p, big, false), axisLabel: { ...axisLabel(p, big), formatter: (x: number) => `${x} min` } },
    series: [{ type: "bar", data: r.tables.map((t) => Math.round(t.avgSessionMin)), barMaxWidth: 28, itemStyle: { color: p.series[1], borderRadius: [4, 4, 0, 0] } }],
  };
}
