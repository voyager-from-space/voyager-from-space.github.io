---
name: verify-portfolio
description: Drive the voyager portfolio (static site in public/, served at https://voyager-from-space.github.io) in headless Chromium and prove the hero, mission log, manifesto, links, social preview, accessibility and identity rules hold. Use after any change to public/ or the config, and before every push to main/gh-pages.
---

# verify portfolio

The only surface is the browser. `public/` is the whole site. No build step.

## Launch

- Deps: `npm install` (Playwright; Chromium is cached on the box).
- Local: `node scripts/verify.mjs`. It starts `python3 -m http.server 4173 --bind 127.0.0.1 --directory public` itself, waits 800 ms and kills it at the end. Ready means `#ships .list-h` has rendered.
- Live: `BASE_URL=https://voyager-from-space.github.io/ node scripts/verify.mjs`. No server is started. A `cb=` query defeats the Pages CDN cache.

## Doctor

`curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4173/ships.json` while serving, or the live URL plus `ships.json`. Expect 200. If port 4173 is busy with something you did not start, do not kill it; stop and report.

## Drive

Stable handles in `public/index.html` and `public/app.js`:
- `#hero-h` (h1), `.steps li` (3 steps), `section#log h2`, `section#manifesto h2`, `section#links`.
- `#next` and `#next-launch` (planned card), `#ships .mission` (launched cards), `#empty` (empty state), `.patch` (mission patch svg with `aria-label="mission patch NNN, name"`).
- `?ships=example` loads `ships.example.json` and shows `#example-banner`.
- To force the empty state, route `ships.json` to `[]` with `page.route`.

## Evidence

The script prints one PASS/FAIL line per check (48 today) and exits 1 on any failure. It checks the copy of each section, sentence case (no `text-transform: uppercase` anywhere, no "A · B" dot pattern), WCAG contrast, focus, reduced motion, no mobile overflow, no console errors, no third-party requests, page weight, og/twitter meta against `site.config.json`, and the identity denylist against rendered text and meta.
For screenshots run `node scripts/shoot.mjs <url>` (desktop + mobile) and open every image before sharing it. Reject any that show tabs, paths, usernames or emails.

## Cleanup

The script kills the server it spawned. If a run crashes, kill only the PID of the `http.server 4173` you started. Screenshots in `screenshots/` stay.

## Helpers

- `scripts/verify.mjs`: the checks above.
- `scripts/validate.mjs`: `ships.json` shape.
- `sh scripts/check-identity.sh`: denylist grep over the tree and tracked files. Run with `git log --format='%an %ae %cn %ce' | sort -u` before every push.
- `scripts/sync-config.mjs`: regenerates the meta block from `site.config.json`.
