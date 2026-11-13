# Mission log

## Sub-features
- Next launch card (dashed, "Planned, not shipped"), launched cards newest first with mission number, date, category, Verified/Unverified, Live site and Code links, empty state, example data banner.

## How to get to it (user POV)
Click "Mission log" in the nav or scroll to it.

## Driving it with Playwright
Default load shows the real `ships.json`. `?ships=example` shows 2 fake launches and `#example-banner`. Route `ships.json` to `[]` to see `#empty` with "Mission 001 goes up on 16 Nov 2026".

## Gotchas
- Mission numbers come from date order. Planned launches are numbered after shipped ones.
- Never put example data in `ships.json`.
