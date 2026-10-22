// Converts src/data/reviews.txt (Google reviews copied by the owner's team)
// into src/data/reviews.json for the landing page's reviews section.
//
//   npm run build:reviews
//
// Wording is never changed. The only edits: emoji are removed (the site uses
// none) and the spaces they leave are tidied. Long reviews are cut at a
// sentence end for a card; the page adds "…" and a link to Google.
import { readFileSync, writeFileSync } from "node:fs";

const SRC = "src/data/reviews.txt";
const OUT = "src/data/reviews.json";

/**
 * The five static cards, in display order: three five-star, two four-star (see
 * the reasons). The first card is the one phones see first, so it must read
 * well in full: Shaba's review is cut to its first sentence on narrow screens.
 */
const FEATURED = [
  ["Shivali Singh", "Recent; about food and service in the guest's own words."],
  ["vaibhav kasera", "Four stars; specific about two dishes, the ambience and the service."],
  ["SHABA JAMAL", "Names dishes and a chef; recent; natural voice."],
  ["pratima ya", "Four stars; warm, with a mild, honest point about price."],
  ["Abhishek Kumar Singh", "A family birthday: an occasion the others do not cover."],
];

/** Reviews left out of the page entirely, with the reason. */
const SKIP = {
  "Shoaib Rafi":
    "Mixed review (food and service 3/5) that also invites the restaurant to contact the reviewer; any sentence-end cut would show only its praise, which would misrepresent it.",
};

const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}‍️⃣]/gu;
const PHONE = /(?:\+?\d[\d\s-]{8,}\d)/;
const EMAIL = /\S+@\S+\.\S+/;

const tidy = (text) =>
  text
    .replace(EMOJI, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]{2,}/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

/** The longest start of the text that ends at a sentence end (or a line break) and fits `max` characters. */
function cut(text, max) {
  if (text.length <= max) return { text, cut: false };
  const ends = [];
  const re = /[.!?]+(?=\s|$)|\n/g;
  let m;
  while ((m = re.exec(text))) ends.push(m[0] === "\n" ? m.index : m.index + m[0].length);
  const fits = ends.filter((i) => i <= max);
  const at = fits.length ? fits.at(-1) : ends[0] ?? text.length;
  const out = text.slice(0, at).trimEnd();
  return { text: out, cut: out.length < text.length };
}

const titleCase = (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

/** "Abhishek Kumar Singh" → "Abhishek S."; one word stays as it is. */
function displayName(full) {
  const words = full.trim().split(/\s+/);
  const first = titleCase(words[0]);
  return words.length > 1 ? `${first} ${words.at(-1).charAt(0).toUpperCase()}.` : first;
}
const initials = (full) => {
  const words = full.trim().split(/\s+/);
  return (words[0][0] + (words.length > 1 ? words.at(-1)[0] : "")).toUpperCase();
};

const rows = readFileSync(SRC, "utf8")
  .split(/\r?\n/)
  .filter((l) => l.trim() && !l.trim().startsWith("#"));

const reviews = [];
const skipped = [];
for (const [i, line] of rows.entries()) {
  const parts = line.split("|");
  if (parts.length < 4) {
    skipped.push({ name: parts[0]?.trim() ?? `line ${i + 1}`, reason: "Not in the Name | Stars | Date | Text format." });
    continue;
  }
  const [name, stars, date] = parts.slice(0, 3).map((s) => s.trim());
  const raw = parts.slice(3).join("|").trim().replaceAll("\\n", "\n");
  const text = tidy(raw);
  const rating = Number(stars);
  let reason = SKIP[name];
  if (!reason && !text) reason = "Empty review.";
  if (!reason && (PHONE.test(text) || EMAIL.test(text))) reason = "Contains a phone number or email.";
  if (!reason && !(rating >= 1 && rating <= 5 && Number.isInteger(rating))) reason = "Stars must be a whole number from 1 to 5.";
  if (reason) {
    skipped.push({ name, reason });
    continue;
  }
  const featured = FEATURED.findIndex(([n]) => n === name);
  const card = cut(text, 170); // front card, 1280px and up
  const short = cut(text, 120); // front card, narrower screens
  const wall = cut(text, 130);
  reviews.push({
    id: `r${reviews.length + 1}`,
    name: displayName(name),
    initials: initials(name),
    stars: rating,
    date,
    text,
    excerpt: card.text,
    excerptCut: card.cut,
    excerptShort: short.text,
    excerptShortCut: short.cut,
    wallText: wall.text,
    wallCut: wall.cut,
    featured: featured === -1 ? null : featured,
  });
}

const missing = FEATURED.filter(([n]) => !rows.some((l) => l.split("|")[0].trim() === n));
if (missing.length) console.warn("Featured reviews not found:", missing.map(([n]) => n).join(", "));

writeFileSync(
  OUT,
  `${JSON.stringify(
    {
      source: "Google reviews, copied by the restaurant from its Google listing (src/data/reviews.txt). Emoji removed; wording unchanged.",
      featuredReasons: Object.fromEntries(FEATURED.map(([n, why]) => [displayName(n), why])),
      reviews,
      skipped,
    },
    null,
    2,
  )}\n`,
);
console.log(`${reviews.length} reviews written to ${OUT}, ${skipped.length} skipped.`);
for (const s of skipped) console.log(`  skipped ${s.name}: ${s.reason}`);
