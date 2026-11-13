# voyager · mission log

the site at https://voyager-from-space.github.io. an anon builder's log of small useful tools,
one launch per mission number. static html/css/js, no build step, no backend, no trackers,
fonts self-hosted.

```
public/
  index.html          the page. the meta block is generated, see "persona"
  styles.css          navy + amber + ice. all motion is off under prefers-reduced-motion
  app.js              draws the mission log and the mission patches from ships.json
  site.config.json    persona: name, handle, links, tagline, categories, next launch
  ships.json          the mission log. single source of truth. starts empty
  ships.example.json  2 fake entries for testing only. never live data
  fonts/              IBM Plex Sans + Plex Mono (OFL 1.1, see fonts/OFL.txt)
  og-image.png        1200x630 share card; favicon-32.png + apple-touch-icon.png
scripts/
  sync-config.mjs     writes the title/og/twitter meta in index.html from the config
  validate.mjs        checks ships.json shape
  check-identity.sh   greps the project for strings that must never ship
  verify.mjs          playwright end-to-end checks (BASE_URL=... for the live site)
  shoot.mjs           desktop + mobile screenshots of any url
  make-og.py          redraws og-image.png and the icons (pillow)
```

## log a launch

append one object to `public/ships.json`:

```json
{
  "date": "2026-11-16",
  "name": "texdiet",
  "category": "oss alt",
  "oneliner": "drop your latex project zip, see why it blows the free 10s compile limit, get a lighter zip back.",
  "live": "https://...",
  "repo": "https://...",
  "verified": true
}
```

- `category` must be one of `categories` in `site.config.json`.
- `verified` is `true` only after the live url was actually clicked through.
- mission numbers come from date order: the oldest launch is 001.
- when a launch from `next` ships, remove it from `next`.
- run `npm run check` (shape + identity grep) and `npm run verify`, commit, push.

`/?ships=example` loads `ships.example.json` with a "fake test data" banner.

## persona

name, handle, links and tagline live in `public/site.config.json`. after a change run
`npm run sync` (meta tags) and `python3 scripts/make-og.py` (share card).

## run locally

```
npm run serve     # http://localhost:4173 (fetch() needs a server)
npm run verify    # needs playwright + chromium
```

## deploy

github pages serves the `gh-pages` branch, which is `public/` split out:

```
git subtree split --prefix public -b gh-pages-new && git push origin gh-pages-new:gh-pages --force
```

## license

code MIT (see LICENSE). fonts OFL 1.1 (see public/fonts/OFL.txt).
