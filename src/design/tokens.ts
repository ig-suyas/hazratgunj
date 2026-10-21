import { readFileSync } from "node:fs";
import { join } from "node:path";

// Reads design tokens from src/app/globals.css (the single source) for the few
// places that need a value outside CSS: <meta name="theme-color">, the style
// guide and generated images. Runs at build time only.
let css: string | undefined;
const source = () => (css ??= readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8"));

/** Value of a custom property, e.g. token("color-cream") → "#f6f0e4". */
export function token(name: string): string {
  const m = source().match(new RegExp(`--${name}:\s*([^;]+);`));
  if (!m) throw new Error(`Token --${name} not found in globals.css`);
  return m[1].trim();
}

/** Every --color-* token with its value and trailing comment, in file order. */
export function colorTokens() {
  return [...source().matchAll(/--color-([a-z-]+):\s*([^;]+);\s*(?:\/\*\s*(.*?)\s*\*\/)?/g)].map(([, name, value, note]) => ({
    name,
    value: value.trim(),
    note: note ?? "",
  }));
}
