# Phase 2 — Menu transcription notes (2026-10-21)

Source: the 19 photos in `assets/source/menu`. The table menu is pages 5–11, 14–16 and 18. Pages 1–4, 12–13, 17 and 19 are the banquet menu and are not part of the table ordering.
Data: `src/data/menu.json` (154 items, 18 sections). Run `npm run check:menu` to validate it.

## How it was transcribed
- **Prices are exactly as printed.** Every price on pages 8, 11, 16 and 18 was checked a second time on a zoomed crop.
- **Names** are converted from ALL CAPS to Title Case. Spelling is as printed, except for the corrections below.
- **Descriptions marked `menu`** are the printed text, with only sentence-case capitals and the typo fixes below. Descriptions marked `options` list the printed choices. Descriptions marked `written` are mine and need the owner's OK (full list at the end).
- **Grouping:** where the menu prints one heading with a list of choices at one price (e.g. "Veg Momos: Steamed, Kurkure, Tandoori"), it's one dish with a required choice. "B/L" lines became a Boneless variant of the same dish.
- **Pieces, portions and prep times** come from the page footers and are stored on each section.
- **Taxes:** prices exclude applicable taxes, as printed. The cart will say so and won't calculate GST.

## Spelling corrections (shown corrected, printed spelling in brackets)
- Raunak-e-Paneer Tikka (PANEEER), Lehsooni Paneer Tikka (PANEEER)
- Wok-Tossed Potatoes (POTATOS)
- Thums Up (THUMPS UP)
- Schezwan Noodles description: "tossed" (rossed)
- Cream of Tomato description: "tomatoes" (tomatos)
- Section "Pasta" (PASTA'S)
- Gajar Da Halwa: the word "Seasonal" from the name became a "seasonal" tag

## Questions for the owner
1. **Gost Galafi Seekh Kebab:** kept as printed. Should it be "Gosht Gilafi Seekh Kebab"?
2. **Gosht Laal Maas** has the same description as Rogan Josh ("Kashmiri red gravy"). Laal Maas is usually Rajasthani. What's the correct description?
3. **Tandoori Paneer Tikka Masala and Paneer Kaleji** sit between the "New Arrivals" and "Signatures" brackets on page 18. I filed them under Signatures, matching the layout of page 16. Is that right?
4. **Murg Teen Tigada:** I described it as "a trio of chicken tikkas". What is it actually?
5. **Lucknowi Kebab Platter:** I assumed non-veg, since the platters section has no veg mark.
6. **Caesar Salad** is marked veg; the salads header shows both marks. Is the dressing egg/anchovy-free?
7. **Sizzling Brownie:** is it eggless? It's marked veg.
8. **Cold Coffee ice-cream add-on:** free, or extra? It's currently free and optional.
9. **Pasta "Double Cheese":** also +₹59, or more?
10. **Soft drinks, diet colas and water are "@ MRP":** they're shown but can't be ordered. Send the MRPs if they should be orderable.
11. **Google lists dishes that aren't in these photos:** Palak Paneer + 2 Missi Roti ₹349, Paneer Pandara Wala + 2 Baby Laccha Paratha ₹399, Amritsari Fried Fish ₹449, Brownie Sundae ₹229, Butter Naan & Chicken. Is there a combo or lunch page?
12. **Hara Bhara Kebab** is ₹379 on the menu and ₹349 on Google. The menu price is used.

## Matches with Google's menu highlights (sanity check)
Drums of Heaven 529, Honey Chilli Potato 349, Crispy Baby Corn / Chilli Paneer 419, Cheese Cigar Rolls 399, Hazratgunj Subz Biryani 449, Egg Biryani 469, Paneer Lababdaar 599, Kulche 149, Roomali Roti 89, Gulab Jamun with Rabri 199 and Signature Shahi Tukda 229 all match.

## Descriptions written by us (need owner review)
| Section | Dish | ₹ | Our description |
|---|---|---|---|
| Tandoor | Raunak-e-Paneer Tikka | 419 | Paneer tikka in the house marinade, cooked in the tandoor. |
| Tandoor | Kumbh Ke Galawat | 379 | Soft mushroom kebabs in the galawat style. |
| Tandoor | Paneer Tikka | 419 | Marinated paneer cubes cooked in the tandoor. |
| Tandoor | Dahi Cheesy Kebab | 379 | Kebabs of hung curd and cheese. |
| Tandoor | Hara Bhara Kebab | 379 | Green kebabs of spinach and peas. |
| Tandoor | Kesariya Paneer Tikka | 419 | Paneer tikka in a saffron marinade. |
| Tandoor | Lehsooni Paneer Tikka | 419 | Paneer tikka in a garlic marinade. |
| Tandoor | Zaffrani Tangri | 549 | Chicken drumsticks in a saffron marinade, cooked in the tandoor. |
| Tandoor | Gost Galafi Seekh Kebab | 669 | Minced mutton seekh kebabs from the tandoor. |
| Tandoor | Sarson Wali Fish Tikka | 599 | Fish tikka in a mustard marinade. |
| Tandoor | Cheesy Murg Seekh Kebab | 509 | Minced chicken seekh kebabs with cheese. |
| Tandoor | Mutton Galawat | 689 | Soft minced mutton kebabs in the Lucknowi galawat style. |
| Tandoor | Murg Teen Tigada | 649 | A trio of chicken tikkas from the tandoor. |
| Tandoor | Tandoori Jhinga | 829 | Marinated prawns cooked in the tandoor. |
| Tandoor | Bhatti Da Murg | 499 | Punjabi-style chicken roasted in the tandoor. |
| Tandoor | Murg Angara | 499 | Smoky, fiery chicken tikka. |
| Tandoor | Banjara Murg Tikka | 519 | Chicken tikka in a rustic banjara spice marinade. |
| Tandoor | Hazratgunj Veg Tandoor Platter | 1049 | An assortment of vegetarian kebabs and tikkas, 12 pieces. |
| Tandoor | Hazratgunj Non Veg Kebab Platter | 1249 | An assortment of non-vegetarian kebabs, 12 pieces. |
| Tandoor | Murg Tikka Platter | 1249 | An assortment of chicken tikkas, 12 pieces. |
| Tandoor | Lucknowi Kebab Platter | 1249 | An assortment of Lucknowi kebabs, 12 pieces. |
| Rice & Biryani | Hazratgunj Subz Biryani | 449 | Basmati rice layered with spiced vegetables. |
| Rice & Biryani | Hazratgunj Murg Dum Biryani | 499 | Chicken and basmati rice slow-cooked on dum. |
| Rice & Biryani | Murg Tikka Biryani | 549 | Biryani made with chicken tikka. |
| Rice & Biryani | Gosht Biryani | 669 | Mutton biryani with basmati rice. |
| Rice & Biryani | Egg Biryani | 469 | Biryani with boiled eggs. |
| Breads | Missi Roti | 129 | Spiced gram-flour flatbread. |
| Breads | Cheese Garlic Naan | 149 | Naan with cheese and garlic. |
| Sides | Masala Pappad | 129 | Roasted papad topped with onion, tomato and spices. |
| Sides | Masala Peanut | 149 | Peanuts tossed with onion, tomato, chilli and lemon. |
| Sides | Cucumber Raita | 149 | Chilled yoghurt with cucumber. |
| Sides | Boondi Raita | 149 | Chilled yoghurt with boondi. |
| Sides | Mix Veg Raita | 169 | Chilled yoghurt with mixed vegetables. |
| Sides | Pineapple Raita | 179 | Chilled yoghurt with pineapple. |
| Sides | Fruit Raita | 199 | Chilled yoghurt with mixed fruit. |
| Sides | French Fries | 199 | Salted potato fries. |
| Sides | Peri Peri Fries | 209 | Potato fries tossed in peri peri seasoning. |
| Shakes & Chai | Mineral Water | MRP | Packaged drinking water. |
