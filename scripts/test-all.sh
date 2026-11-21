#!/usr/bin/env bash
# Lance tous les contrôles de STÉROÏDE (utilisé en local et par GitHub Actions).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== Syntaxe JavaScript"
for f in *.js; do node --check "$f"; done

echo "== Fichiers indispensables"
for f in index.html app.js styles.css manifest.webmanifest; do test -s "$f"; done

echo "== Tests scripts/"
for f in scripts/*.test.cjs scripts/smoke.cjs; do
  echo "-- $f"
  node "$f"
done

echo "== Tests tests/"
node --test tests/*.test.cjs

echo "Tous les contrôles sont passés."
