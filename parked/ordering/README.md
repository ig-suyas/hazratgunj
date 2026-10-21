# Parked: table ordering

Ordering was switched off on 2026-10-22, and `/menu` is now a read-only list. This folder is the ordering version of the menu, exactly as it was. The cart, quantity steppers, kitchen note, "Place order" and the order status screen are all here.

It is not built, linted or deployed: `parked/` is excluded in `tsconfig.json`, `eslint.config.mjs` and `.vercelignore`.

Still in place in `src/` and used by this code:
- `src/lib/cart.ts`: cart reducer and price rules.
- `src/lib/data.ts`: `placeOrder` (simulated; replace its body to reach a real kitchen system).
- `src/components/menu/sheet.tsx`, `category-nav.tsx`, `dish-thumb.tsx`, `diet-marks.tsx`, `icons.tsx` and `dish-photo.ts`.
- `src/app/menu/menu.css`: the sheet styles.

## To bring ordering back
1. Copy every file in `parked/ordering/components/menu/` into `src/components/menu/`, replacing `menu-app.tsx`, `dish-row.tsx`, `dish-sheet.tsx` and `hooks.ts`.
2. Run `npm run build` and test `/menu?table=7`.
