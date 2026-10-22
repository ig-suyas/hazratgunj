// Line icons for the owner navigation (24px grid, currentColor).
const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  className: "size-5 shrink-0",
};

export const NAV_ICONS = {
  overview: (
    <svg {...base}>
      <path d="M4 13h6V4H4zM14 20h6v-9h-6zM14 4h6v3h-6zM4 20h6v-3H4z" />
    </svg>
  ),
  orders: (
    <svg {...base}>
      <path d="M7 3h10l2 3v15H5V6z" />
      <path d="M9 10h6M9 14h6M9 18h3" />
    </svg>
  ),
  menu: (
    <svg {...base}>
      <path d="M6 3v8a3 3 0 0 0 3 3v7M9 3v6M12 3v8a3 3 0 0 1-3 3" />
      <path d="M17 21V3c2 1.5 3 4 3 7s-1 4-3 4" />
    </svg>
  ),
  approvals: (
    <svg {...base}>
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />
      <path d="m8 12 3 3 5-6" />
    </svg>
  ),
  discounts: (
    <svg {...base}>
      <path d="M3 12V4h8l10 10-8 8z" />
      <circle cx="7.5" cy="8.5" r="1.5" />
    </svg>
  ),
  staff: (
    <svg {...base}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .8 3.5 2.8 3.5 5.5" />
    </svg>
  ),
  blocked: (
    <svg {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6l12.8 12.8" />
    </svg>
  ),
  tables: (
    <svg {...base}>
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2" />
    </svg>
  ),
  reports: (
    <svg {...base}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  ),
  more: (
    <svg {...base}>
      <circle cx="5" cy="12" r="1.3" />
      <circle cx="12" cy="12" r="1.3" />
      <circle cx="19" cy="12" r="1.3" />
    </svg>
  ),
};
