import { expect, test } from '@playwright/test';
import { irPara, saudacao } from './fluxos';
import { conferirLayout, LARGURAS } from './responsivo';

const SEGUROS = 'http://localhost:5185';
const CONSORCIO = 'http://localhost:5186';

for (const tela of LARGURAS) {
  test.describe(`Demonstração — ${tela.nome} (${tela.width}px)`, () => {
    test.use({ viewport: { width: tela.width, height: tela.height } });

    test('abre só com a equipe, sem clientes de teste, troca para a produtora e recomeça', async ({
      page,
    }) => {
      test.setTimeout(90_000);
      await page.goto(SEGUROS);
      await expect(page.getByRole('heading', { name: saudacao('Administradora') })).toBeVisible({
        timeout: 30_000,
      });
      const barra = page.getByRole('complementary', { name: 'Demonstração' });
      await expect(barra).not.toContainText('dados fictícios');
      await expect(page.getByText(/Cliente Teste/)).toHaveCount(0);
      await conferirLayout(page, tela.width);

      // Equipe: os produtores enviados pela Portella
      await irPara(page, 'Usuários');
      for (const nome of ['Marielly', 'Gisele Costa', 'Berdum', 'Jessica Naiane']) {
        await expect(page.getByRole('row', { name: new RegExp(nome) })).toBeVisible();
      }
      await expect(page.getByRole('row', { name: /Carla|Felippe|Silvana/ })).toHaveCount(0);

      await irPara(page, 'Clientes');
      await expect(page.getByText(/Cliente Teste/)).toHaveCount(0);

      // Visão da produtora: sem aprovações
      await barra.getByRole('combobox').selectOption({ label: 'Gisele (produtora)' });
      await expect(page.getByRole('heading', { name: saudacao('Gisele') })).toBeVisible();
      await irPara(page, 'Propostas');
      await expect(page.getByRole('heading', { name: 'Minhas propostas' })).toBeVisible();
      await expect(page.getByRole('link', { name: /Aprovações/ })).toHaveCount(0);

      await barra.getByRole('button', { name: 'Recomeçar' }).click();
      await expect(page.getByRole('heading', { name: saudacao('Administradora') })).toBeVisible({
        timeout: 30_000,
      });
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
