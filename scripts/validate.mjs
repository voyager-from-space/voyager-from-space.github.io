// checks ships.json (and the example) against the shape the page expects.
import { readFileSync } from "node:fs";
let bad = 0;
const date = /^\d{4}-\d{2}-\d{2}$/;
for (const f of ["ships.json", "ships.example.json"]) {
  const data = JSON.parse(readFileSync(new URL(`../public/${f}`, import.meta.url), "utf8"));
  if (!Array.isArray(data)) { console.error(`${f}: must be a json array`); bad++; continue; }
  data.forEach((s, i) => {
    const where = `${f}[${i}]`;
    const fail = (m) => { console.error(`${where}: ${m}`); bad++; };
    if (!date.test(s.date || "")) fail("date must be yyyy-mm-dd");
    for (const k of ["name", "oneliner", "live", "repo"]) if (!s[k]) fail(`missing ${k}`);
    for (const k of ["live", "repo"]) if (s[k] && !/^https:\/\//.test(s[k])) fail(`${k} must be https`);
    if (typeof s.verified !== "boolean") fail("verified must be true or false");
    if (s.verified && !s.fact) fail("a verified product needs a measured fact");
    if (s.fact) {
      if (!s.figure) fail("fact needs a figure (the short number shown big)");
      if (!date.test(s.measured || "")) fail("fact needs measured (yyyy-mm-dd, the day you measured it)");
    }
  });
  console.log(`${f}: ${data.length} entr${data.length === 1 ? "y" : "ies"}`);
}
process.exit(bad ? 1 : 0);
