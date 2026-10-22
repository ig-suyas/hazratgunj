"use client";

import { useEffect, useState } from "react";
import { useLive } from "@/components/app/hooks";
import { Button, ErrorState, Loading, PageHeader, toast } from "@/components/app/ui";
import { listTables, type TableInfo } from "@/lib/api";

/** Every table's QR link and code. The codes are drawn in the browser; the PDF is made on click. */
export function TablesQr() {
  const tables = useLive(listTables, "tables", ["tables"]);
  const [busy, setBusy] = useState(false);
  const origin = window.location.origin;

  const downloadAll = async () => {
    if (!tables.data) return;
    setBusy(true);
    try {
      const { downloadQrPdf } = await import("./qr-pdf");
      await downloadQrPdf(tables.data, origin);
      toast("QR codes PDF downloaded");
    } catch {
      toast("The PDF could not be made. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Tables and QR"
        description="Each table has its own link. The table number comes only from the code, so guests never type it."
        actions={
          <Button variant="primary" busy={busy} onClick={downloadAll} disabled={!tables.data}>
            Download all QR codes as PDF
          </Button>
        }
      />
      {tables.error && !tables.data ? (
        <ErrorState error={tables.error} onRetry={tables.reload} />
      ) : !tables.data ? (
        <Loading rows={4} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tables.data.map((t) => (
            <TableCard key={t.number} table={t} origin={origin} />
          ))}
        </ul>
      )}
    </>
  );
}

function TableCard({ table, origin }: { table: TableInfo; origin: string }) {
  const [qr, setQr] = useState<string | null>(null);
  const url = `${origin}/menu?t=${encodeURIComponent(table.token)}`; // same as tableUrl() in qr.ts
  useEffect(() => {
    let alive = true;
    import("./qr").then((m) => m.qrDataUrl(url, 320)).then((d) => alive && setQr(d));
    return () => {
      alive = false;
    };
  }, [url]);
  return (
    <li className="flex min-w-0 gap-4 rounded-card border border-sand bg-paper p-4">
      <div className="grid size-24 shrink-0 place-items-center rounded-thumb border border-sand bg-white sm:size-32">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element -- generated data URL
          <img src={qr} alt={`QR code for table ${table.number}`} width={120} height={120} className="size-22 sm:size-30" />
        ) : (
          <span className="app-skeleton size-20 rounded-xs sm:size-28" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-muted">Table</span>
          <span className="font-display text-[2rem] leading-none font-semibold tabular">{table.number}</span>
        </p>
        <p className="mt-1 text-sm text-muted">
          Token <span className="font-semibold text-charcoal tabular">{table.token}</span>
        </p>
        <p className="mt-1 truncate text-sm text-muted" title={url}>
          {url}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                toast(`Link for table ${table.number} copied`);
              } catch {
                toast("Copy is not allowed here. Select the link instead.");
              }
            }}
          >
            Copy link
          </Button>
          {qr && (
            <a href={qr} download={`table-${table.number}-qr.png`} className="inline-flex h-9 items-center rounded-pill px-3 text-sm font-semibold text-bottle">
              Save image
            </a>
          )}
        </div>
      </div>
    </li>
  );
}
