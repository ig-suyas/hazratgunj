"use client";

import dynamic from "next/dynamic";
import { Loading, PageHeader } from "@/components/app/ui";

// The sales dashboard, its chart library and its data generator load only here.
const ReportsPage = dynamic(() => import("./reports-page"), {
  ssr: false,
  loading: () => (
    <>
      <PageHeader title="Reports" />
      <Loading rows={5} label="Loading reports" />
    </>
  ),
});

export function ReportsLoader() {
  return <ReportsPage />;
}
