import { expect, test } from '@playwright/test';
import { irPara, saudacao } from './fluxos';
import { conferirLayout, LARGURAS } from './responsivo';

const SEGUROS = 'http://localhost:5185';
const CONSORCIO = 'http://localhost:5186';

for (const tela of LARGURAS) {
  test.describe(`Demonstração — ${tela.nome} (${tela.width}px)`, () => {
    test.use({ viewport: { width: tela.width, height: tela.height } });

    test('abre já preparada, troca para a produtora e recomeça', async ({ page }) => {
      test.setTimeout(90_000);
      await page.goto(SEGUROS);
      await expect(page.getByRole('heading', { name: saudacao('Administradora') })).toBeVisible({
        timeout: 30_000,
      });
      const barra = page.getByRole('complementary', { name: 'Demonstração' });
      await expect(barra).toContainText('dados fictícios');
      await expect(
        page.getByRole('status').filter({ hasText: '3 propostas aguardando aprovação' }),
      ).toBeVisible();
      await conferirLayout(page, tela.width);

      await irPara(page, 'Painel de produção');
      await expect(page.getByRole('list', { name: /por produtor/ })).toContainText('Deliziane');
      await conferirLayout(page, tela.width);

      // Visão da produtora: só as propostas dela, sem aprovações
      await barra.getByRole('combobox').selectOption({ label: 'Gisele (produtora)' });
      await expect(page.getByRole('heading', { name: saudacao('Gisele') })).toBeVisible();
      await irPara(page, 'Propostas');
      await expect(page.getByRole('heading', { name: 'Minhas propostas' })).toBeVisible();
      await expect(page.getByRole('link', { name: /Aprovações/ })).toHaveCount(0);

      // Aprovar uma pendência e recomeçar: volta ao estado inicial
      await barra.getByRole('combobox').selectOption({ label: 'Administradora' });
      await expect(page.getByRole('heading', { name: saudacao('Administradora') })).toBeVisible();
      await irPara(page, 'Aprovações');
      // Aprovar direto na linha da lista
      await page.getByRole('button', { name: 'Aprovar a proposta de Cliente Teste Moreira' }).click();
      await expect(page.getByText('Proposta de Cliente Teste Moreira aprovada.')).toBeVisible();
      await barra.getByRole('button', { name: 'Recomeçar' }).click();
      await expect(page.getByRole('heading', { name: saudacao('Administradora') })).toBeVisible({
        timeout: 30_000,
      });
      await expect(
        page.getByRole('status').filter({ hasText: '3 propostas aguardando aprovação' }),
      ).toBeVisible();
    });

    test('consórcio abre com cotas e lances fictícios', async ({ page }) => {
      await page.goto(CONSORCIO);
      await expect(page.getByRole('heading', { name: saudacao('Administradora') })).toBeVisible({
        timeout: 30_000,
      });
      await irPara(page, 'Cotas');
      await expect(page.getByText(/de 70 cotas/)).toBeVisible();
      await irPara(page, 'Lances');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await conferirLayout(page, tela.width);
    });
  });
}

test.describe('Seguros — menu no topo, busca e painel (1440px)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('busca com Ctrl K, Nova proposta pelo topo e a produtora sem a comissão da corretora', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.goto(SEGUROS);
    await expect(page.getByRole('heading', { name: saudacao('Administradora') })).toBeVisible({
      timeout: 30_000,
    });
    const capsula = page.getByRole('navigation', { name: 'Menu principal' });
    await expect(capsula.getByRole('link', { name: 'Painel' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByText('Comissão recebida')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Por produtor' })).toBeVisible();

    // Busca rápida: sem acento acha "Apólices"; Enter abre
    await page.keyboard.press('Control+k');
    const busca = page.getByRole('dialog', { name: 'Busca rápida' });
    await busca.getByRole('combobox').fill('apolice');
    await expect(busca.getByRole('option', { name: /Apólices/ })).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1, name: /Apólices/ })).toBeVisible();

    // "Nova proposta" no topo abre o formulário direto
    await page.getByRole('link', { name: 'Nova proposta' }).click();
    await expect(page.getByRole('dialog', { name: 'Nova proposta' })).toBeVisible();
    await page.keyboard.press('Escape');

    // Produtora: produção e repasse dela, sem a comissão que a corretora recebe
    await page
      .getByRole('complementary', { name: 'Demonstração' })
      .getByRole('combobox')
      .selectOption({ label: 'Gisele (produtora)' });
    await expect(page.getByRole('heading', { name: saudacao('Gisele') })).toBeVisible();
    await expect(page.getByText('Meu repasse a receber')).toBeVisible();
    await expect(page.getByText('Comissão recebida')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Por produtor' })).toHaveCount(0);
  });
});
