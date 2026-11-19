// regenerates three marked blocks in public/index.html so crawlers (which don't run js)
// see the same page the browser does:
//   sync:  title and share meta, from site.config.json
//   cards: one card per verified entry, from ships.json
//   next:  the "Building now" lines, from site.config.json
import { readFileSync, writeFileSync } from "node:fs";
import { cards, nextUp, esc } from "../public/render.js";
const root = new URL("../public/", import.meta.url);
const cfg = JSON.parse(readFileSync(new URL("site.config.json", root), "utf8"));
const ships = JSON.parse(readFileSync(new URL("ships.json", root), "utf8"));
const title = `${cfg.name}: free tools that run in your browser`;
const img = new URL("og-image.png", cfg.siteUrl).href;
const meta = [
  `<title>${esc(title)}</title>`,
  `<meta name="description" content="${esc(cfg.tagline)}">`,
  `<meta property="og:type" content="website">`,
  `<meta property="og:title" content="${esc(title)}">`,
  `<meta property="og:description" content="${esc(cfg.tagline)}">`,
  `<meta property="og:url" content="${esc(cfg.siteUrl)}">`,
  `<link rel="canonical" href="${esc(cfg.siteUrl)}">`,
  `<meta property="og:image" content="${esc(img)}">`,
  `<meta property="og:image:width" content="1200">`,
  `<meta property="og:image:height" content="630">`,
  `<meta property="og:image:alt" content="${esc(cfg.name + ": an amber record on a navy starfield.")}">`,
  `<meta name="twitter:card" content="summary_large_image">`,
  `<meta name="twitter:image" content="${esc(img)}">`,
  `<meta name="twitter:site" content="${esc(cfg.handle)}">`,
  `<meta name="twitter:title" content="${esc(title)}">`,
  `<meta name="twitter:description" content="${esc(cfg.tagline)}">`,
].join("\n");

const file = new URL("index.html", root);
let html = readFileSync(file, "utf8");
const swap = (name, body) => {
  const re = new RegExp(`(<!-- ${name}:start[^>]*-->\\n?)[\\s\\S]*?(<!-- ${name}:end -->)`);
  if (!re.test(html)) throw new Error(`${name} markers not found in index.html`);
  html = html.replace(re, (_, a, b) => `${a}${body}\n    ${b}`);
};
swap("sync", meta);
swap("cards", cards(ships));
swap("next", nextUp(cfg.next));
writeFileSync(file, html);
console.log(`synced: ${title}, ${ships.filter((s) => s.verified).length} cards, ${(cfg.next || []).length} next`);
