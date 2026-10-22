"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useLive, useNow } from "@/components/app/hooks";
import { Card, DemoDataLabel, ErrorState, Loading, PageHeader } from "@/components/app/ui";
import { basePath } from "@/config/demo";
import { getOverview } from "@/lib/api";
import { count, dayLabel, money } from "@/lib/fmt";
import { OrderList } from "./order-list";

function Kpi({ label, value, hint, href }: { label: string; value: ReactNode; hint?: ReactNode; href?: string }) {
  const body = (
    <>
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="mt-1 text-[1.75rem] leading-tight font-semibold tabular">{value}</p>
      {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="block rounded-card border border-sand bg-paper p-4 hover:border-bottle">
      {body}
    </Link>
  ) : (
    <div className="rounded-card border border-sand bg-paper p-4">{body}</div>
  );
}

/** Today at a glance, refreshed live as orders, blocks and suggestions change. */
export function Overview() {
  // Re-read every minute too, so today's totals move with the clock.
  const minute = useNow(60_000);
  const data = useLive(getOverview, `overview:${Math.floor(minute / 60_000)}`, ["orders", "sessions", "blocks", "suggestions"]);
  const o = data.data;
  return (
    <>
      <PageHeader title="Today" description={o ? dayLabel(o.today) : " "} actions={<DemoDataLabel />} />
      {data.error && !o ? (
        <ErrorState error={data.error} onRetry={data.reload} />
      ) : !o ? (
        <Loading rows={4} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Kpi label="Sales" value={money(o.sales)} hint="Served orders" href={`${basePath}/owner/reports`} />
            <Kpi label="Orders" value={count(o.orders)} hint={`${o.openOrders} open now`} href={`${basePath}/owner/orders`} />
            <Kpi label="Active tables" value={count(o.activeTables)} hint="Seated right now" />
            <Kpi label="Average bill" value={money(Math.round(o.avgBill))} />
            <Kpi label="Pending approvals" value={count(o.pendingApprovals)} hint="Suggested dishes" href={`${basePath}/owner/approvals`} />
            <Kpi label="Blocked guests" value={count(o.blockedGuests)} hint="Active blocks" href={`${basePath}/owner/blocked`} />
          </div>
          <Card className="mt-6 p-4 sm:p-5">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold">Latest orders</h2>
              <Link href={`${basePath}/owner/orders`} className="inline-flex min-h-9 items-center text-sm font-semibold text-bottle">
                All orders
              </Link>
            </div>
            <OrderList orders={o.latest} empty="No orders yet today." />
          </Card>
        </>
      )}
    </>
  );
}
