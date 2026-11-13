# Social preview

## Sub-features
- `og:title`, `og:description`, `og:url`, absolute `og:image` (1200x630 `og-image.png`), twitter card.

## How to get to it (user POV)
Paste the site link in a chat or post. The card shows the share image and tagline.

## Driving it with Playwright
Read the meta tags in the page and compare with `site.config.json`; fetch the og:image and check its size is 1200x630.

## Gotchas
- `scripts/sync-config.mjs` owns the meta block. Edit the config, then run it, instead of editing the tags by hand.
