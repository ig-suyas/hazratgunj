// Shared PDF helpers (A4, made in the browser). Loaded only when a PDF is requested.
import type { jsPDF } from "jspdf";
import { restaurant } from "@/data/restaurant";
import { formatDateTime } from "@/lib/fmt";

export const A4 = { w: 210, h: 297, margin: 14 };

/** Theme colours as RGB, from the tokens in globals.css. */
export const INK = {
  charcoal: [42, 36, 32],
  muted: [94, 83, 72],
  bottle: [47, 62, 52],
  brass: [176, 141, 79],
  brassInk: [122, 94, 44],
  sand: [217, 200, 168],
  cream: [246, 240, 228],
  beige: [232, 220, 198],
} as const satisfies Record<string, readonly [number, number, number]>;

let fontData: Promise<string> | null = null;

/** Geist Regular (SIL Open Font License): the PDF fonts need a ₹ sign, which the built-in ones lack. */
export async function applyGeist(doc: jsPDF) {
  fontData ??= fetch("/fonts/geist-regular.ttf")
    .then((r) => r.arrayBuffer())
    .then((buf) => {
      let s = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return btoa(s);
    });
  doc.addFileToVFS("geist.ttf", await fontData);
  doc.addFont("geist.ttf", "Geist", "normal");
  doc.setFont("Geist", "normal");
}

let logoData: Promise<string> | null = null;

/** The client's logo in its original colours, as a PNG for the PDF. */
export function logoPng() {
  logoData ??= new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext("2d")!.drawImage(img, 0, 0);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = "/logo/logo-288.webp";
  });
  return logoData;
}

export const restaurantName = restaurant.name;
export const restaurantPlace = `${restaurant.branch}, ${restaurant.address.city}`;

/** Footer on every page: generated date and "Page n of N". Call once the document is complete. */
export function addFooters(doc: jsPDF, label: string) {
  const pages = doc.getNumberOfPages();
  const generated = `Generated ${formatDateTime(Date.now())} IST`;
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...INK.brass);
    doc.setLineWidth(0.2);
    doc.line(A4.margin, A4.h - 14, A4.w - A4.margin, A4.h - 14);
    doc.setFontSize(8);
    doc.setTextColor(...INK.muted);
    doc.text(`${label} · ${generated}`, A4.margin, A4.h - 9);
    doc.text(`Page ${i} of ${pages}`, A4.w - A4.margin, A4.h - 9, { align: "right" });
  }
}

export function save(doc: jsPDF, filename: string) {
  doc.save(filename);
}
