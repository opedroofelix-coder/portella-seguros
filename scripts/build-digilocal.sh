#!/bin/sh
# Pacote para a hospedagem da DigiLocal: o mesmo build da Vercel (scripts/build-vercel.sh)
# mais os .htaccess de scripts/digilocal/, compactado em publico-digilocal.zip.
# O conteúdo do zip vai para a pasta public_html do domínio.
# A função api/avaliacoes.js só roda na Vercel: aqui o site mostra as avaliações fixas do HTML.
set -e
raiz=$(cd "$(dirname "$0")/.." && pwd)
sh "$raiz/scripts/build-vercel.sh"
cp -R "$raiz/scripts/digilocal/." "$raiz/publico/"
rm -f "$raiz/publico-digilocal.zip"
cd "$raiz/publico" && zip -qr "$raiz/publico-digilocal.zip" .
echo "publico-digilocal.zip pronto: enviar o conteúdo para public_html"
