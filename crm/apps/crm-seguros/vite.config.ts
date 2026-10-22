import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
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
