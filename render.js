// shared by app.js (browser) and scripts/sync-config.mjs (node), so the
// prerendered html and the client render are the same markup.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const fmtDate = (d) => { const [y, m, day] = d.split("-").map(Number); return `${day} ${MONTHS[m - 1]} ${y}`; };

export function card(s) {
  const id = "ship-" + s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const fact = s.fact
    ? `<div class="ship-fact">
        <p class="fig">${esc(s.figure || "")}</p>
        <p class="fact">${esc(s.fact)}</p>
        <p class="measured">Measured ${esc(fmtDate(s.measured))}.${s.note ? " " + esc(s.note) : ""}</p>
      </div>`
    : "";
  return `<article class="ship" id="${id}">
      <div class="ship-main">
        <h3>${esc(s.name)}</h3>
        <p class="job">${esc(s.oneliner)}</p>
        <p class="go"><a class="btn" href="${esc(s.live)}" rel="noopener">Open ${esc(s.name)}</a><a href="${esc(s.repo)}" rel="noopener">Code</a></p>
      </div>
      ${fact}
    </article>`;
}

// only verified products are shown. newest first.
export const cards = (ships) =>
  ships.filter((s) => s.verified).sort((a, b) => b.date.localeCompare(a.date)).map(card).join("\n    ");

export const nextUp = (next) =>
  (next || []).map((n) => `<p class="next"><span class="next-name">${esc(n.name)}</span> <span class="next-what">${esc(n.what)}</span></p>`).join("");
