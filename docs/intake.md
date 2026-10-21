# Phase 0 — Intake record (2026-10-21)

## Branch
The shared link resolves to **Hazratgunj Restaurant and Banquet Hall | Park Road** (Google kgmid `/g/11sdqc_bhn`, Maps CID `13072315978512044501`).
A second branch exists: the in-venue standee lists **Park Road (Civil Lines)** and **Airport Road (Mohaddipur)**. This site covers Park Road only.

## Verified facts → `src/data/restaurant.ts`
Name, address, phone, hours, coordinates from the Google listing; operator and section names from signage. Unverified items are `missing(...)` placeholders (`listMissing()` prints them).

Conflict: Google says 11 am–11 pm daily; Zomato/District say 11:30 am–12 midnight.

## Client photos → `assets/source/photos/`
| File | Shows |
|---|---|
| entrance.png | Double doors, red Devanagari "हज़रतगंज", small roundel, coloured glass transoms (green/yellow/red), checkerboard beyond |
| roundel-sign.png | Illuminated roundel on navy fluted wall (basis for `public/brand/roundel.svg`) |
| arch.png | Scalloped pointed (Lucknowi) arch, mustard walls, "BALCONY" neon in the hall beyond |
| main-hall.png | Main hall: bottle-green tub chairs, brass-rod mirror screens, rattan pendants, checkerboard aisle, backlit bar shelves |
| lobby-pranam.png | Lobby: blue/amber neon "प्रणाम गोरखपुर", maroon sofa, chandelier, jharokha niche wall |
| pavilion.png | "Pavilion": coral quilted chairs, banquette with cushions, framed monument photos, wood floor |
| box-office.png | "Box Office" red neon inside arched floral-wallpaper alcoves, copper arch screens |
| garden.png | "Garden": faux palms on checkerboard, green/cream quilted chairs, Box Office alcove at left |

## Client videos (frames extracted with ffmpeg, not kept)
- **IMG_0982** (6 s, landscape): red neon "♥ हज़रतगंज" on a wood-slat wall with a digital standee (both branches), then a pan across the window-lit main hall (BALCONY neon) into the Garden section.
- **IMG_0990** (8 s, portrait): lobby with "प्रणाम गोरखपुर" neon and maroon sofa → jharokha niche wall with miniature minarets → scalloped arch into the hall → host desk with maroon slats and a TV.

## Google listing photos
Collections: All, Latest, Menu, Food & drink, Vibe, Pomegranate, Iced coffee, Mojito, By owner, Videos.
- **By owner (8):** night facade ("A unit of Hazrat Hospitality and Services", rooftop banquet sign) and Lucknow monument graphics (Rumi Darwaza, Bara Imambara) stamped with the roundel, plus a "हमारा वाला MENU" cover. No owner food photos.
- **Menu (4):** customer photos of the printed menu, ~3 years old. Not used as a price source.
- **Food & drink / Vibe:** customer uploads; interiors match the client's photos. Dish-level matching happens in Phase 3.

## Typography notes
- Roundel Devanagari ≈ wide geometric bold (Poppins 700 is the closest Google font).
- Entrance letters and the "♥ हज़रतगंज" neon wall use a calligraphic Devanagari (Yatra One family). Candidate for the site wordmark (Phase 1).
