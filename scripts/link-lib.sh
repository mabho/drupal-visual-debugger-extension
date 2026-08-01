#!/usr/bin/env bash
# Symlinks lib/ to a local drupal-visual-debugger checkout's dist/ output,
# for local development. Adjust SRC if your checkout lives elsewhere.
set -euo pipefail

SRC="${1:-/Users/mbhollanda/Projects/__imagex-labs/drupal-visual-debugger}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ ! -d "$SRC/dist" ]; then
  echo "error: $SRC/dist not found — run 'npm run build' in that checkout first." >&2
  exit 1
fi

rm -rf "$DIR/lib"
ln -s "$SRC/dist" "$DIR/lib"

echo "Linked lib -> $SRC/dist"
