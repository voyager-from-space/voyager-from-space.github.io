#!/bin/sh
# builds voyager.css (fonts + core [+ tool]) and copies it into every site.
# run from the portfolio repo: sh design/sync.sh
set -e
cd "$(dirname "$0")"
ROOT=${ROOT:-..}/..    # sibling repos live next to the portfolio repo
{ cat faces.css voyager.core.css; } > /tmp/voyager.base.css
{ cat /tmp/voyager.base.css voyager.tool.css; } > /tmp/voyager.tool.full.css
cp /tmp/voyager.base.css ../public/voyager.css
for s in texdiet papershed blindsanitize; do
  [ -d "$ROOT/$s/site" ] && cp /tmp/voyager.tool.full.css "$ROOT/$s/site/voyager.css" && echo "synced $s"
done
echo "synced portfolio"
