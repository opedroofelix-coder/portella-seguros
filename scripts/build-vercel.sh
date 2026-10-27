#!/bin/sh
# Build de publicação na Vercel: monta a pasta publico/ com o site na raiz, a
# demonstração do CRM de Seguros em /seguro e a do CRM de Consórcio em /consorcio
# (os dados ficam só no navegador de quem abre).
# A função api/avaliacoes.js é publicada pela própria Vercel a partir da pasta api/.
set -e
raiz=$(cd "$(dirname "$0")/.." && pwd)
saida="$raiz/publico"

rm -rf "$saida"
mkdir -p "$saida"
cp "$raiz/index.html" "$raiz/robots.txt" "$raiz/sitemap.xml" "$saida/"
cp -R "$raiz/assets" "$saida/assets"

cd "$raiz/crm"
VITE_DEMO=1 VITE_BASE=/seguro/ npm run build -w @portella/crm-seguros
cp -R apps/crm-seguros/dist-demo "$saida/seguro"

VITE_DEMO=1 VITE_BASE=/consorcio/ npm run build -w @portella/crm-consorcio
cp -R apps/crm-consorcio/dist-demo "$saida/consorcio"

echo "publico/ pronto: site na raiz, CRM de Seguros em /seguro e CRM de Consórcio em /consorcio"
