#!/bin/sh
# greps the project (case-insensitive) for strings that must never ship.
# the list lives in .identity-denylist (one string per line, gitignored) so the
# forbidden strings themselves never end up in the repo. git metadata is excluded
# on purpose: commit authorship is checked separately before any push.
cd "$(dirname "$0")/.." || exit 2
LIST=.identity-denylist
[ -f "$LIST" ] || { echo "no $LIST found; create it locally (one forbidden string per line)"; exit 2; }
n=$(grep -c . "$LIST")
# 1) every file in the working tree (tracked or not), text and binary
tree=$(grep -rniaF -f "$LIST" --exclude="$LIST" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | cut -c1-200)
# 2) exactly what git would publish
tracked=""
if git rev-parse --git-dir >/dev/null 2>&1; then
  tracked=$(git ls-files -z | xargs -0 grep -liaF -f "$LIST" 2>/dev/null)
fi
if [ -n "$tree$tracked" ]; then echo "IDENTITY LEAK:"; [ -n "$tree" ] && echo "$tree"; [ -n "$tracked" ] && echo "tracked: $tracked"; exit 1; fi
echo "identity check: clean ($n patterns, case-insensitive, 0 hits in working tree + $(git ls-files | wc -l | tr -d ' ') tracked files)"
