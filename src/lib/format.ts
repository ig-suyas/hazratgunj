import { restaurant, type Day } from "@/data/restaurant";

const DAY_NAMES: Record<Day, string> = { Mo: "Mon", Tu: "Tue", We: "Wed", Th: "Thu", Fr: "Fri", Sa: "Sat", Su: "Sun" };

/** "23:00" → "11 pm", "11:30" → "11:30 am". */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 && h < 24 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")} ${suffix}` : `${h12} ${suffix}`;
}

/** Opening hours as display rows, e.g. [{ days: "Every day", time: "11 am – 11 pm" }]. */
export function openingHoursRows() {
  return restaurant.openingHours.map((row) => ({
    days: row.days.length === 7 ? "Every day" : row.days.map((d) => DAY_NAMES[d]).join(", "),
    time: `${formatTime(row.opens)} – ${formatTime(row.closes)}`,
  }));
}

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** 1049 → "₹1,049". */
export function formatPrice(amount: number): string {
  return `₹${inr.format(amount)}`;
}
