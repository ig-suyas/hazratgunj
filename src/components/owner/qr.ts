// QR images for table links, drawn in the browser. Loaded only on the Tables and QR page.
import QRCode from "qrcode";

export const tableUrl = (origin: string, token: string) => `${origin}/menu?t=${encodeURIComponent(token)}`;

export function qrDataUrl(text: string, width = 480) {
  return QRCode.toDataURL(text, { margin: 1, width, errorCorrectionLevel: "M", color: { dark: "#2a2420", light: "#ffffff" } });
}
