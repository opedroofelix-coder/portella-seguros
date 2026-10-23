import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { abrirMais, irPara, saudacao } from './fluxos';
import { conferirLayout, LARGURAS } from './responsivo';

// Usa o modo demonstração (dados fictícios, entrada direta).
const SEGUROS = 'http://localhost:5185';
const CONSORCIO = 'http://localhost:5186';

const fundoDaPagina = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

/** Abre o menu (no celular) e escolhe o tema no rodapé dele. */
async function escolherTema(page: Page, rotulo: 'Claro' | 'Escuro' | 'Automático') {
  const capsula = await abrirMais(page);
  if (capsula) {
    await capsula.getByRole('group', { name: 'Tema' }).getByRole('button', { name: rotulo }).click();
    return;
  }
  const abrir = page.getByRole('button', { name: 'Abrir menu' });
  if (await abrir.isVisible()) await abrir.click();
  const menu = page.getByRole('complementary', { name: 'Menu principal' });
  await menu.getByRole('group', { name: 'Tema' }).getByRole('button', { name: rotulo }).click();
}

for (const tela of LARGURAS) {
  test.describe(`Tema — ${tela.nome} (${tela.width}px)`, () => {
    test.use({ viewport: { width: tela.width, height: tela.height } });

    test('começa no claro, troca para o escuro e continua escuro depois de recarregar', async ({ page }) => {
      test.setTimeout(90_000);
      await page.goto(SEGUROS);
      await expect(page.getByRole('heading', { name: saudacao('Administradora') })).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.locator('html')).toHaveAttribute('data-tema', 'claro');
      const claro = await fundoDaPagina(page);

      await escolherTema(page, 'Escuro');
      await expect(page.locator('html')).toHaveAttribute('data-tema', 'escuro');
      // Com o menu aberto no celular, os botões do rodapé também precisam ter 44 px.
      await conferirLayout(page, tela.width);
      expect(await fundoDaPagina(page)).not.toBe(claro);

      await page.reload();
      await expect(page.getByRole('heading', { name: saudacao('Administradora') })).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.locator('html')).toHaveAttribute('data-tema', 'escuro');

      // Telas principais no escuro, sem rolagem horizontal
      for (const rotulo of ['Propostas', 'Painel de produção', 'Relatórios', 'Financeiro', 'Minha conta']) {
        await irPara(page, rotulo);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await conferirLayout(page, tela.width);
      }
      // Minha conta também tem o seletor, sincronizado com o do menu
      const conta = page.getByRole('main').getByRole('group', { name: 'Tema' });
      await expect(conta.getByRole('button', { name: 'Escuro' })).toHaveAttribute('aria-pressed', 'true');
      await conta.getByRole('button', { name: 'Automático' }).click();
      await expect(page.locator('html')).not.toHaveAttribute('data-tema', /.*/);
      await conta.getByRole('button', { name: 'Claro' }).click();
      await expect(page.locator('html')).toHaveAttribute('data-tema', 'claro');
    });

    test('Automático segue o modo escuro do aparelho', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.addInitScript(() => localStorage.setItem('portella-crm:tema', 'auto'));
      await page.goto(CONSORCIO);
      await expect(page.getByRole('heading', { name: saudacao('Administradora') })).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.locator('html')).not.toHaveAttribute('data-tema', /.*/);
      const escuro = await fundoDaPagina(page);
      await page.emulateMedia({ colorScheme: 'light' });
      expect(await fundoDaPagina(page)).not.toBe(escuro);
      await conferirLayout(page, tela.width);
    });
  });
}
