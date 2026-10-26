import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Demonstração (VITE_DEMO=1): caminhos relativos para rodar dentro de outra página, sem service worker.
const demo = process.env.VITE_DEMO === '1';
// Publicado numa subpasta do site (ex.: /seguro/): o manifesto do app instalável usa a raiz, então fica sem.
const subpasta = (process.env.VITE_BASE ?? '/') !== '/';

export default defineConfig({
  // VITE_BASE fixa o caminho de publicação (ex.: /seguro/ no site, ver scripts/build-vercel.sh).
  base: process.env.VITE_BASE ?? (demo ? './' : '/'),
  build: { outDir: demo ? 'dist-demo' : 'dist' },
  plugins: [
    react(),
    VitePWA({
      disable: demo || subpasta,
      registerType: 'autoUpdate',
      includeAssets: ['logo.svg', 'icone.svg'],
      manifest: {
        name: 'Portella · CRM Seguros',
        short_name: 'CRM Seguros',
        description: 'CRM de seguros da Portella Corretora de Seguros.',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        background_color: '#0F1E3C',
        theme_color: '#0F1E3C',
        icons: [
          { src: '/icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: { port: 5173, strictPort: true },
  preview: { port: 4173 },
});
