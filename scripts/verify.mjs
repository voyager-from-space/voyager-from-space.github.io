// end-to-end check of the site in headless chromium, desktop + mobile.
// local: serves public/ on 127.0.0.1:4173. live: BASE_URL=https://voyager-from-space.github.io/ npm run verify
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const PORT = 4173, LIVE = process.env.BASE_URL, BASE = LIVE || `http://127.0.0.1:${PORT}/`;
const cfg = JSON.parse(readFileSync(new URL("../public/site.config.json", import.meta.url), "utf8"));
const server = LIVE ? { kill() {} } : spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1", "--directory", "public"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));

// local, gitignored denylist, checked against rendered text, title and meta
const denyFile = new URL("../.identity-denylist", import.meta.url);
const deny = existsSync(denyFile) ? readFileSync(denyFile, "utf8").split("\n").map((l) => l.trim().toLowerCase()).filter(Boolean) : [];
let fails = 0, passes = 0;
const ok = (cond, msg) => { console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`); cond ? passes++ : fails++; };
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: process.env.CHROME_PATH ? ["--no-sandbox"] : [] });
const cb = `cb=${Date.now()}`; // defeat the pages cdn cache on live runs

async function open(viewport, query = "", extra = {}, setup) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: viewport.width < 500 ? 3 : 1, ...extra });
  const p = await ctx.newPage();
  const errors = [], external = [];
  p.on("console", (m) => { if (["error", "warning"].includes(m.type())) errors.push(`${m.type()}: ${m.text()}`); });
  p.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  p.on("requestfailed", (r) => errors.push("requestfailed: " + r.url()));
  p.on("request", (r) => { if (!r.url().startsWith(BASE) && !r.url().startsWith("data:")) external.push(r.url()); });
  if (setup) await setup(p);
  await p.goto(`${BASE}?${cb}${query ? "&" + query : ""}`, { waitUntil: "networkidle" });
  await p.waitForSelector("#ships .ship");
  await p.evaluate(() => document.fonts.ready);
  return { p, ctx, errors, external };
}

// wcag relative luminance contrast for every element that owns visible text.
// backgrounds are composited up the tree over the page background.
const contrastPairs = (p) => p.evaluate(() => {
  const parse = (c) => { const m = c.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 0]; return { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 }; };
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const L = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const over = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
  const bgOf = (el) => {
    const chain = []; for (let e = el; e; e = e.parentElement) chain.push(parse(getComputedStyle(e).backgroundColor));
    return chain.reverse().reduce((acc, c) => (c.a ? over(c, acc) : acc), parse(getComputedStyle(document.documentElement).backgroundColor));
  };
  const out = [];
  for (const el of document.querySelectorAll("body *")) {
    if (el.closest("svg, noscript, script, style")) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const r = el.getBoundingClientRect();
    if (!own || !r.width || getComputedStyle(el).visibility === "hidden" || el.closest("[hidden]")) continue;
    const cs = getComputedStyle(el), fg = over(parse(cs.color), bgOf(el)), bg = bgOf(el);
    const [a, b] = [L(fg), L(bg)].sort((x, y) => y - x);
    const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700;
    const large = size >= 24 || (bold && size >= 18.66);
    out.push({ text: el.textContent.trim().slice(0, 40), ratio: (a + 0.05) / (b + 0.05), need: large ? 3 : 4.5, color: cs.color, bg: `rgb(${bg.r|0},${bg.g|0},${bg.b|0})` });
  }
  return out;
});


const ships = JSON.parse(readFileSync(new URL("../public/ships.json", import.meta.url), "utf8")).filter((s) => s.verified);

// ---- desktop
{
  const { p, ctx, errors, external } = await open({ width: 1280, height: 800 });
  ok(await p.evaluate(() => !!document.querySelector("header nav") && !!document.querySelector("main") && !!document.querySelector("footer")), "landmarks: header, nav, main, footer");
  ok((await p.locator("h1").innerText()).replace(/\s+/g, " ").includes("Free tools that run in your browser"), "hero headline");
  ok((await p.title()).includes(cfg.name), `title: ${await p.title()}`);
  const n = await p.locator(".ship").count();
  ok(n === ships.length, `one card per verified product in ships.json (${n} of ${ships.length})`);
  for (const s of ships) {
    const c = p.locator(`.ship:has(h3:text-is("${s.name}"))`);
    const live = await c.locator(".btn").getAttribute("href"), repo = await c.locator(".go a:not(.btn)").getAttribute("href");
    const fig = await c.locator(".fig").innerText(), fact = await c.locator(".fact").innerText();
    ok(live === s.live && repo === s.repo && fig === s.figure && fact === s.fact, `card ${s.name}: job, figure, fact, live link and code link match ships.json`);
  }
  ok((await p.locator('a[href="https://x.com/voyagerships"]').count()) >= 2 && (await p.locator('a[href="https://github.com/voyager-from-space"]').count()) >= 2, "X and GitHub links present");
  ok((await p.locator("#next .next-name").innerText()) === "blindsanitize", "Building now names blindsanitize");
  const first = await p.locator(".ship").first().boundingBox();
  ok(first.y + 220 < 800, `first card and its figure are visible in the first 1280x800 screen (y ${Math.round(first.y)})`);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(sw <= 1280, `desktop: no horizontal overflow (${sw})`);
  const pairs = await contrastPairs(p);
  ok(pairs.every((x) => x.ratio >= x.need), `desktop: contrast AA on ${pairs.length} text elements`);
  if (!pairs.every((x) => x.ratio >= x.need)) console.log(pairs.filter((x) => x.ratio < x.need));
  ok(errors.length === 0, `no console errors${errors.length ? ": " + errors.join(" | ") : ""}`);
  ok(external.length === 0, `no third-party requests${external.length ? ": " + external.join(" ") : ""}`);
  const text = (await p.evaluate(() => document.documentElement.innerText + "\n" + document.title + "\n" + document.documentElement.outerHTML)).toLowerCase();
  const hit = deny.filter((d) => text.includes(d));
  ok(deny.length > 0 && hit.length === 0, `denylist: ${deny.length} patterns, ${hit.length} hits on the rendered page and its html`);
  await ctx.close();
}

// ---- the prerendered html (no js) already has every card
{
  const html = await (await fetch(`${BASE}?${cb}`)).text();
  const n = (html.match(/<article class="ship"/g) || []).length;
  ok(n === ships.length, `no-js html already contains all ${ships.length} cards (${n})`);
}

// ---- a new ships.json entry is the only thing needed for a new card
{
  const extra = { date: "2026-12-01", name: "zz-test-entry", oneliner: "Test job.", figure: "1 s", fact: "Test fact.", measured: "2026-12-01", live: "https://example.com/", repo: "https://example.com/r", verified: true };
  const { p, ctx } = await open({ width: 1280, height: 800 }, "", {}, async (pg) => {
    await pg.route("**/ships.json*", async (route) => { const r = await route.fetch(); const j = await r.json(); await route.fulfill({ response: r, json: [...j, extra] }); });
  });
  await p.waitForFunction(() => document.querySelectorAll(".ship").length > 0 && [...document.querySelectorAll(".ship h3")].some((h) => h.textContent === "zz-test-entry"));
  ok(await p.locator(".ship").count() === ships.length + 1, "adding one ships.json entry adds one card, nothing else edited");
  await ctx.close();
}

// ---- mobile 390x844
{
  const { p, ctx, errors, external } = await open({ width: 390, height: 844 }, "", { isMobile: true, hasTouch: true });
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(sw <= 390, `mobile: no horizontal overflow (scrollWidth ${sw})`);
  const cta = await p.locator(".cta .btn").boundingBox();
  ok(cta.y + cta.height <= 844, "mobile: headline, intro and main button fit above the fold");
  const pairs = await contrastPairs(p);
  ok(pairs.every((x) => x.ratio >= x.need), `mobile: contrast AA on ${pairs.length} text elements`);
  ok(errors.length === 0 && external.length === 0, "mobile: no console errors, no third-party requests");
  await ctx.close();
}

// ---- reduced motion
{
  const { p, ctx } = await open({ width: 1280, height: 800 }, "", { reducedMotion: "reduce" });
  const anim = await p.evaluate(() => [getComputedStyle(document.querySelector(".disc")).animationName, getComputedStyle(document.querySelector(".sky"), "::after").animationName, getComputedStyle(document.documentElement).scrollBehavior]);
  ok(anim[0] === "none" && anim[1] === "none" && anim[2] === "auto", `reduced-motion: record spin, twinkle and smooth scroll are off (${anim.join(", ")})`);
  await ctx.close();
}

// ---- every live and code link answers
for (const s of ships) for (const [k, u] of [["live", s.live], ["code", s.repo]]) {
  const r = await fetch(u, { redirect: "follow" });
  ok(r.status === 200, `${s.name} ${k} link answers 200 (${u})`);
}

await browser.close();
server.kill();
console.log(`\n${passes} passed, ${fails} failed${LIVE ? ` (live: ${BASE})` : " (local)"}`);
process.exit(fails ? 1 : 0);
