import { expect, test } from '@playwright/test';
import { conferirLayout, LARGURAS } from './responsivo';

const URL = 'http://localhost:5180';

for (const tela of LARGURAS) {
  test.describe(`catálogo de componentes — ${tela.nome} (${tela.width}px)`, () => {
    test.use({ viewport: { width: tela.width, height: tela.height } });

    test('layout sem rolagem horizontal e com alvos de toque adequados', async ({ page }) => {
      await page.goto(URL);
      await expect(page.getByRole('heading', { name: /Catálogo de componentes/ })).toBeVisible();
      await conferirLayout(page, tela.width);
      await page.screenshot({ path: `test-results/telas/catalogo-${tela.nome}.png`, fullPage: true });
    });

    test('tabela vira cartões no celular e o menu abre/fecha', async ({ page }) => {
      await page.goto(URL);
      const cabecalho = page.locator('thead');
      if (tela.width < 900) await expect(cabecalho).not.toBeInViewport();
      else await expect(cabecalho).toBeVisible();

      const menu = page.getByRole('complementary', { name: 'Menu principal' });
      if (tela.width < 1024) {
        await expect(menu).not.toBeInViewport();
        await page.getByRole('button', { name: 'Abrir menu' }).click();
        await expect(menu).toBeInViewport();
        await page.keyboard.press('Escape');
        await expect(menu).not.toBeInViewport();
      } else {
        await expect(menu).toBeInViewport();
      }
    });

    test('modal cabe na tela', async ({ page }) => {
      await page.goto(URL);
      await page.getByRole('button', { name: 'Novo cliente' }).click();
      const dialogo = page.getByRole('dialog', { name: 'Novo cliente' });
      await expect(dialogo).toBeVisible();
      const caixa = await dialogo.boundingBox();
      expect(caixa!.width).toBeLessThanOrEqual(tela.width);
      expect(caixa!.y).toBeGreaterThanOrEqual(0);
      await conferirLayout(page, tela.width);
      await page.screenshot({ path: `test-results/telas/catalogo-modal-${tela.nome}.png` });
    });
  });
}
