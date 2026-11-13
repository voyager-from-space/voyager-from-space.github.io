import { chromium } from "playwright";
const [url, prefix, full] = process.argv.slice(2);
const b = await chromium.launch();
for (const [n, vp, dsf, mobile] of [["desktop", {width:1280,height:800}, 1, false], ["mobile", {width:390,height:844}, 3, true]]) {
  const c = await b.newContext({ viewport: vp, deviceScaleFactor: dsf, isMobile: mobile, hasTouch: mobile });
  const p = await c.newPage();
  await p.goto(url, { waitUntil: "networkidle" });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${prefix}-${n}.png` });
  if (full === "full") await p.screenshot({ path: `${prefix}-${n}-full.png`, fullPage: true });
  await c.close();
}
await b.close();
