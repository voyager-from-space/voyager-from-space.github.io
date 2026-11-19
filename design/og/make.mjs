// renders the 1200x630 share cards. usage: node design/og/make.mjs   (needs playwright; CHROME_PATH for system chrome)
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
const here = fileURLToPath(new URL(".", import.meta.url));
const cards = [
  ["texdiet", "texdiet", "Find what slows your LaTeX project down and get a smaller zip back.", "Free. Runs in your browser. Nothing is uploaded."],
  ["papershed", "papershed", "Clean a LaTeX zip before you post it: comments, photo GPS, PDF metadata, leaked links, arXiv limits.", "Free. Runs in your browser. Nothing is uploaded."],
  ["blindsanitize", "blindsanitize", "Check that a double-blind submission is blind: source, PDF and extra files.", "Free. Runs in your browser. Nothing is uploaded."],
];
const out = process.argv[2] || "/tmp/og";
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ["--no-sandbox", "--allow-file-access-from-files"] });
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
for (const [file, name, job, foot] of cards) {
  await p.goto(`file://${here}card.html?` + new URLSearchParams({ name, job, foot }));
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: `${out}/${file}-raw.png` });
}
await b.close();
