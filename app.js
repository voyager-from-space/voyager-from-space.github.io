// voyager probe console — a tiny fake shell over two json files. no deps, no trackers.
(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const out = $("#out"), input = $("#cmd"), body = $("#term-body");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const params = new URLSearchParams(location.search);
  const EXAMPLE = params.get("ships") === "example";
  const SHIPS_FILE = EXAMPLE ? "ships.example.json" : "ships.json";
  const TZ = "Asia/Kolkata";

  let cfg = null, ships = [];
  const history = []; let hIdx = 0;

  // ---------- helpers ----------
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const safeUrl = (u) => { try { const x = new URL(u, location.href); return /^https?:$/.test(x.protocol) ? x.href : null; } catch { return null; } };
  const pad = (n, w = 3) => String(n).padStart(w, "0");
  const tx = (i) => "TX-" + pad(i);
  const todayIST = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date()); // yyyy-mm-dd
  const daysUntil = (iso) => Math.round((Date.parse(iso + "T00:00:00Z") - Date.parse(todayIST() + "T00:00:00Z")) / 864e5);
  const fmtDate = (iso) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "short" }).toLowerCase().replace(",", "");
  const eta = (iso) => { const n = daysUntil(iso); return n > 1 ? `in ${n}d` : n === 1 ? "tomorrow" : n === 0 ? "today" : "overdue"; };
  const met = () => { const n = -daysUntil(cfg.missionStart); return n < 0 ? `T${n}d` : `T+${n}d`; }; // mission elapsed time
  const plainName = () => cfg.name.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, "").trim();
  const host = (u) => u.replace(/^https?:\/\//, "");

  // a line is an array of parts: [text, cls], plain string, or a DOM node
  function print(parts, cls) {
    const ln = el("div", "ln" + (cls ? " " + cls : ""));
    (Array.isArray(parts) ? parts : [[parts]]).forEach((p) => {
      if (p instanceof Node) return ln.append(p);
      const [t, c] = Array.isArray(p) ? p : [p];
      ln.append(c ? el("span", c, t) : document.createTextNode(t));
    });
    out.append(ln);
    body.scrollTop = body.scrollHeight;
    return ln;
  }
  const blank = () => print("");
  const link = (label, href) => { const a = el("a", null, label); a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer"; return a; };
  const runBtn = (cmd) => { const b = el("button", "inline", cmd); b.type = "button"; b.addEventListener("click", () => type(cmd)); return b; };

  // ---------- commands ----------
  const FILES = { "about.txt": "about", "mission.log": "log", "next.tx": "next", "links.txt": "links" };

  const cmds = {
    help() {
      print([["probe console · commands", "hot"]]);
      [
        ["ls", "list files on board"], ["cat <file>", "read one (about, log, next, links)"],
        ["log [tag]", "the mission log, optionally by tag"], ["tags", "what kinds of things ship"],
        ["open <n>", "open transmission #n live"], ["next", "what's planned (not shipped)"],
        ["ping earth", "check the uplink"], ["x", "open the x account"], ["gh", "open the source on github"], ["whoami", "who's out here"],
        ["theme", "amber | ice"], ["clear", "wipe the screen"],
      ].forEach(([c, d]) => print([[c.padEnd(12), "ok"], [d, "dim"]]));
      print([["a couple of commands aren't listed. space is big; look around.", "faint"]]);
    },
    ls() { print(Object.keys(FILES).map((f, i) => [f + (i < 3 ? "   " : ""), f.endsWith(".log") ? "hot" : null])); },
    cat(args) {
      const f = (args[0] || "").replace(/^\.\//, "");
      if (!f) return print([["usage: cat <file>   try ", "dim"], runBtn("cat about")]);
      const key = FILES[f] || Object.entries(FILES).find(([k]) => k.split(".")[0] === f)?.[1] || (f === "ships" ? "log" : null);
      if (!key) return print([[`cat: ${f}: no such file. `, "err"], ["try ", "dim"], runBtn("ls")]);
      ({ about, log: cmds.log, next: cmds.next, links })[key]([]);
    },
    log(args) {
      const tag = args.join(" ").toLowerCase().replace(/^--?tag\s*/, "");
      if (EXAMPLE) print([["# reading ships.example.json — fake test data", "err"]]);
      if (!ships.length) {
        print([[met() + "  ", "faint"], ["no transmissions yet.", "hot"], [" first one lands soon.", "dim"]]);
        const n = cfg.next.find((x) => daysUntil(x.date) >= 0);
        if (n) print([["next up: ", "faint"], [n.name, "hot"], [` (${fmtDate(n.date)}, ${eta(n.date)}) — planned, not shipped.`, "faint"]]);
        return;
      }
      const list = ships.map((s, i) => [s, i]).filter(([s]) => !tag || (s.category || "").toLowerCase() === tag);
      if (!list.length) return print([[`no transmissions tagged "${tag}" yet. `, "dim"], runBtn("tags")]);
      list.forEach(([s, i]) => {
        print([[tx(i + 1) + " ", "faint"], [s.date + "  ", "dim"], [s.name, "hot"], [s.category ? `  <${s.category}>` : "", "dim"], ["  "], s.verified ? ["[verified]", "ok"] : ["[unverified]", "err"]]);
        print([["       " + (s.oneliner || ""), "dim"]]);
      });
      print([["open <n> to launch one.", "faint"]]);
    },
    tags() {
      const count = (c) => ships.filter((s) => (s.category || "") === c).length;
      print([["tags (count):", "dim"]]);
      cfg.categories.forEach((c) => print([["  " + c.padEnd(10), "hot"], [String(count(c)), "dim"], ["   "], runBtn("log " + c)]));
    },
    open(args) {
      const n = parseInt(String(args[0] || "").replace(/^tx-?/i, ""), 10);
      if (!ships.length) return print([["nothing to open yet. no transmissions.", "dim"]]);
      if (!n || n < 1 || n > ships.length) return print([[`usage: open <1-${ships.length}>`, "err"]]);
      const u = safeUrl(ships[n - 1].live);
      if (!u) return print([["that transmission has no live url.", "err"]]);
      print([["opening ", "dim"], link(u, u)]);
      window.open(u, "_blank", "noopener");
    },
    next() {
      print([["planned. not shipped. dates can slip; the log can't.", "err"]]);
      cfg.next.forEach((x) => {
        print([[fmtDate(x.date).padEnd(12), "dim"], [x.name, "hot"], [x.category ? `  <${x.category}>` : "", "dim"], [`  ${eta(x.date)}`, "faint"]]);
        print([["            " + x.what, "dim"]]);
      });
    },
    ping(args) {
      const target = (args[0] || "earth").toLowerCase();
      if (target !== "earth") return print([[`ping: ${target}: no route. the only ground station is earth.`, "err"]]);
      print([["PING earth (dsn uplink): 56 bytes of chai-powered data", "dim"]]);
      const rows = [["seq=1", "rtt=44h 02m"], ["seq=2", "rtt=44h 02m"], ["seq=3", "rtt=44h 03m (drifting)"]];
      const go = (i) => {
        if (i < rows.length) { print([["64 bytes from earth: ", "dim"], [rows[i][0] + " ", "faint"], [rows[i][1], "ok"]]); return setTimeout(() => go(i + 1), reduced ? 0 : 280); }
        print([["3 packets sent, 3 received. light is slow. shipping isn't.", "faint"]]);
      };
      go(0);
    },
    gh() {
      if (!cfg.github) return print([["no public source yet.", "dim"]]);
      print([["opening ", "dim"], link(host(cfg.github), cfg.github)]); window.open(cfg.github, "_blank", "noopener");
    },
    x() { print([["opening ", "dim"], link(host(cfg.x), cfg.x)]); window.open(cfg.x, "_blank", "noopener"); },
    whoami() {
      print([[cfg.name, "hot"], [`  (${cfg.handle})`, "dim"]]);
      print([["origin: ", "faint"], ["unlisted. by design.", "dim"]]);
    },
    theme(args) {
      const cur = document.documentElement.dataset.theme === "ice" ? "ice" : "amber";
      const t = ["amber", "ice"].includes(args[0]) ? args[0] : cur === "amber" ? "ice" : "amber";
      if (t === "ice") document.documentElement.dataset.theme = "ice"; else delete document.documentElement.dataset.theme;
      try { localStorage.setItem("theme", t); } catch {}
      print([["phosphor: ", "dim"], [t, "hot"]]);
    },
    clear() { out.textContent = ""; },
    // unlisted
    sudo(args) {
      if (!args.length) return print([["usage: sudo <anything>. results not guaranteed this far out.", "dim"]]);
      print([["[sudo] password for voyager: ", "dim"], ["********", "faint"]]);
      print([["voyager is not in the sudoers file. this incident will be reported to… nobody. there are no trackers out here.", "err"]]);
    },
    chai() {
      const steam = ["      (  )   (   )  )", "       ) (   )  (  (", "       ( )  (    ) )"];
      const cup = [
        "     _____________",
        "    <_____________> ___",
        "    |             |/ _ \\",
        "    |   zero-g    | | | |",
        "    |    chai     |_| | |",
        " ___|             |\\___/",
        "/    \\___________/    \\",
        "\\_____________________/",
      ];
      const lines = steam.map((s) => print([[s, "faint"]]));
      cup.forEach((s) => print([[s, "hot"]]));
      print([["brewing… adrak, elaichi, no gravity. fuel for the next transmission.", "dim"]]);
      if (!reduced) {
        let k = 0;
        const t = setInterval(() => { k++; lines.forEach((ln, i) => (ln.firstChild.textContent = (k + i) % 2 ? steam[i] : " " + steam[i].slice(0, -1))); if (k > 9) clearInterval(t); }, 260);
      }
    },
    record() {
      print([["golden record, side a, track 1:", "hot"]]);
      print([["“hello from a tiny probe. we built small things, every day, and wrote them all down.”", "dim"]]);
    },
    coffee() { print([["wrong beverage for this altitude. try ", "dim"], runBtn("chai")]); },
    exit() { print([["there is no exit. only the next transmission.", "dim"]]); },
    rm(args) { print([[args.includes("-rf") ? "rm: we launch things here, we don't delete them." : "rm: permission denied (and emotionally attached).", "err"]]); },
    echo(args) { print(args.join(" ")); },
    date() { print(new Date().toLocaleString("en-GB", { timeZone: TZ }) + " ist · " + met()); },
    history() { history.forEach((h, i) => print([[String(i + 1).padStart(4) + "  ", "faint"], h])); },
    pwd() { print("/probe/mission"); },
    hire() { print([["no résumé on board. if a transmission impressed you, dm on x: ", "dim"], runBtn("x")]); },
  };
  Object.assign(cmds, { source: cmds.gh, github: cmds.gh, ships: cmds.log, ll: cmds.ls, dir: cmds.ls, cls: cmds.clear, "?": cmds.help, about: () => about() });

  function about() { print([["# about.txt", "faint"]]); cfg.about.forEach((l) => print(l)); }
  function links() {
    print([["x       ", "dim"], link(host(cfg.x), cfg.x)]);
    if (cfg.github) print([["code    ", "dim"], link(host(cfg.github), cfg.github)]);
    print([["log     ", "dim"], link("ships.json", SHIPS_FILE)]);
  }

  function run(raw) {
    const line = raw.trim();
    print([[`${cfg.promptUser}@${cfg.promptHost}:~$ `, "ok"], [line, "hot"]], "echo");
    if (!line) return;
    history.push(line); hIdx = history.length;
    const [name, ...args] = line.split(/\s+/);
    const key = name.toLowerCase();
    const fn = Object.prototype.hasOwnProperty.call(cmds, key) ? cmds[key] : null;
    if (fn) fn(args); else print([[`${name}: command not found. `, "err"], ["try ", "dim"], runBtn("help")]);
  }

  // types the command visibly, then runs it (instant with reduced motion)
  let typing = false;
  function type(cmd) {
    if (typing) return;
    if (reduced) { run(cmd); input.value = ""; return; }
    typing = true; input.value = ""; let i = 0;
    const t = setInterval(() => {
      input.value = cmd.slice(0, ++i);
      if (i >= cmd.length) { clearInterval(t); setTimeout(() => { run(cmd); input.value = ""; typing = false; }, 90); }
    }, 28);
  }

  // ---------- static panels ----------
  function renderTelemetry() {
    const w = 30, row = (k, v) => `${k} ${".".repeat(Math.max(2, w - k.length - String(v).length - 2))} ${v}`;
    const verified = ships.filter((s) => s.verified).length;
    const last = ships.length ? ships[ships.length - 1].date : "—";
    $("#receipt").textContent = [
      "TELEMETRY".padEnd(w - 6) + (EXAMPLE ? "SAMPLE" : ""),
      "-".repeat(w),
      row("mission clock", met()),
      row("transmissions", ships.length),
      row("verified", verified),
      row("last tx", last),
      row("résumé", "n/a"),
      row("fuel", "chai"),
      "-".repeat(w),
      "receipts only. no refunds",
      "on bad ideas.",
    ].join("\n");
  }

  function renderNext() {
    const ol = $("#next-list"); ol.textContent = "";
    cfg.next.forEach((x) => {
      const li = el("li");
      const n = el("span", "n", x.name); if (x.category) n.append(el("span", "cat", x.category));
      li.append(el("span", "d", fmtDate(x.date).replace(/^\w+ /, "")), n);
      const w = el("span", "w", x.what + " "); w.append(el("span", "eta", `· ${eta(x.date)}`));
      li.append(w); ol.append(li);
    });
  }

  function renderLog() {
    const box = $("#log"); box.textContent = "";
    $("#log-src").textContent = "source: " + SHIPS_FILE;
    if (!ships.length) {
      const e = el("div", "empty");
      e.append(el("p", "big", "no transmissions yet."), el("p", null, `mission clock ${met()}. first one lands soon. nothing gets logged until it's live.`));
      return box.append(e);
    }
    ships.slice().reverse().forEach((s, ri) => {
      const i = ships.length - ri;
      const row = el("article", "entry");
      const nm = el("span", "nm", s.name); if (s.category) nm.append(el("span", "cat", s.category));
      row.append(el("span", "no", tx(i)), el("span", "dt", s.date), nm,
        el("span", "st " + (s.verified ? "v" : "u"), s.verified ? "verified" : "unverified"),
        el("span", "one", s.oneliner || ""));
      const l = el("span", "links");
      const live = safeUrl(s.live), repo = safeUrl(s.repo);
      if (live) l.append(link("live ↗", live));
      if (repo) l.append(link("source ↗", repo));
      row.append(l); box.append(row);
    });
  }

  function renderBar() {
    const n = cfg.next.find((x) => daysUntil(x.date) >= 0);
    $("#bar-stats").textContent = `transmissions: ${ships.length}` + (n ? `  ·  next: ${n.name} ${eta(n.date)}` : "") + (EXAMPLE ? "  ·  example data" : "");
    $("#met").textContent = met();
    const tick = () => ($("#clock").textContent = new Date().toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }));
    tick(); setInterval(tick, 15000);
  }

  function applyConfig() {
    const who = `${cfg.promptUser}@${cfg.promptHost}`;
    $("#name").textContent = plainName(); // emoji stays out of the pixel font; the sprite is the glyph
    $("#tagline").textContent = cfg.tagline;
    $("#bar-who").textContent = who;
    $("#ps1").textContent = who + ":~$";
    const fx = $("#foot-x"); fx.href = cfg.x; fx.textContent = host(cfg.x);
    const fg = $("#foot-gh"); if (cfg.github) { fg.href = cfg.github; fg.textContent = host(cfg.github); } else fg.remove();
    document.title = `${cfg.name} ~ mission log`;
  }

  // ---------- input ----------
  $("#prompt-form").addEventListener("submit", (e) => { e.preventDefault(); if (typing) return; run(input.value); input.value = ""; });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" && history.length) { hIdx = Math.max(0, hIdx - 1); input.value = history[hIdx]; e.preventDefault(); }
    else if (e.key === "ArrowDown") { hIdx = Math.min(history.length, hIdx + 1); input.value = history[hIdx] || ""; e.preventDefault(); }
    else if (e.key === "Tab") {
      const v = input.value; if (!v) return; e.preventDefault();
      const words = v.split(" "), last = words.pop();
      const pool = words.length ? Object.keys(FILES).concat(["about", "log", "next", "links", "earth", "ice", "amber"], cfg.categories) : ["help", "ls", "cat", "log", "tags", "open", "next", "ping", "x", "gh", "whoami", "theme", "clear"];
      const hit = pool.filter((p) => p.startsWith(last));
      if (hit.length === 1) input.value = words.concat(hit[0]).join(" ") + (words.length ? "" : " ");
      else if (hit.length > 1) print([[hit.join("   "), "dim"]]);
    } else if (e.key === "l" && e.ctrlKey) { e.preventDefault(); cmds.clear(); }
  });
  body.addEventListener("click", () => { if (!getSelection().toString()) input.focus({ preventScroll: true }); });
  document.querySelectorAll(".chips button").forEach((b) => b.addEventListener("click", () => type(b.dataset.cmd)));
  addEventListener("keydown", (e) => { if (e.key === "/" && document.activeElement !== input) { e.preventDefault(); input.focus(); } });

  // ---------- boot ----------
  async function load(path) { const r = await fetch(path, { cache: "no-cache" }); if (!r.ok) throw new Error(`${path}: ${r.status}`); return r.json(); }

  (async () => {
    try { if (localStorage.getItem("theme") === "ice") document.documentElement.dataset.theme = "ice"; } catch {}
    document.body.classList.add("booting");
    try {
      [cfg, ships] = await Promise.all([load("site.config.json"), load(SHIPS_FILE)]);
      if (!Array.isArray(ships)) throw new Error(SHIPS_FILE + " must be a json array");
    } catch (err) { print([["boot failed: " + err.message, "err"]]); return; }
    ships.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    if (EXAMPLE) $("#example-banner").hidden = false;
    applyConfig(); renderTelemetry(); renderNext(); renderLog(); renderBar();

    print([["probe-os 0.1 · uplink established · " + todayIST() + " ist · " + met(), "faint"]]);
    print([[`${ships.length} transmission${ships.length === 1 ? "" : "s"} logged.`, "dim"], ...(ships.length ? [] : [[" standing by for the first.", "hot"]])]);
    print([["type ", "dim"], runBtn("help"), [", tap a chip below, or press ", "dim"], ["/", "hot"], [" to focus.", "dim"]]);
    blank();
    if (matchMedia("(pointer: fine)").matches) input.focus({ preventScroll: true });
  })();
})();
