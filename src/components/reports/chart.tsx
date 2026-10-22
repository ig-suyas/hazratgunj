"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/app/ui";
import { echarts, type ChartOption, type ECharts } from "./echarts";

/** An ECharts canvas that follows its container's size. */
export function EChart({
  option,
  height,
  label,
  onReady,
}: {
  option: ChartOption;
  height: number;
  label: string;
  onReady?: (chart: ECharts) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<ECharts | null>(null);
  const ready = useRef(onReady);
  useEffect(() => {
    ready.current = onReady;
  });

  useEffect(() => {
    const el = ref.current!;
    const c = echarts.init(el, undefined, { renderer: "canvas" });
    chart.current = c;
    const ro = new ResizeObserver(() => c.resize());
    ro.observe(el);
    ready.current?.(c);
    return () => {
      ro.disconnect();
      c.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    chart.current?.setOption({ ...option, ...(reduced ? { animation: false } : {}) }, { notMerge: true, lazyUpdate: true });
  }, [option]);

  return <div ref={ref} role="img" aria-label={label} style={{ height }} className="w-full" />;
}

/** A titled chart with a "Show table" switch, so every chart can be read as numbers. */
export function ChartCard({
  title,
  subtitle,
  controls,
  table,
  children,
  className = "",
}: {
  title: string;
  subtitle?: ReactNode;
  controls?: ReactNode;
  table?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  const [showTable, setShowTable] = useState(false);
  return (
    <section aria-labelledby={id} className={`min-w-0 rounded-card border border-sand bg-paper p-4 sm:p-5 ${className}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 id={id} className="text-lg font-semibold">
            {title}
          </h2>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {controls}
          {table && (
            <Button size="sm" variant="ghost" className="border-sand!" aria-pressed={showTable} onClick={() => setShowTable((s) => !s)}>
              {showTable ? "Show chart" : "Show table"}
            </Button>
          )}
        </div>
      </div>
      {showTable && table ? <div className="max-h-[26rem] overflow-auto">{table}</div> : children}
    </section>
  );
}

/** Plain data table used for every chart's table view. */
export function DataTable({ head, rows, numeric = [] }: { head: string[]; rows: (string | number)[][]; numeric?: number[] }) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead className="sticky top-0 bg-paper">
        <tr className="border-b border-sand text-left">
          {head.map((h, i) => (
            <th key={h} scope="col" className={`py-2 pr-3 font-semibold ${numeric.includes(i) ? "text-right" : ""}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-sand/60">
            {r.map((c, j) => (
              <td key={j} className={`py-1.5 pr-3 ${numeric.includes(j) ? "text-right tabular" : ""}`}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
