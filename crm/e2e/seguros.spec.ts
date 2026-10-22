import { expect, test } from '@playwright/test';
import { join } from 'node:path';
import { ADMIN, cadastrarUsuario, CORRETOR, entrar, importar, irPara, primeiroAcesso, sair } from './fluxos';
import { conferirLayout, LARGURAS } from './responsivo';

const URL = 'http://localhost:5173';
const FIXTURE = join(import.meta.dirname, 'fixtures/seguros.json');

test.describe('CRM Seguros — fluxo completo', () => {
  test.use({ viewport: { width: 1280, height: 860 } });

  test('primeiro acesso, equipe, cliente, apólice, renovação e permissões', async ({ page }) => {
    await primeiroAcesso(page, URL);
    await cadastrarUsuario(page, CORRETOR, 'Corretor');

    // Cliente novo com validação de CPF
    await irPara(page, 'Clientes');
    await page.getByRole('button', { name: 'Novo cliente' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Novo cliente' });
    await dialogo.getByLabel('Nome completo').fill('Maria Teste');
    await dialogo.getByLabel('CPF').fill('123.456.789-00');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(dialogo.getByText('CPF inválido.')).toBeVisible();
    await dialogo.getByLabel('CPF').fill('529.982.247-25');
    await dialogo.getByLabel('Telefone / WhatsApp').fill('(11) 93592-5216');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByRole('heading', { name: 'Maria Teste' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', 'https://wa.me/5511935925216');

    // Apólice que vence em 20 dias, cadastrada pela ficha do cliente
    await page.getByRole('button', { name: 'Nova apólice' }).click();
    const ap = page.getByRole('dialog', { name: 'Nova apólice' });
    await ap.getByLabel('Seguradora').selectOption({ label: 'Porto Seguro' });
    const fim = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10);
    const inicio = new Date(Date.now() - 345 * 86_400_000).toISOString().slice(0, 10);
    await ap.getByLabel('Início da vigência').fill(inicio);
    await ap.getByLabel('Fim da vigência').fill(fim);
    await ap.getByLabel('Prêmio líquido (R$)').fill('2.000,00');
    await ap.getByLabel('Comissão (%)').fill('15');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('Apólice cadastrada.')).toBeVisible();
    await expect(page.getByText(/Vence em (19|20) dias/)).toBeVisible();

    // Painel e fila de renovação
    await irPara(page, 'Painel');
    await expect(page.getByText('Comissão prevista').locator('..')).toContainText('R$ 300,00');
    await irPara(page, 'Renovações');
    await page.getByRole('button', { name: 'Renovar' }).click();
    await page.getByRole('button', { name: 'Registrar renovação' }).click();
    await expect(page.getByText('Renovação registrada.')).toBeVisible();
    await expect(page.getByText('Tudo em dia')).toBeVisible();

    // Cotação no funil
    await irPara(page, 'Cotações');
    await page.getByRole('button', { name: 'Nova oportunidade' }).click();
    await page.getByRole('dialog').getByLabel('Contato').fill('Lead Teste');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await page.getByLabel('Etapa de Lead Teste').selectOption({ label: 'Proposta enviada' });
    await expect(page.getByRole('region', { name: 'Proposta enviada' })).toContainText('Lead Teste');

    // Corretor: não vê a carteira da administradora nem a área de usuários
    await sair(page);
    await entrar(page, URL, CORRETOR);
    await expect(page.getByRole('link', { name: 'Usuários' })).toHaveCount(0);
    await irPara(page, 'Clientes');
    await expect(page.getByText('Nenhum cliente cadastrado')).toBeVisible();
    await page.goto(`${URL}/usuarios`);
    await expect(page.getByText('Acesso restrito')).toBeVisible();

    // Senha errada
    await sair(page);
    await page.getByLabel('E-mail').fill(ADMIN.email);
    await page.getByLabel('Senha').fill('errada');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('alert')).toHaveText('E-mail ou senha incorretos.');
  });

  test('importa a planilha convertida e distribui a carteira por corretor', async ({ page }) => {
    await primeiroAcesso(page, URL);
    await cadastrarUsuario(page, CORRETOR, 'Corretor');
    await importar(page, FIXTURE, /Apólices/);
    await irPara(page, 'Apólices');
    await expect(page.getByText(/12 de 12 apólices/)).toBeVisible();
    await sair(page);
    await entrar(page, URL, CORRETOR);
    await irPara(page, 'Apólices');
    await expect(page.getByText(/6 de 6 apólices/)).toBeVisible();
  });
});

for (const tela of LARGURAS) {
  test.describe(`CRM Seguros — responsividade ${tela.nome} (${tela.width}px)`, () => {
    test.use({ viewport: { width: tela.width, height: tela.height } });

    test('todas as telas sem rolagem horizontal', async ({ page }) => {
      await page.goto(URL);
      await conferirLayout(page, tela.width);
      await page.screenshot({ path: `test-results/telas/seguros-entrar-${tela.nome}.png`, fullPage: true });
      await primeiroAcesso(page, URL);
      await importar(page, FIXTURE, /Apólices/);

      const telas = ['Painel', 'Clientes', 'Apólices', 'Renovações', 'Cotações', 'Usuários', 'Importar', 'Minha conta'];
      for (const nome of telas) {
        await irPara(page, nome);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await page.waitForLoadState('networkidle');
        await conferirLayout(page, tela.width);
        await page.screenshot({ path: `test-results/telas/seguros-${nome.toLowerCase().replace(/\s/g, '-')}-${tela.nome}.png`, fullPage: true });
      }

      await irPara(page, 'Clientes');
      await page.getByText('Cliente Teste Alfa').click();
      await expect(page.getByRole('heading', { name: 'Cliente Teste Alfa' })).toBeVisible();
      await conferirLayout(page, tela.width);
      await page.screenshot({ path: `test-results/telas/seguros-ficha-${tela.nome}.png`, fullPage: true });

      await page.getByRole('button', { name: 'Nova apólice' }).click();
      await conferirLayout(page, tela.width);
      await page.screenshot({ path: `test-results/telas/seguros-form-apolice-${tela.nome}.png` });
    });
  });
}
