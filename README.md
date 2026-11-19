# voyager portfolio

The one-pager at https://voyager-from-space.github.io. Free, in-browser tools, one card each.
Static HTML, CSS and JS. No backend, no trackers, no analytics. Fonts are self-hosted.

```
public/
  index.html          the page. three marked blocks are generated, see "sync"
  styles.css          navy, amber, ice. motion is off under prefers-reduced-motion
  render.js           card markup, shared by the browser and sync-config.mjs
  app.js              re-renders the cards from ships.json in the browser
  site.config.json    name, handle, links, tagline, "Building now" lines
  ships.json          the product list. the single source of truth
  ships.example.json  one fake entry showing every field, test only. open /?ships=example
  fonts/              IBM Plex Sans and Mono woff2 (OFL 1.1, see fonts/OFL.txt)
  og-image.png        1200x630 share card, plus favicon-32.png and apple-touch-icon.png
scripts/
  sync-config.mjs     writes the meta tags, the cards and the next lines into index.html
  validate.mjs        checks the shape of ships.json
  check-identity.sh   greps the project for strings that must never ship
  verify.mjs          Playwright checks, desktop and mobile (BASE_URL=... for the live site)
  make-og.py          redraws og-image.png and the icons (Pillow)
```

## add a product

Add one object to `public/ships.json`, then run `npm run sync` so the no-JS html matches.
The browser draws the cards from `ships.json` on its own, so the page is correct as soon as the file is pushed.

```json
{
  "date": "2026-11-19",
  "name": "maketitle",
  "oneliner": "The job it does, in one sentence.",
  "figure": "4.76 s",
  "fact": "One measured fact, with what was measured.",
  "measured": "2026-11-19",
  "note": "Optional. One caveat a reader should know.",
  "live": "https://...",
  "repo": "https://...",
  "verified": true
}
```

- `date` only sets the order, newest first.
- `figure` is the short number shown large. `fact` says what it measures. `measured` is the day you measured it.
- Only `verified: true` entries are shown, and they need a `fact`. Set it after you click through the live link.
- When a product leaves "Building now", remove it from `next` in `site.config.json`.
- Run `npm run check` (shape plus identity grep), then `CHROME_PATH=/usr/bin/google-chrome npm run verify` if Playwright has no browser of its own.

## sync

`npm run sync` rewrites three marked blocks in `index.html` from `site.config.json` and `ships.json`:
title and share meta, one card per verified product, and the "Building now" lines.

## deploy

GitHub Pages serves the `gh-pages` branch, which is `public/` split out:

```
git subtree split --prefix public -b gh-pages-new && git push origin gh-pages-new:gh-pages --force
```

## license

Code MIT (see LICENSE). Fonts OFL 1.1 (see public/fonts/OFL.txt).
