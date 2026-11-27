#!/usr/bin/env bash
# Copie le site statique dans mobile/www : c'est ce dossier que Capacitor embarque dans l'app
# (l'app marche donc hors ligne et ne dépend pas du chargement d'un site distant).
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf mobile/www && mkdir -p mobile/www
cp ./*.js ./*.css ./*.html ./*.webmanifest ./*.svg ./*.png mobile/www/
# Pas de service worker dans l'app native : les fichiers sont déjà embarqués.
rm -f mobile/www/sw.js
echo "mobile/www prêt ($(ls mobile/www | wc -l) fichiers)"
