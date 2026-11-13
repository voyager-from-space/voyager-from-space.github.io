// end-to-end check: serves public/, drives headless chromium at desktop + mobile,
// asserts the shell works and the log renders, saves screenshots.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync, existsSync, readFileSync } from "node:fs";

const PORT = 4173, BASE = `http://127.0.0.1:${PORT}/`;
const SHOTS = new URL("../screenshots/", import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });
const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1", "--directory", "public"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));

let fails = 0;
// optional local denylist (gitignored) — checked against rendered page text, title, meta and shell output
const denyFile = new URL("../.identity-denylist", import.meta.url);
const deny = existsSync(denyFile) ? readFileSync(denyFile, "utf8").split("\n").map((l) => l.trim().toLowerCase()).filter(Boolean) : [];
const leaks = (text) => deny.filter((d) => text.toLowerCase().includes(d));
const ok = (cond, msg) => { console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`); if (!cond) fails++; };
const browser = await chromium.launch();

async function page(viewport, url = BASE, extra = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: viewport.width < 500 ? 3 : 1, ...extra });
  const p = await ctx.newPage();
  const errors = [], external = [];
  p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(`${m.type()}: ${m.text()}`); });
  p.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  p.on("requestfailed", (r) => errors.push("requestfailed: " + r.url()));
  p.on("request", (r) => { if (!r.url().startsWith(BASE)) external.push(r.url()); });
  await p.goto(url, { waitUntil: "networkidle" });
  await p.waitForFunction(() => document.querySelector("#out").textContent.includes("logged"));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(1000); // boot flicker done
  return { p, ctx, errors, external };
}
const outText = (p) => p.locator("#out").innerText();
const runCmd = async (p, cmd) => { await p.locator("#cmd").fill(cmd); await p.locator("#cmd").press("Enter"); await p.waitForTimeout(150); };

// ---- desktop, real (empty) data
{
  const { p, ctx, errors, external } = await page({ width: 1280, height: 800 });
  ok((await p.locator("#log .empty .big").innerText()) === "no transmissions yet.", "desktop: real ships.json renders honest empty state");
  ok(await p.locator("#example-banner").isHidden(), "desktop: example banner hidden on real data");
  ok((await p.locator("#log-src").innerText()).includes("ships.json") && !(await p.locator("#log-src").innerText()).includes("example"), "desktop: log source is ships.json");
  ok((await p.locator("#next-list li").count()) === 1 && (await p.locator("#next-list").innerText()).includes("texdiet"), "desktop: only texdiet listed under 'planned · not shipped'");
  ok((await p.title()).startsWith("voyager"), "desktop: title is the persona name");
  ok((await p.locator("#name").innerText()) === "voyager" && (await p.locator(".probe").evaluate((i) => i.complete && i.naturalWidth === 400)), "desktop: banner = 'voyager' + probe sprite (emoji kept out of the pixel font)");
  ok((await p.locator("#foot-x").getAttribute("href")) === "https://x.com/voyagerships", "desktop: x link is x.com/voyagerships");
  ok((await p.locator("#foot-gh").getAttribute("href")) === "https://github.com/voyager-from-space", "desktop: footer github link");
  ok((await p.evaluate(() => document.documentElement.dataset.theme)) === undefined && (await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--fg").trim())) === "#ffb03c", "desktop: amber is the default theme");
  const og = await p.locator('meta[property="og:image"]').getAttribute("content");
  const ogRes = await p.request.get(BASE + og);
  ok(og === "og-image.png" && ogRes.ok() && (await ogRes.body()).length > 5000, "desktop: og:image wired and served");
  await p.screenshot({ path: SHOTS + "desktop-landing.png" });

  await runCmd(p, "help");
  let t = await outText(p);
  ok(t.includes("commands") && t.includes("open <n>") && t.includes("clear"), "desktop: `help` prints command list");
  await runCmd(p, "log");
  t = await outText(p);
  ok(t.includes("no transmissions yet.") && t.includes("planned, not shipped"), "desktop: `log` prints honest empty state");
  await runCmd(p, "cat about");
  ok((await outText(p)).includes("# about.txt"), "desktop: `cat about` works");
  await runCmd(p, "sudo rm -rf /");
  ok((await outText(p)).includes("not in the sudoers file"), "desktop: `sudo` easter egg");
  await runCmd(p, "whoami");
  ok((await outText(p)).includes("@voyagerships"), "desktop: `whoami` shows the x handle");
  await p.context().route("https://github.com/**", (r) => r.abort()); // don't actually leave the box
  await runCmd(p, "cat links");
  ok((await outText(p)).includes("github.com/voyager-from-space"), "desktop: `cat links` lists the github source");
  await runCmd(p, "nope");
  ok((await outText(p)).includes("nope: command not found"), "desktop: unknown command handled");
  await p.screenshot({ path: SHOTS + "desktop-after-command.png" });

  await p.locator('.chips button[data-cmd="clear"]').click();
  await p.waitForTimeout(400);
  ok((await outText(p)).trim() === "", "desktop: `clear` chip clears the screen");
  await p.locator('.chips button[data-cmd="next"]').click();
  await p.waitForTimeout(600);
  t = await outText(p);
  ok(t.includes("planned. not shipped.") && t.includes("texdiet") && !t.includes("hooklog"), "desktop: `next` chip types + runs `next` (texdiet only)");
  await p.locator('.chips button[data-cmd="ping earth"]').click();
  await p.waitForTimeout(1500);
  ok((await outText(p)).includes("3 packets sent"), "desktop: `ping earth` chip");
  await p.locator('.chips button[data-cmd="chai"]').click();
  await p.waitForTimeout(800);
  ok((await outText(p)).includes("zero-g"), "desktop: `chai` chip easter egg");

  const all = (await p.locator("body").innerText()) + (await p.title()) + (await p.evaluate(() => [...document.querySelectorAll("meta,link,a")].map((m) => m.outerHTML).join(" ")));
  ok(deny.length > 0 && leaks(all).length === 0, `desktop: rendered page + shell output contain 0 denylisted strings (${deny.length} checked)` + (leaks(all).length ? " -> " + leaks(all).join(", ") : ""));
  await runCmd(p, "theme ice");
  ok((await p.evaluate(() => document.documentElement.dataset.theme)) === "ice", "desktop: `theme ice` switches to the alternate");
  await runCmd(p, "theme amber");
  ok(errors.length === 0, "desktop: no console errors/warnings" + (errors.length ? " -> " + errors.join(" | ") : ""));
  ok(external.length === 0, "desktop: zero third-party requests" + (external.length ? " -> " + external.join(", ") : ""));
  await ctx.close();
}

// ---- desktop, example data toggle
{
  const { p, ctx, errors } = await page({ width: 1280, height: 800 }, BASE + "?ships=example");
  ok(await p.locator("#example-banner").isVisible(), "example: banner says it's fake test data");
  ok((await p.locator("#log .entry").count()) === 2, "example: 2 entries render in ships.log");
  const first = await p.locator("#log .entry").first().innerText();
  ok(first.includes("TX-002") && first.includes("example-cron-whisperer") && first.includes("cli") && first.includes("unverified"), "example: newest first, TX id, category tag, unverified status shown");
  ok((await p.locator("#log .entry").nth(1).innerText()).includes("verified"), "example: verified status shown");
  await runCmd(p, "log");
  const t = await outText(p);
  ok(t.includes("TX-001") && t.includes("example-orbit-golf") && t.includes("<game>") && t.includes("[verified]") && t.includes("[unverified]"), "example: `log` lists both in the shell");
  await runCmd(p, "clear"); await runCmd(p, "log game");
  const g = await outText(p);
  ok(g.includes("example-orbit-golf") && !g.includes("example-cron-whisperer"), "example: `log game` filters by tag");
  await runCmd(p, "clear"); await runCmd(p, "log");
  await p.evaluate(() => window.scrollTo(0, document.querySelector("#shiplog").getBoundingClientRect().top + scrollY - 420));
  await p.waitForTimeout(300);
  await p.screenshot({ path: SHOTS + "desktop-ships-log-EXAMPLE-DATA.png" });
  ok(errors.length === 0, "example: no console errors" + (errors.length ? " -> " + errors.join(" | ") : ""));
  await ctx.close();
}

// ---- mobile 390x844
{
  const { p, ctx, errors } = await page({ width: 390, height: 844 }, BASE, { isMobile: true, hasTouch: true });
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(sw <= 390, `mobile: no horizontal overflow (scrollWidth ${sw})`);
  await p.screenshot({ path: SHOTS + "mobile-landing.png" });
  await p.locator('.chips button[data-cmd="log"]').tap();
  await p.waitForTimeout(700);
  ok((await outText(p)).includes("no transmissions yet."), "mobile: tapping `log` chip runs it");
  await p.screenshot({ path: SHOTS + "mobile-after-tap.png" });
  ok(errors.length === 0, "mobile: no console errors" + (errors.length ? " -> " + errors.join(" | ") : ""));
  await ctx.close();
}

// ---- reduced motion: chips run instantly, no typing animation
{
  const { p, ctx } = await page({ width: 1280, height: 800 }, BASE, { reducedMotion: "reduce" });
  await p.locator('.chips button[data-cmd="help"]').click();
  ok((await outText(p)).includes("commands"), "reduced-motion: chip runs instantly");
  const anim = await p.evaluate(() => getComputedStyle(document.querySelector(".cursor")).animationName);
  ok(anim === "none", "reduced-motion: cursor blink disabled");
  await ctx.close();
}

await browser.close();
server.kill();
console.log(fails ? `\n${fails} FAILED` : "\nall checks passed");
process.exit(fails ? 1 : 0);
