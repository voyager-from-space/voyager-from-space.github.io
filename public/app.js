// renders the mission log from ships.json (or ships.example.json with ?ships=example).
// everything else on the page is static html.
const example = new URLSearchParams(location.search).get("ships") === "example";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const pad = (n) => String(n).padStart(3, "0");
const day = (iso) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// a circular mission patch: number in the middle, "voyager" on the top arc, the ship name on the bottom arc.
function patch(n, name, planned) {
  const id = `p${n}${planned ? "n" : ""}`;
  const ring = planned ? "#5f7194" : "#ffb547";
  const label = name.toUpperCase().slice(0, 22);
  const fs = Math.min(10, (118 / label.length - 1.2) / 0.6).toFixed(1); // shrink long names so they fit the bottom arc
  return `<svg class="patch" viewBox="0 0 120 120" role="img" aria-label="mission patch ${pad(n)}, ${esc(name)}${planned ? ", planned" : ""}">
  <defs><path id="${id}t" d="M18 60 A42 42 0 0 1 102 60"/><path id="${id}b" d="M14 60 A46 46 0 0 0 106 60"/></defs>
  <circle cx="60" cy="60" r="57" fill="#0c1322" stroke="${ring}" stroke-width="2"${planned ? ' stroke-dasharray="4 4"' : ""}/>
  <circle cx="60" cy="60" r="30" fill="none" stroke="#9fd3ee" stroke-opacity=".35"/>
  <ellipse cx="60" cy="60" rx="44" ry="12" fill="none" stroke="#9fd3ee" stroke-opacity=".3" transform="rotate(-18 60 60)"/>
  <text font-family="Plex Mono, monospace" font-size="10" letter-spacing="2.5" fill="#9ba7bf"><textPath href="#${id}t" startOffset="50%" text-anchor="middle">VOYAGER</textPath></text>
  <text font-family="Plex Mono, monospace" font-size="${fs}" letter-spacing="1.2" fill="#e8edf6"><textPath href="#${id}b" startOffset="50%" text-anchor="middle" dominant-baseline="hanging">${esc(label)}</textPath></text>
  <text x="60" y="67" text-anchor="middle" font-family="Plex Mono, monospace" font-size="22" fill="${planned ? "#e8edf6" : "#ffb547"}">${pad(n)}</text>
</svg>`;
}

function card(s, n, planned) {
  const status = planned ? `<span class="status planned">Planned, not shipped</span>`
    : s.verified ? `<span class="status ok">Verified</span>` : `<span class="status unverified">Unverified</span>`;
  const links = planned ? "" : `${s.live ? `<a href="${esc(s.live)}" rel="noopener">Live site</a>` : ""}${s.repo ? `<a href="${esc(s.repo)}" rel="noopener">Code</a>` : ""}`;
  return `<article class="mission${planned ? " next" : ""}"${planned ? ' id="next-launch"' : ""}>
  ${patch(n, s.name, planned)}
  <div>
    <p class="meta"><span>Mission ${pad(n)}</span><span>${planned ? "Launches " : ""}${day(s.date)}</span>${s.category ? `<span>${esc(s.category)}</span>` : ""}</p>
    <h3>${esc(s.name)}</h3>
    <p>${esc(s.oneliner ?? s.what)}</p>
    <p class="go">${status}${links}</p>
  </div>
</article>`;
}

const emptyState = (cfg) => `<div class="empty" id="empty">
  <svg viewBox="0 0 72 72" aria-hidden="true"><ellipse cx="36" cy="36" rx="32" ry="11" fill="none" stroke="#9fd3ee" stroke-opacity=".5" stroke-dasharray="2 4" transform="rotate(-18 36 36)"/><circle cx="36" cy="36" r="9" fill="none" stroke="#ffb547" stroke-width="1.5"/></svg>
  <p class="big">No launches yet.</p>
  <p>Mission 001 goes up on ${day(cfg.missionStart)}. It lands here once it's live and I've clicked through it myself.</p>
</div>`;

async function main() {
  const src = example ? "ships.example.json" : "ships.json";
  const [cfg, ships] = await Promise.all([fetch("site.config.json").then((r) => r.json()), fetch(src, { cache: "no-cache" }).then((r) => r.json())]);
  if (example) {
    document.getElementById("example-banner").hidden = false;
    const a = document.getElementById("log-src"); a.textContent = src; a.href = src;
  }
  const sorted = [...ships].sort((a, b) => a.date.localeCompare(b.date));
  const nums = new Map(sorted.map((s, i) => [s, i + 1]));
  const next = (cfg.next ?? []).map((s, i) => card(s, sorted.length + i + 1, true)).join("");
  document.getElementById("next").innerHTML = next ? `<h3 class="list-h">Next launch</h3>${next}` : "";
  document.getElementById("ships").innerHTML = `<h3 class="list-h">Launched</h3>` +
    (sorted.length ? sorted.slice().reverse().map((s) => card(s, nums.get(s), false)).join("") : emptyState(cfg));
}
main().catch((e) => {
  document.getElementById("ships").innerHTML = `<p class="sub">Couldn't load the log. The raw file is at <a href="ships.json">ships.json</a>.</p>`;
  console.error(e);
});
