# voyager · mission log

an amber deep-space telemetry console that logs one tiny product shipped every day.
static html/css/js, no build step, no backend, no trackers, fonts self-hosted.

```
public/
  index.html          page shell (meta block is generated, see "persona")
  styles.css          probe-console look; respects prefers-reduced-motion
  app.js              the fake shell + renderers
  site.config.json    persona: name, handle, x link, tagline, categories, next launch
  ships.json          THE mission log. single source of truth. starts empty.
  ships.example.json  2 fake entries for testing only. never live data.
  fonts/              VT323 + IBM Plex Mono (OFL), woff2
  avatar.png          probe sprite (title glyph); favicon-32.png + apple-touch-icon.png are resized copies
  og-image.png        1200x630 share card, built by scripts/make-og.py
scripts/
  sync-config.mjs     copies name/tagline/handle from the config into index.html meta tags
  validate.mjs        checks ships.json shape
  check-identity.sh   greps the project for strings that must never ship
  verify.mjs          playwright end-to-end check + screenshots
  make-og.py          rebuilds public/og-image.png from the config (pillow)
```

## log a transmission (add a ship)

append one object to `public/ships.json`:

```json
{
  "date": "2026-11-16",
  "name": "explain-bhai",
  "category": "dev tool",
  "oneliner": "paste a postgres EXPLAIN ANALYZE, get it explained like a friend would",
  "live": "https://...",
  "repo": "https://...",
  "verified": true
}
```

- `category` must be one of `categories` in `site.config.json` (game, web app, dev tool, cli, npm, ai, hardware, oss alt). add new ones there.
- `verified` is `true` only after the live url was actually clicked through.
- entries are sorted by date; ids (TX-001, TX-002, …) come from that order.
- run `npm run check` (shape + identity grep), commit, push. the host redeploys.

when something ships that was in `next` in `site.config.json`, remove it from `next`.

## preview with fake data

open `/?ships=example`. the page loads `ships.example.json` and shows a loud
"fake test data" banner. the default url always reads the real `ships.json`.

## persona (provisional)

name, handle, x link, prompt and tagline live only in `public/site.config.json`.
change them there, then run `npm run sync` so crawlers/og previews see the same
values, and `python3 scripts/make-og.py` to redraw the share card. set `siteUrl` once there is a domain (adds og:url + canonical and makes og:image absolute) and
`github` (already set) drives the footer link, `gh`/`source`, and `cat links`.

## run locally

```
npm run serve          # http://localhost:4173  (fetch() needs a server, file:// won't work)
npm i && npx playwright install chromium && npm run verify
```

## deploy (static, free)

the site is the `public/` folder. no build command.

- **vercel**: import the repo. `vercel.json` already sets output dir `public`, no build.
- **netlify**: import the repo. `netlify.toml` already sets publish dir `public`.
- **cloudflare pages**: framework preset none, build command empty, output dir `public`. `public/_headers` sets headers.

## shell commands

`help`, `ls`, `cat <file>`, `log [tag]`, `tags`, `open <n>`, `next`, `ping earth`, `x`, `gh`/`source`,
`whoami`, `theme amber|ice`, `clear`, plus a few unlisted ones.
keyboard: `/` focuses the console, ↑/↓ history, tab completes, ctrl+l clears.

## license

code MIT (see LICENSE). fonts OFL 1.1 (see public/fonts/FONTS-LICENSE.txt).
