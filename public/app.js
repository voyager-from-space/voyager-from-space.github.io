// the page ships prerendered. this re-renders from ships.json so a data-only push is enough.
import { cards, nextUp } from "./render.js";
const q = new URLSearchParams(location.search);
const file = q.get("ships") === "example" ? "ships.example.json" : "ships.json";
try {
  const [ships, cfg] = await Promise.all([
    fetch(file, { cache: "no-cache" }).then((r) => r.json()),
    fetch("site.config.json", { cache: "no-cache" }).then((r) => r.json()),
  ]);
  document.getElementById("ships").innerHTML = cards(ships);
  document.getElementById("next").innerHTML = nextUp(cfg.next);
  document.getElementById("example-banner").hidden = file === "ships.json";
} catch (e) {
  console.error(e);
}
