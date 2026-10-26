#!/bin/sh
# Build de publicação na Vercel: monta a pasta publico/ com o site na raiz e o
# CRM de Seguros em /seguro, sem dados de teste (os dados ficam só no navegador de quem usa).
# A função api/avaliacoes.js é publicada pela própria Vercel a partir da pasta api/.
set -e
raiz=$(cd "$(dirname "$0")/.." && pwd)
saida="$raiz/publico"

rm -rf "$saida"
mkdir -p "$saida"
cp "$raiz/index.html" "$raiz/robots.txt" "$raiz/sitemap.xml" "$saida/"
cp -R "$raiz/assets" "$saida/assets"

cd "$raiz/crm"
VITE_BASE=/seguro/ npm run build -w @portella/crm-seguros
cp -R apps/crm-seguros/dist "$saida/seguro"

echo "publico/ pronto: site na raiz e CRM de Seguros em /seguro"
