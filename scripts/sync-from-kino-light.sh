#!/usr/bin/env bash
# Brings this site up to date with Kino's own repository (kinotvapp/kino-light), where the plugin
# contract is tested against the app's code.
#
#   scripts/sync-from-kino-light.sh [path/to/kino-light]           # sync, report what needs a human
#   scripts/sync-from-kino-light.sh [path/to/kino-light] --accept  # also record the upstream guide as ported
#
# What it does:
#   1. Copies docs/plugins/contract.json and docs/plugins/kino.d.ts verbatim to docs/reference/.
#   2. Regenerates the <!-- contract:NAME --> tables of the English pages (docs/*.en.md) with
#      kino-light's own plugins/sdk/guide-tables.mjs, so their numbers are the app's numbers.
#   3. Compares kino-light's docs/plugins/README.md (the upstream English guide) with the version
#      recorded in scripts/upstream.lock. If it changed, prints the upstream diff and exits 3: port
#      that change by hand to the English page AND its Spanish twin, then run again with --accept.
#   4. If contract.json changed, lists the Spanish pages whose tables are hand-translated copies of
#      the generated ones, to be updated by hand.
#
# Needs git and Node 18+. Changes only files inside this repository; never touches kino-light.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KINO="${1:-${KINO_LIGHT:-$HOME/kino-light}}"
ACCEPT="${2:-}"
[ "$KINO" = "--accept" ] && { ACCEPT="--accept"; KINO="${KINO_LIGHT:-$HOME/kino-light}"; }
LOCK="$ROOT/scripts/upstream.lock"
SRC="$KINO/docs/plugins"

[ -f "$SRC/README.md" ] || { echo "No kino-light checkout at $KINO (missing docs/plugins/README.md)" >&2; exit 1; }
command -v node >/dev/null || { echo "Node 18+ is needed" >&2; exit 1; }

# 1. Reference files.
contract_changed=0
cmp -s "$SRC/contract.json" "$ROOT/docs/reference/contract.json" || contract_changed=1
cp "$SRC/contract.json" "$ROOT/docs/reference/contract.json"
cp "$SRC/kino.d.ts" "$ROOT/docs/reference/kino.d.ts"
echo "copied contract.json and kino.d.ts from $(git -C "$KINO" rev-parse --short HEAD)"

# 2. Generated tables in the English pages.
for page in "$ROOT"/docs/*.en.md "$ROOT"/docs/*/*.en.md; do
  [ -f "$page" ] || continue
  if grep -q '<!-- contract:' "$page"; then
    node "$KINO/plugins/sdk/guide-tables.mjs" "$page"
    echo "tables regenerated: ${page#"$ROOT/"}"
  fi
done

# 3. Upstream prose.
status=0
current_sha="$(git -C "$KINO" log -1 --format=%H -- docs/plugins/README.md)"
recorded_sha="$(sed -n 's/^readme_commit=//p' "$LOCK" 2>/dev/null || true)"
if [ "$current_sha" != "$recorded_sha" ]; then
  if [ "$ACCEPT" = "--accept" ]; then
    printf 'readme_commit=%s\n' "$current_sha" > "$LOCK"
    echo "recorded upstream README at ${current_sha:0:8} as ported"
  else
    echo
    echo "Upstream guide changed since ${recorded_sha:0:8}: port this to docs/<page>.en.md and docs/<page>.md,"
    echo "then run again with --accept."
    echo
    git -C "$KINO" --no-pager diff "${recorded_sha:-HEAD~1}" "$current_sha" -- docs/plugins/README.md || true
    status=3
  fi
else
  echo "upstream guide unchanged (${current_sha:0:8})"
fi

# 4. Hand-translated tables.
if [ "$contract_changed" = 1 ]; then
  echo
  echo "contract.json changed: check the translated tables in docs/manifest.md (settings),"
  echo "docs/contract.md (errors), docs/kino-api.md (fetch errors, crypto) and"
  echo "docs/engine-limits.md (limits) against their English twins."
  [ "$status" = 0 ] && status=4
fi

exit "$status"
