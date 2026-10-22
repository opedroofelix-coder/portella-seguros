import { expect, test } from '@playwright/test';
import { join } from 'node:path';
import { cadastrarUsuario, CORRETOR, entrar, importar, irPara, primeiroAcesso, sair } from './fluxos';
import { conferirLayout, LARGURAS } from './responsivo';

const URL = 'http://localhost:5174';
const FIXTURE = join(import.meta.dirname, 'fixtures/consorcio.json');

test.describe('CRM Consórcio — fluxo completo', () => {
  test.use({ viewport: { width: 1280, height: 860 } });

  test('cota, lance contemplado, importação e permissões', async ({ page }) => {
    await primeiroAcesso(page, URL);
    await expect(page.getByText('CRM Consórcio').first()).toBeVisible();
    await cadastrarUsuario(page, CORRETOR, 'Corretor');

    // Cliente e cota
    await irPara(page, 'Clientes');
    await page.getByRole('button', { name: 'Novo cliente' }).click();
    await page.getByRole('dialog').getByLabel('Nome completo').fill('Consorciada Manual');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByRole('heading', { name: 'Consorciada Manual' })).toBeVisible();
    await page.getByRole('button', { name: 'Nova cota' }).click();
    const form = page.getByRole('dialog', { name: 'Nova cota' });
    await form.getByLabel('Administradora').fill('Administradora Manual');
    await form.getByLabel('Grupo').fill('2020');
    await form.getByLabel('Cota', { exact: true }).fill('7');
    await form.getByLabel('Crédito (R$)').fill('300.000,00');
    await form.getByLabel('Prazo (meses)').fill('200');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('Cota cadastrada.')).toBeVisible();
    await expect(page.getByRole('cell', { name: '2020 / 7' })).toBeVisible();

    // Lance contemplado contempla a cota
    await irPara(page, 'Lances');
    await page.getByRole('button', { name: 'Novo lance' }).click();
    const lance = page.getByRole('dialog', { name: 'Novo lance' });
    await lance
      .getByLabel('Cota')
      .selectOption({ label: 'Consorciada Manual · Administradora Manual 2020/7' });
    await lance.getByLabel('Percentual do crédito (%)').fill('30');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await page.getByRole('button', { name: 'Contemplado', exact: true }).click();
    await expect(page.getByText('Parabéns! Cota contemplada por lance.')).toBeVisible();
    await irPara(page, 'Cotas');
    await expect(page.getByRole('row', { name: /2020 \/ 7/ })).toContainText('Contemplada');

    // Importação separada do CRM de seguros
    await importar(page, FIXTURE, /Cotas/);
    await irPara(page, 'Cotas');
    await expect(page.getByText('9 de 9 cotas.')).toBeVisible();
    await irPara(page, 'Painel');
    await expect(page.getByText('Contempladas').locator('..')).toContainText('2');

    // Corretor vê só as cotas dele
    await sair(page);
    await entrar(page, URL, CORRETOR);
    await irPara(page, 'Cotas');
    await expect(page.getByText('4 de 4 cotas.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Importar' })).toHaveCount(0);
  });
});

for (const tela of LARGURAS) {
  test.describe(`CRM Consórcio — responsividade ${tela.nome} (${tela.width}px)`, () => {
    test.use({ viewport: { width: tela.width, height: tela.height } });

    test('todas as telas sem rolagem horizontal', async ({ page }) => {
      await primeiroAcesso(page, URL);
      await importar(page, FIXTURE, /Cotas/);
      for (const nome of [
        'Painel',
        'Clientes',
        'Cotas',
        'Lances',
        'Propostas',
        'Usuários',
        'Importar',
        'Minha conta',
      ]) {
        await irPara(page, nome);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await conferirLayout(page, tela.width);
        await page.screenshot({
          path: `test-results/telas/consorcio-${nome.toLowerCase().replace(/\s/g, '-')}-${tela.nome}.png`,
          fullPage: true,
          animations: 'disabled',
        });
      }
      await irPara(page, 'Cotas');
      await page.getByText('Consorciado Teste Um').first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await conferirLayout(page, tela.width);
      await page.screenshot({
        path: `test-results/telas/consorcio-form-cota-${tela.nome}.png`,
        animations: 'disabled',
      });
    });
  });
}
