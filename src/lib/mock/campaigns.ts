import type { Discount } from "../pricing";

// MOCK, replace with real backend. Discount campaigns of the demo year. The
// historical dataset (dataset.ts) priced its orders with these, and the demo
// store starts with the same list, so the Discounts page explains the
// discounts seen in the reports. Editing a discount later changes only new
// orders, as it would with a real backend.
export const CAMPAIGNS: Discount[] = [
  {
    id: "dc-diwali-25",
    name: "Diwali sweets",
    kind: "percent",
    value: 15,
    target: { type: "categories", ids: ["desserts"] },
    startsOn: "2025-10-15",
    endsOn: "2025-11-05",
    enabled: true,
    createdAt: Date.parse("2025-10-10T06:00:00Z"),
  },
  {
    id: "dc-winter-soups",
    name: "Winter soups",
    kind: "flat",
    value: 20,
    target: { type: "categories", ids: ["soups"] },
    startsOn: "2025-12-01",
    endsOn: "2026-01-31",
    enabled: true,
    createdAt: Date.parse("2025-11-28T06:00:00Z"),
  },
  {
    id: "dc-summer-coolers",
    name: "Summer coolers",
    kind: "percent",
    value: 10,
    target: { type: "categories", ids: ["refreshers", "creamery"] },
    startsOn: "2026-04-01",
    endsOn: "2026-06-30",
    enabled: true,
    createdAt: Date.parse("2026-03-28T06:00:00Z"),
  },
  {
    id: "dc-monsoon-chinese",
    name: "Monsoon Chinese",
    kind: "percent",
    value: 10,
    target: { type: "categories", ids: ["chinese", "noodles"] },
    startsOn: "2026-07-15",
    endsOn: "2026-08-31",
    enabled: true,
    createdAt: Date.parse("2026-07-12T06:00:00Z"),
  },
  {
    id: "dc-festive-26",
    name: "Festive desserts",
    kind: "percent",
    value: 10,
    target: { type: "categories", ids: ["desserts"] },
    startsOn: "2026-10-15",
    endsOn: "2026-11-10",
    enabled: true,
    createdAt: Date.parse("2026-10-12T06:00:00Z"),
  },
];
