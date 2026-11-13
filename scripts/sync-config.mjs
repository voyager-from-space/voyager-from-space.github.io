// rewrites the <!-- sync:start --> ... <!-- sync:end --> meta block in public/index.html
// from public/site.config.json, so crawlers (which don't run js) see the same persona.
import { readFileSync, writeFileSync } from "node:fs";
const root = new URL("../public/", import.meta.url);
const cfg = JSON.parse(readFileSync(new URL("site.config.json", root), "utf8"));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const plain = cfg.name.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, "").trim();
const title = `${cfg.name} ~ mission log`;
// og:image must be absolute for most crawlers; relative until siteUrl exists
const img = cfg.siteUrl ? new URL("og-image.png", cfg.siteUrl).href : "og-image.png";
const lines = [
  `<title>${esc(title)}</title>`,
  `<meta name="description" content="${esc(cfg.tagline)}">`,
  `<meta property="og:type" content="website">`,
  `<meta property="og:title" content="${esc(title)}">`,
  `<meta property="og:description" content="${esc(cfg.tagline)}">`,
  ...(cfg.siteUrl ? [`<meta property="og:url" content="${esc(cfg.siteUrl)}">`, `<link rel="canonical" href="${esc(cfg.siteUrl)}">`] : []),
  `<meta property="og:image" content="${esc(img)}">`,
  `<meta property="og:image:width" content="1200">`,
  `<meta property="og:image:height" content="630">`,
  `<meta property="og:image:alt" content="${esc(plain)} mission log: amber telemetry console">`,
  `<meta name="twitter:card" content="summary_large_image">`,
  `<meta name="twitter:image" content="${esc(img)}">`,
  `<meta name="twitter:site" content="${esc(cfg.handle)}">`,
  `<meta name="twitter:title" content="${esc(title)}">`,
  `<meta name="twitter:description" content="${esc(cfg.tagline)}">`,
];
const file = new URL("index.html", root);
const html = readFileSync(file, "utf8");
const re = /(<!-- sync:start[^>]*-->\n)[\s\S]*?(<!-- sync:end -->)/;
if (!re.test(html)) throw new Error("sync markers not found in index.html");
writeFileSync(file, html.replace(re, `$1${lines.join("\n")}\n$2`));
console.log("synced meta from site.config.json:", title);
