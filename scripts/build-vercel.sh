#!/bin/sh
# Build de publicação na Vercel: monta a pasta publico/ com o site na raiz e a
# demonstração do CRM de Seguros em /seguro (dados fictícios, nada sai do navegador).
# A função api/avaliacoes.js é publicada pela própria Vercel a partir da pasta api/.
set -e
raiz=$(cd "$(dirname "$0")/.." && pwd)
saida="$raiz/publico"

rm -rf "$saida"
mkdir -p "$saida"
cp "$raiz/index.html" "$saida/"
cp -R "$raiz/assets" "$saida/assets"

cd "$raiz/crm"
VITE_DEMO=1 VITE_BASE=/seguro/ npm run build -w @portella/crm-seguros
cp -R apps/crm-seguros/dist-demo "$saida/seguro"

echo "publico/ pronto: site na raiz e CRM de Seguros (demonstração) em /seguro"
