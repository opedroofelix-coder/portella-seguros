import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: import.meta.dirname,
  // Demonstração: caminhos relativos e saída separada.
  base: process.env.VITE_DEMO === '1' ? './' : '/',
  build: { outDir: 'dist-demo', emptyOutDir: true },
  plugins: [react()],
  server: { port: 5180, strictPort: true },
});
