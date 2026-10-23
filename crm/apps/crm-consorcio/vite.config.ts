import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Demonstração (VITE_DEMO=1): caminhos relativos para rodar dentro de outra página, sem service worker.
const demo = process.env.VITE_DEMO === '1';

export default defineConfig({
  base: demo ? './' : '/',
  build: { outDir: demo ? 'dist-demo' : 'dist' },
  plugins: [
    react(),
    VitePWA({
      disable: demo,
      registerType: 'autoUpdate',
      includeAssets: ['logo.svg', 'icone.svg'],
      manifest: {
        name: 'Portella · CRM Consórcio',
        short_name: 'CRM Consórcio',
        description: 'CRM de consórcio da Portella Corretora de Seguros.',
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
  server: { port: 5174, strictPort: true },
  preview: { port: 4174 },
});
