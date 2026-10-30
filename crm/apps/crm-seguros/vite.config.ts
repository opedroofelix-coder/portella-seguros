import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Demonstração (VITE_DEMO=1): caminhos relativos para rodar dentro de outra página, sem service worker.
const demo = process.env.VITE_DEMO === '1';
// Publicado num caminho fixo (ex.: /seguro/ no site): vira aplicativo instalável (PWA), mesmo na demonstração.
const base = process.env.VITE_BASE ?? (demo ? './' : '/');
const instalavel = !demo || Boolean(process.env.VITE_BASE);

export default defineConfig({
  // VITE_BASE fixa o caminho de publicação (ex.: /seguro/ no site, ver scripts/build-vercel.sh).
  base,
  build: { outDir: demo ? 'dist-demo' : 'dist' },
  plugins: [
    react(),
    VitePWA({
      disable: !instalavel,
      // A versão nova baixa sozinha e entra quando o aplicativo é aberto de novo.
      registerType: 'autoUpdate',
      includeAssets: [
        'logo.svg',
        'icone.svg',
        'marca-icone.svg',
        'marca-nome-marinho.svg',
        'marca-nome-marfim.svg',
      ],
      manifest: {
        id: base,
        name: 'Portella · CRM Seguros',
        short_name: 'CRM Seguros',
        description: 'CRM de seguros da Portella Corretora de Seguros.',
        lang: 'pt-BR',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#F3F1EC',
        theme_color: '#1A2B4B',
        // Relativos ao manifesto: funcionam na raiz e em /seguro/.
        icons: [
          { src: 'icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // As fontes vêm do Google Fonts; o resto do app fica guardado para abrir rápido.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  server: { port: 5173, strictPort: true },
  preview: { port: 4173 },
});
