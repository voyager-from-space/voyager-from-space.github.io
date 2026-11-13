# Hero and how it works

## Sub-features
- h1 statement, lede, "See the mission log" button, "Follow @voyagerships" link, record artwork, three steps.

## How to get to it (user POV)
Open https://voyager-from-space.github.io. The hero fills the first screen.

## Driving it with Playwright
Read `#hero-h` text, click `.btn` and expect `#log` to scroll into view, count `.steps li` (3) and read `.steps h3` ("Mission numbers|Open code|Raw numbers").

## Gotchas
- Copy is sentence case. The verify script fails on any `text-transform: uppercase` element and on the middle-dot pattern.
- The record spins only without `prefers-reduced-motion`.
