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
const browser = await chromium.launch();
const cb = `cb=${Date.now()}`; // defeat the pages cdn cache on live runs

async function open(viewport, query = "", extra = {}, setup) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: viewport.width < 500 ? 3 : 1, ...extra });
  const p = await ctx.newPage();
  const errors = [], external = [];
  let bytes = 0;
  p.on("console", (m) => { if (["error", "warning"].includes(m.type())) errors.push(`${m.type()}: ${m.text()}`); });
  p.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  p.on("requestfailed", (r) => errors.push("requestfailed: " + r.url()));
  p.on("request", (r) => { if (!r.url().startsWith(BASE) && !r.url().startsWith("data:")) external.push(r.url()); });
  p.on("response", async (r) => { try { bytes += (await r.body()).length; } catch {} });
  if (setup) await setup(p);
  await p.goto(`${BASE}?${cb}${query ? "&" + query : ""}`, { waitUntil: "networkidle" });
  await p.waitForSelector("#ships .list-h");
  await p.evaluate(() => document.fonts.ready);
  return { p, ctx, errors, external, bytes: () => bytes };
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

const pngSize = (buf) => ({ w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) });

// ---- desktop, real data
{
  const { p, ctx, errors, external, bytes } = await open({ width: 1280, height: 800 });
  ok(await p.evaluate(() => !!document.querySelector("header nav") && !!document.querySelector("main") && !!document.querySelector("footer")), "landmarks: header, nav, main, footer");
  const h1 = (await p.locator("h1").innerText()).replace(/\s+/g, " ");
  ok(h1.includes("useful little tools for everyone") && h1.includes("in public"), "section 1: hero mission statement");
  ok(await p.locator("h1").isVisible() && (await p.locator("h1").boundingBox()).y < 800, "hero message is above the fold");
  ok((await p.locator(".steps li").count()) === 3 && (await p.locator(".steps h3").allInnerTexts()).join("|") === "mission numbers|open code|raw numbers", "section 2: how it works has 3 items (mission numbers, open code, raw numbers)");
  ok(await p.locator("section#log h2").innerText() === "mission log", "section 3: mission log");
  ok(await p.locator("section#manifesto h2").innerText() === "manifesto", "section 4: manifesto");
  ok(await p.locator("section#links").isVisible(), "section 5: links");

  const next = p.locator("#next-launch");
  const nt = (await next.innerText()).toLowerCase();
  const nx = cfg.next[0];
  ok((await p.locator("#next .mission").count()) === cfg.next.length && nt.includes(nx.name) && nt.includes(nx.what) && nt.includes("16 nov 2026"), "next launch card: texdiet, 16 nov 2026, config one-liner");
  ok(nt.includes("planned, not shipped") && (await next.locator(".patch").getAttribute("aria-label")).includes("planned"), "next launch card is labelled planned, not shipped");
  const shipped = JSON.parse(await (await p.request.get(`${BASE}ships.json?${cb}`)).text());
  ok(nt.includes(`mission ${String(shipped.length + 1).padStart(3, "0")}`), "next launch gets the next mission number");
  if (shipped.length === 0) ok((await p.locator("#empty .big").innerText()) === "no launches yet." && (await p.locator("#ships .mission").count()) === 0, "empty ships.json renders the empty state");
  else ok((await p.locator("#ships .mission").count()) === shipped.length, `ships.json renders ${shipped.length} launches`);
  ok(await p.locator("#example-banner").isHidden(), "example banner hidden on real data");

  const quotes = await p.locator(".quote").evaluateAll((fs) => fs.map((f) => [f.querySelector("blockquote").textContent.trim(), f.querySelector("figcaption").textContent.trim()]));
  const want = [
    ["Look again at that dot. That's here. That's home. That's us.", "Carl Sagan, Pale Blue Dot (1994)"],
    ["This is a present from a small distant world, a token of our sounds, our science, our images, our music, our thoughts, and our feelings.", "Jimmy Carter, statement placed on the Voyager spacecraft (1977)"],
    ["If you wish to make an apple pie from scratch, you must first invent the universe.", "Carl Sagan, Cosmos (1980)"],
  ];
  ok(JSON.stringify(quotes) === JSON.stringify(want), "manifesto quotes are the 3 verified quotes with attributions");

  ok((await p.locator("#link-x").getAttribute("href")) === "https://x.com/voyagerships" && (await p.locator("#link-x").innerText()).includes("@voyagerships"), "x link is x.com/voyagerships");
  ok((await p.locator("#link-gh").getAttribute("href")) === "https://github.com/voyager-from-space", "github link is github.com/voyager-from-space");
  const hrefs = await p.locator("a[href^='http']").evaluateAll((as) => as.map((a) => a.href));
  ok(hrefs.every((h) => h.startsWith("https://x.com/voyagerships") || h.startsWith("https://github.com/voyager-from-space")), `every outbound link goes to x/voyagerships or github/voyager-from-space (${hrefs.length})`);

  ok(await p.evaluate(() => document.fonts.check('16px "Plex Sans"') && document.fonts.check('16px "Plex Mono"')), "self-hosted plex sans + plex mono loaded");
  ok(await p.evaluate(() => getComputedStyle(document.querySelector(".disc")).animationName === "spin"), "motion on by default (record label spins)");
  const imgs = await p.evaluate(() => [...document.querySelectorAll("img")].every((i) => i.hasAttribute("alt")) && [...document.querySelectorAll("svg[role=img]")].every((s) => s.getAttribute("aria-label")) && [...document.querySelectorAll("svg:not([role=img])")].every((s) => s.closest("[aria-hidden=true]") || s.getAttribute("aria-hidden") === "true"));
  ok(imgs, "every image has alt text; decorative svgs are aria-hidden; patches have labels");

  // og / twitter meta
  const meta = async (sel) => p.locator(sel).getAttribute("content");
  const ogImg = await meta('meta[property="og:image"]');
  ok(ogImg === new URL("og-image.png", cfg.siteUrl).href, `og:image is absolute under siteUrl (${ogImg})`);
  ok((await meta('meta[name="twitter:card"]')) === "summary_large_image" && (await meta('meta[name="twitter:image"]')) === ogImg, "twitter:card summary_large_image + twitter:image");
  ok((await meta('meta[property="og:title"]')).startsWith("voyager") && (await meta('meta[property="og:description"]')) === cfg.tagline && (await meta('meta[property="og:url"]')) === cfg.siteUrl, "og:title / og:description / og:url match the config");
  const og = await p.request.get(`${BASE}og-image.png?${cb}`);
  const ogBuf = await og.body(), dim = pngSize(ogBuf);
  ok(og.ok() && og.headers()["content-type"] === "image/png" && dim.w === 1200 && dim.h === 630, `og-image.png served as 1200x630 png (${dim.w}x${dim.h}, ${ogBuf.length} bytes)`);

  // keyboard: tab through the page, every link and the button get a visible outline
  await p.locator("body").click({ position: { x: 5, y: 5 } });
  const seen = [];
  for (let i = 0; i < 30; i++) {
    await p.keyboard.press("Tab");
    const f = await p.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const s = getComputedStyle(e); return { tag: e.tagName, text: e.textContent.trim().slice(0, 30), outline: s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2 }; });
    if (!f) break; seen.push(f);
  }
  const linkCount = await p.locator("a:visible").count();
  ok(seen[0]?.text === "skip to content", "first tab stop is the skip link");
  ok(seen.length >= linkCount && seen.every((f) => f.outline), `keyboard reaches ${seen.length} stops (${linkCount} visible links) and each has a visible focus outline`);

  // svg text inside the patches isn't covered by the dom walk, so check its fills against the patch fill
  const svgPairs = await p.locator("#ships .patch, #next .patch").evaluateAll((svgs) => svgs.flatMap((s) => [...s.querySelectorAll("text")].map((t) => [t.getAttribute("fill"), s.querySelector("circle").getAttribute("fill")])));
  const hexL = (h) => { const v = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const svgRatios = svgPairs.map(([f, b]) => { const [x, y] = [hexL(f), hexL(b)].sort((a, c) => c - a); return (x + 0.05) / (y + 0.05); });
  ok(svgRatios.length >= 3 && svgRatios.every((r) => r >= 4.5), `contrast AA on ${svgRatios.length} patch svg text fills (min ${Math.min(...svgRatios).toFixed(2)}:1)`);
  const pairs = await contrastPairs(p);
  const bad = pairs.filter((x) => x.ratio < x.need);
  const min = Math.min(...pairs.map((x) => x.ratio));
  ok(pairs.length > 20 && bad.length === 0, `contrast AA on ${pairs.length} text/background pairs (min ${min.toFixed(2)}:1)` + (bad.length ? " -> " + bad.map((b) => `${b.text} ${b.ratio.toFixed(2)}`).join(" | ") : ""));

  const all = (await p.locator("body").innerText()) + (await p.title()) + (await p.evaluate(() => [...document.querySelectorAll("meta,link,a")].map((m) => m.outerHTML).join(" ")));
  const leaks = deny.filter((d) => all.toLowerCase().includes(d));
  ok(deny.length > 0 && leaks.length === 0, `rendered page + meta contain 0 denylisted strings (${deny.length} checked)` + (leaks.length ? " -> " + leaks.join(", ") : ""));
  ok(errors.length === 0, "desktop: no console errors/warnings" + (errors.length ? " -> " + errors.join(" | ") : ""));
  ok(external.length === 0, "desktop: zero third-party requests" + (external.length ? " -> " + external.join(", ") : ""));
  ok(bytes() < 200_000, `page weight ${(bytes() / 1024).toFixed(0)} KB (< 200 KB)`);
  await ctx.close();
}

// ---- forced-empty log, so the empty state is tested even after real ships exist
{
  const { p, ctx, errors } = await open({ width: 1280, height: 800 }, "", {}, (p) => p.route(/ships\.json/, (r) => r.fulfill({ contentType: "application/json", body: "[]" })));
  ok((await p.locator("#empty").isVisible()) && (await p.locator("#empty").innerText()).includes("mission 001 goes up on 16 nov 2026"), "empty ships.json: empty state names mission 001 and the date");
  ok((await p.locator("#next-launch").innerText()).includes("mission 001"), "empty ships.json: texdiet is mission 001");
  ok(errors.length === 0, "empty: no console errors");
  await ctx.close();
}

// ---- example data
{
  const { p, ctx, errors } = await open({ width: 1280, height: 800 }, "ships=example");
  ok(await p.locator("#example-banner").isVisible(), "example: banner says it's fake test data");
  const cards = p.locator("#ships .mission");
  ok((await cards.count()) === 2 && (await p.locator("#ships .patch").count()) === 2, "example: 2 launches render, each with a mission patch");
  const labels = await p.locator("#ships .patch").evaluateAll((s) => s.map((x) => x.getAttribute("aria-label")));
  ok(labels[0] === "mission patch 002, example-cron-whisperer" && labels[1] === "mission patch 001, example-orbit-golf", "example: newest first, patches carry mission number + name");
  ok(await p.locator("#ships .patch").first().evaluate((s) => [...s.querySelectorAll("textPath")].map((t) => t.textContent).join("|") === "VOYAGER|EXAMPLE-CRON-WHISPERER"), "example: patch text reads VOYAGER / ship name");
  const t0 = await cards.nth(0).innerText(), t1 = await cards.nth(1).innerText();
  ok(t0.includes("unverified") && t1.includes("verified") && t0.includes("cli") && t0.includes("live") && t0.includes("code"), "example: category, verified/unverified and live/code links shown");
  ok((await p.locator("#next-launch").innerText()).includes("mission 003"), "example: next launch numbered after the shipped ones");
  ok(errors.length === 0, "example: no console errors" + (errors.length ? " -> " + errors.join(" | ") : ""));
  await ctx.close();
}

// ---- mobile 390x844
{
  const { p, ctx, errors, external } = await open({ width: 390, height: 844 }, "", { isMobile: true, hasTouch: true });
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(sw <= 390, `mobile: no horizontal overflow (scrollWidth ${sw})`);
  const cta = await p.locator(".btn").boundingBox();
  ok(cta.y + cta.height <= 844, "mobile: headline, intro and main button fit above the fold");
  const pairs = await contrastPairs(p);
  ok(pairs.every((x) => x.ratio >= x.need), `mobile: contrast AA on ${pairs.length} pairs`);
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

await browser.close();
server.kill();
console.log(`\n${passes} passed, ${fails} failed${LIVE ? ` (live: ${BASE})` : " (local)"}`);
process.exit(fails ? 1 : 0);
