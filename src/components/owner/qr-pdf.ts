// "Download all QR codes as PDF": one card per table, six to an A4 page. Loaded on click.
import { jsPDF } from "jspdf";
import type { TableInfo } from "@/lib/api";
import { A4, INK, addFooters, applyGeist, logoPng, restaurantName, restaurantPlace } from "@/components/reports/pdf-kit";
import { qrDataUrl, tableUrl } from "./qr";

export async function downloadQrPdf(tables: TableInfo[], origin: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  await applyGeist(doc);
  const logo = await logoPng();
  const cols = 2;
  const rows = 3;
  const gap = 8;
  const cw = (A4.w - A4.margin * 2 - gap) / cols;
  const ch = (A4.h - A4.margin * 2 - 16 - gap * (rows - 1)) / rows;

  for (let i = 0; i < tables.length; i++) {
    const t = tables[i];
    const slot = i % (cols * rows);
    if (i > 0 && slot === 0) doc.addPage();
    const x = A4.margin + (slot % cols) * (cw + gap);
    const y = A4.margin + Math.floor(slot / cols) * (ch + gap);
    doc.setDrawColor(...INK.brass);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cw, ch, 3, 3);
    doc.addImage(logo, "PNG", x + cw / 2 - 7, y + 4, 14, 14);
    doc.setTextColor(...INK.charcoal);
    doc.setFontSize(9);
    doc.text(restaurantName, x + cw / 2, y + 22, { align: "center" });
    doc.setFontSize(20);
    doc.setTextColor(...INK.bottle);
    doc.text(`Table ${t.number}`, x + cw / 2, y + 31, { align: "center" });
    const url = tableUrl(origin, t.token);
    const size = Math.min(cw - 24, ch - 52);
    doc.addImage(await qrDataUrl(url, 600), "PNG", x + (cw - size) / 2, y + 35, size, size);
    doc.setFontSize(9);
    doc.setTextColor(...INK.charcoal);
    doc.text("Scan to see the menu and order", x + cw / 2, y + 39 + size, { align: "center" });
    doc.setFontSize(6.5);
    doc.setTextColor(...INK.muted);
    doc.text(url, x + cw / 2, y + 44 + size, { align: "center", maxWidth: cw - 8 });
  }
  addFooters(doc, `${restaurantName}, ${restaurantPlace} · Table QR codes`);
  doc.save("hazratgunj-table-qr-codes.pdf");
}
