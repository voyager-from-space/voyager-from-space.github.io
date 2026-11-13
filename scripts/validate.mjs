// checks ships.json (and the example) against the shape the site expects.
import { readFileSync } from "node:fs";
let bad = 0;
const cats = JSON.parse(readFileSync(new URL("../public/site.config.json", import.meta.url), "utf8")).categories;
for (const f of ["ships.json", "ships.example.json"]) {
  const data = JSON.parse(readFileSync(new URL(`../public/${f}`, import.meta.url), "utf8"));
  if (!Array.isArray(data)) { console.error(`${f}: must be a json array`); bad++; continue; }
  data.forEach((s, i) => {
    const where = `${f}[${i}]`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.date || "")) { console.error(`${where}: date must be yyyy-mm-dd`); bad++; }
    for (const k of ["name", "oneliner"]) if (!s[k]) { console.error(`${where}: missing ${k}`); bad++; }
    for (const k of ["live", "repo"]) if (s[k] && !/^https:\/\//.test(s[k])) { console.error(`${where}: ${k} must be https`); bad++; }
    if (s.category != null && !cats.includes(s.category)) { console.error(`${where}: category "${s.category}" not in site.config.json categories: ${cats.join(", ")}`); bad++; }
    if (typeof s.verified !== "boolean") { console.error(`${where}: verified must be true/false`); bad++; }
  });
  console.log(`${f}: ${data.length} entr${data.length === 1 ? "y" : "ies"}`);
}
process.exit(bad ? 1 : 0);
