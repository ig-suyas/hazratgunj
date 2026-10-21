# Design: final theme

Tokens: `src/app/globals.css` (the `@theme static` block and `:root`). Fonts: `src/design/fonts.ts`. Motion: `src/design/motion.ts`. Arch: `src/design/arch.ts`.
Live reference: `/styleguide` (development only; 404 in production).

Every colour, size, radius, shadow and duration in the components comes from these tokens. `src/design/tokens.ts` reads the same file at build time for the browser theme colour, the web manifest and the style guide, and the asset scripts in `scripts/` read it for the logo, favicon, door tint and share image. Change a value once in `globals.css`, then run `npm run build:brand`.

## History
1. **Neon (Phase 1):** built on the neon roundel sign, with magenta, red, cobalt and a dark landing page. The client found it loud.
2. **Warm light (Phase 1b):** cream, brass and bottle green, with a typographic wordmark and doors drawn in SVG.
3. **Final:** the same palette, now with the client's own logo, a pointed arch, a cream-and-sand checker, and entrance doors built from the client's photo of the real doors.

**Removed in the final pass:** the typographic wordmark and its build script, the SVG-drawn door leaves, the cusped arch and the black-and-mustard checker.

## Palette
Contrast is against cream (#F6F0E4) unless noted. Text tokens meet WCAG AA at body size; accent tokens are for lines and ornament only.

| Token | Hex | Use | Contrast |
|---|---|---|---|
| paper | #FBF8F2 | page background | — |
| cream | #F6F0E4 | menu background, walls | — |
| beige | #E8DCC6 | cards, sheets, placeholder tiles | — |
| sand | #D9C8A8 | dividers, borders, checker | — |
| brass | #B08D4F | hairlines, arch frame | 2.7:1, never text |
| mustard | #C9A24B | highlights | 2.1:1, never text |
| brass-ink | #7A5E2C | brass-coloured text | 5.3:1 (4.5:1 on beige) |
| charcoal | #2A2420 | body text, prices | 13.5:1 |
| muted | #5E5348 | secondary text | 6.6:1 (5.5:1 on beige) |
| bottle / bottle-deep | #2F3E34 / #243029 | primary buttons, key text / pressed | 10:1; paper on bottle 10.7:1 |
| teak | #86684D | door casing; the door photo is toned to it | 4.5:1 |
| glow | #FFE6BD | warm light behind the opening doors | — |
| shade, sheen | translucent | a door leaf turning away; light across the glass | — |
| scrim, veil | translucent | behind open sheets; text cards over photos | — |
| veg / nonveg | #1A7F37 / #8B3A0E | FSSAI food marks | 4.5:1 / 6.8:1 |

Logo colours (`--logo-dark`, `--logo-accent`, `--logo-light`) are bottle, brass and paper. The checker uses `--checker-a` (cream) and `--checker-b` (sand).

## Type
- **Cormorant Garamond** 500/600: headings and dish names in sheets.
- **Mukta** 400/600: body text, the menu and the interface. Prices and every other number use the `tabular` utility (Mukta, lining and tabular figures), because Cormorant's figures are old-style.
- **Tiro Devanagari Hindi**: Devanagari headings (प्रणाम गोरखपुर). It is not preloaded and loads only on the landing page.
- Scale: `micro`, `eyebrow`, `sm`, `base`, `item`, `lead`, `title`, `headline`, `display`. The larger sizes are fluid (`clamp`). `leading-deva` (1.45) leaves room above and below Devanagari.

## Logo and icons
- **Logo:** the client's `public/svg/logo.svg`, used as given. `scripts/build-logo.mjs` maps its black, red and white to the three logo tokens and writes `public/svg/logo-theme.svg` plus WebP sizes from 96 to 576 px. `<Logo>` (`src/components/logo.tsx`) serves the WebP with `srcset`, because the SVG is over 200 KB.
- **Favicon:** the letter ह in bottle green on a cream rounded square, drawn as an outline from Tiro Devanagari Hindi. It produces `icon.svg`, `favicon.ico` (16/32/48), `apple-icon.png` and the 192/512 manifest icons.
- **Share image:** 1200 × 630 JPEG with the logo, the name and address set in Cormorant, the hall seen through the arch, and a checker strip.

## Motifs, used lightly
- **Arch:** a simple pointed arch (`archPath()` in `src/design/arch.ts`). It appears as an image mask (`mask-arch`), as the thin brass outline on dish name cards (`public/brand/arch-outline.svg`), as the frame around the entrance doors, and as the window in the share image.
- **Checker:** `checker-rule`, a narrow cream-and-sand strip used as a border (the threshold under the entrance doors, and the footer), never as a fill. `checker-field` is the same pattern for small areas, available but currently unused.
- **Hairlines:** a 1px brass `hairline`, soft warm shadows and generous whitespace.

## Entrance (landing hero)
- **Doors:** two glass-paned teak doors from the client's entrance photo. `scripts/build-door.mjs` straightens the left leaf, removes blue glare, tones the wood to teak and makes the ten glass panes see-through. The right leaf is the left one mirrored, since a podium covers part of the real right leaf. No road or street-view photo is used.
- **Scroll sequence** (fractions of the scroll in `motion.ts`):
  1. The doors swing inward to 100°, with a shade on the turning edge and light spilling out.
  2. "Pranaam, Gorakhpur" appears.
  3. The view moves through the doorway into the hall, and the cuisines line appears.
  4. The arch photo settles, then the closing card shows the logo, the hours and "View Menu".
- **Static fallback:** a single screen with the doors closed and "View Menu". It is used for reduced motion, data saver, 2G, and devices with under 4 cores or 4 GB of memory. GSAP and Lenis are loaded only after the page is idle, and never on `/menu`.

## Menu
Cream background, a sticky header with the logo, table number and category tabs (bottle-green active pill), and dish rows with a 4:5 thumbnail. Sheets (dish, cart, order) are native `<dialog>` elements on beige with a scrim behind.

## Dish images
Supplied by the client at the end of the project. The file names are in `docs/photos-needed.txt`, and `npm run build:photos` processes them. Until a photo arrives, each dish shows a name card: a beige tile with a brass arch outline and the dish name.
