#!/bin/sh
# Build de publicação na Vercel: monta a pasta publico/ com o site na raiz, o CRM de
# Seguros em /seguro (dados no Supabase, ver crm/apps/crm-seguros/.env.production) e a
# demonstração do CRM de Consórcio em /consorcio (dados só no navegador de quem abre).
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

VITE_DEMO=1 VITE_BASE=/consorcio/ npm run build -w @portella/crm-consorcio
cp -R apps/crm-consorcio/dist-demo "$saida/consorcio"

echo "publico/ pronto: site na raiz, CRM de Seguros (Supabase) em /seguro e demonstração do Consórcio em /consorcio"
