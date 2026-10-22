import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

// No ambiente de nuvem o Chromium já vem instalado; localmente o Playwright usa o próprio.
const chromium = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const todos = [
  { nome: 'catalogo', comando: 'npm run catalogo', porta: 5180 },
  { nome: 'seguros', comando: 'npm run dev:seguros', porta: 5173 },
  { nome: 'consorcio', comando: 'npm run dev:consorcio', porta: 5174 },
];
const filtro = process.env.E2E_SERVIDORES?.split(',');
const servidores = filtro ? todos.filter((s) => filtro.includes(s.nome)) : todos;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  timeout: 60_000,
  use: {
    locale: 'pt-BR',
    launchOptions: existsSync(chromium) ? { executablePath: chromium } : {},
  },
  // E2E_SERVIDORES=catalogo,seguros sobe só os servidores informados (padrão: todos).
  webServer: servidores.map(({ comando, porta }) => ({
    command: comando,
    url: `http://localhost:${porta}`,
    reuseExistingServer: true,
  })),
});
