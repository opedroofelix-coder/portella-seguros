import { expect, test } from '@playwright/test';
import { join } from 'node:path';
import {
  ADMIN,
  cadastrarUsuario,
  CORRETOR,
  entrar,
  entrarPelaPrimeiraVez,
  importar,
  irPara,
  primeiroAcesso,
  sair,
} from './fluxos';
import { conferirLayout, LARGURAS } from './responsivo';

const URL = 'http://localhost:5173';
const FIXTURE = join(import.meta.dirname, 'fixtures/seguros.json');

test.describe('CRM Seguros — fluxo completo', () => {
  test.use({ viewport: { width: 1280, height: 860 } });

  test('primeiro acesso, equipe, cliente, apólice, renovação e permissões', async ({ page }) => {
    await primeiroAcesso(page, URL);
    // Os produtores da Portella já entram cadastrados, com senha 1234 e o % padrão
    await irPara(page, 'Usuários');
    await expect(page.getByRole('row', { name: /Deliziane.*40%/ })).toContainText('Senha 1234');
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
    await expect(page.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute(
      'href',
      'https://wa.me/5511935925216',
    );

    // Apólice que vence em 20 dias, cadastrada pela ficha do cliente
    await page.getByRole('button', { name: 'Nova apólice' }).click();
    const ap = page.getByRole('dialog', { name: 'Nova apólice' });
    await ap.getByLabel('Seguradora').selectOption({ label: 'Porto Seguro' });
    const fim = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10);
    const inicio = new Date(Date.now() - 345 * 86_400_000).toISOString().slice(0, 10);
    await ap.getByLabel('Início da vigência').fill(inicio);
    await ap.getByLabel('Fim da vigência').fill(fim);
    await ap.getByLabel('Prêmio líquido').fill('2.000');
    await ap.getByLabel('Comissão', { exact: true }).fill('15');
    // O valor com ponto de milhar é lido como R$ 2.000,00 e a comissão aparece na hora
    await expect(ap.getByText('Comissão prevista: R$ 300,00')).toBeVisible();
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

    // Corretor: troca a senha 1234 no primeiro acesso; não vê a carteira da administradora nem usuários
    await sair(page);
    await entrarPelaPrimeiraVez(page, URL, CORRETOR);
    await expect(page.getByRole('link', { name: 'Usuários' })).toHaveCount(0);
    await irPara(page, 'Clientes');
    await expect(page.getByText('Nenhum cliente cadastrado')).toBeVisible();
    await page.goto(`${URL}/usuarios`);
    await expect(page.getByText('Acesso restrito')).toBeVisible();

    // Senha errada
    await sair(page);
    await entrar(page, URL, { login: ADMIN.login, senha: 'errada' });
    await expect(page.getByRole('alert')).toHaveText('Usuário ou senha incorretos.');
  });

  test('importa a planilha convertida e distribui a carteira por corretor', async ({ page }) => {
    await primeiroAcesso(page, URL);
    await cadastrarUsuario(page, CORRETOR, 'Corretor');
    await importar(page, FIXTURE, /Propostas/);
    await irPara(page, 'Apólices');
    await page.getByLabel('Situação').selectOption({ label: 'Todas' });
    await expect(page.getByText(/12 de 12 apólices/)).toBeVisible();
    await irPara(page, 'Propostas');
    await expect(page.getByRole('table', { name: 'Propostas' }).getByRole('row')).toHaveCount(12 + 1);
    await sair(page);
    await entrarPelaPrimeiraVez(page, URL, CORRETOR);
    await irPara(page, 'Apólices');
    await page.getByLabel('Situação').selectOption({ label: 'Todas' });
    await expect(page.getByText(/6 de 6 apólices/)).toBeVisible();
    // Corretor vê só as propostas em que participa, sem os valores da corretora, e não acessa o financeiro
    await irPara(page, 'Propostas');
    await expect(page.getByRole('heading', { name: 'Minhas propostas' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Saldo' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Financeiro' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Aprovações/ })).toHaveCount(0);
    await page.goto(`${URL}/financeiro`);
    await expect(page.getByText('Acesso restrito')).toBeVisible();
  });

  test('proposta do produtor, aprovação, baixa, vale, relatório de pagamento e financeiro', async ({
    page,
  }) => {
    await primeiroAcesso(page, URL);
    await cadastrarUsuario(page, { ...CORRETOR, percentual: '30' }, 'Corretor');
    await sair(page);

    // Produtor lança a proposta: fica pendente e ele ainda pode editar
    await entrarPelaPrimeiraVez(page, URL, CORRETOR);
    await irPara(page, 'Propostas');
    await page.getByRole('button', { name: 'Nova proposta' }).click();
    const form = page.getByRole('dialog', { name: 'Nova proposta' });
    await form.getByLabel('Nome completo do cliente').fill('Cliente Teste Proposta');
    await form.getByLabel('Nº da proposta / apólice').fill('TESTE-900');
    await form.getByLabel('Seguradora').fill('Porto Seguro');
    await form.getByLabel('Produto', { exact: true }).fill('Automóvel');
    await form.getByLabel('Tipo de negócio').selectOption({ label: 'Seguro novo' });
    await form.getByLabel('Prêmio líquido (R$)').fill('1.000,00');
    await form.getByLabel('Comissão trabalhada (%)').fill('20');
    await expect(form.getByText('Receberá R$ 60,00')).toBeVisible();
    await page.getByRole('button', { name: 'Enviar para aprovação' }).click();
    await expect(page.getByText('Proposta enviada para aprovação.')).toBeVisible();
    await expect(page.getByRole('row', { name: /Cliente Teste Proposta/ })).toContainText('Pendente');
    await sair(page);

    // Administradora: aviso no painel e contador no menu; dá a baixa e aprova
    await entrar(page, URL, ADMIN);
    await expect(page.getByRole('status').filter({ hasText: 'proposta aguardando aprovação' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Aprovações 1 pendente(s)' })).toBeVisible();

    // Administradora muda o % do produtor de 30% para 25%, também nas propostas em aberto
    await irPara(page, 'Configurações');
    await page.getByLabel('Aplicar também às propostas em aberto').check();
    await page.getByLabel(`% de ${CORRETOR.nome}`).fill('25');
    await page
      .getByRole('listitem')
      .filter({ hasText: CORRETOR.nome })
      .getByRole('button', { name: 'Salvar e aplicar' })
      .click();
    await expect(
      page.getByText(`Repasse de ${CORRETOR.nome}: 25%. 1 proposta(s) em aberto atualizada(s).`),
    ).toBeVisible();

    await irPara(page, 'Aprovações');
    await page.getByRole('row', { name: /Cliente Teste Proposta/ }).click();
    const aprovar = page.getByRole('dialog', { name: /Cliente Teste Proposta/ });
    await aprovar.getByRole('button', { name: 'Recebimento' }).click();
    await aprovar.getByLabel('Valor (R$)').fill('200,00');
    await aprovar.getByLabel('Parcela').fill('1ª');
    await expect(aprovar.getByText('Saldo a receber').locator('..')).toContainText('R$ 0,00');
    await aprovar.getByRole('button', { name: 'Aprovar' }).click();
    await expect(page.getByText('Proposta aprovada.')).toBeVisible();
    await expect(page.getByText('Nada para aprovar')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Aprovações', exact: true })).toBeVisible();

    // Vale do produtor, descontado no mês
    await irPara(page, 'Estornos e vales');
    await page.getByRole('tab', { name: 'Vales' }).click();
    await page.getByRole('button', { name: 'Novo vale' }).click();
    const vale = page.getByRole('dialog', { name: 'Novo vale' });
    await vale.getByLabel('Produtor').selectOption({ label: CORRETOR.nome });
    await vale.getByLabel('Valor (R$)').fill('10,00');
    await vale.getByLabel('Motivo').fill('Adiantamento');
    await vale.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByRole('table', { name: 'Vales' })).toContainText('R$ 10,00');

    // Relatório mensal: 200 × 25% − 10 = 40, com PDF e Excel
    await irPara(page, 'Relatórios');
    await page
      .getByRole('table', { name: 'Fechamento do mês' })
      .getByRole('row', { name: /Corretor Teste/ })
      .click();
    await expect(page.getByText('Líquido a pagar').locator('..')).toContainText('R$ 40,00');
    for (const [botao, extensao] of [
      ['PDF', '.pdf'],
      ['Excel', '.xlsx'],
    ] as const) {
      const baixa = page.waitForEvent('download');
      await page.getByRole('button', { name: botao, exact: true }).click();
      expect((await baixa).suggestedFilename()).toMatch(new RegExp(`corretor-teste.*\\${extensao}$`, 'i'));
    }
    await page.getByRole('button', { name: 'Registrar pagamento' }).click();
    await expect(page.getByText('Pagamento de Corretor Teste registrado.')).toBeVisible();

    // Painel de produção
    await irPara(page, 'Painel de produção');
    await page.getByLabel('Período').selectOption({ label: 'Todo o período' });
    await expect(page.getByText('Produção (prêmio líquido)').locator('..')).toContainText('R$ 1.000,00');
    await expect(page.getByText('Seguro novo').locator('..')).toContainText('R$ 1.000,00');

    // Produtor vê a proposta aprovada só para consulta
    await sair(page);
    await entrar(page, URL, CORRETOR);
    await irPara(page, 'Propostas');
    await page.getByRole('row', { name: /Cliente Teste Proposta/ }).click();
    await expect(page.getByText(/só a administração altera/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Excluir' })).toHaveCount(0);
  });

  test('financeiro sem a poupança', async ({ page }) => {
    await primeiroAcesso(page, URL);
    await importar(page, FIXTURE, /Movimentos/);
    await irPara(page, 'Financeiro');
    await expect(page.getByText('Saldo Bradesco')).toBeVisible();
    await expect(page.getByText(/Poupança/)).toHaveCount(0);
    await page.getByRole('tab', { name: 'Despesas' }).click();
    await page.getByLabel('Mês do vencimento').selectOption({ label: 'Todos' });
    await page
      .getByRole('row', { name: /Contador \(teste\)/ })
      .getByRole('button', { name: 'Pagar…' })
      .click();
    // Pagar pede confirmação e lança a saída no extrato, para despesas e conta baterem
    const confirmar = page.getByRole('alertdialog', { name: 'Registrar o pagamento?' });
    await expect(confirmar.getByLabel(/Lançar a saída no extrato/)).toBeChecked();
    await confirmar.getByRole('button', { name: 'Registrar pagamento' }).click();
    await expect(page.getByText('Despesa paga e lançada no extrato Bradesco.')).toBeVisible();
    await page.getByRole('tab', { name: 'Extrato' }).click();
    await expect(page).toHaveURL(/aba=extrato/);
    await page.getByLabel('Mês').selectOption({ label: 'Todos' });
    await expect(page.getByRole('table', { name: 'Extrato Bradesco' })).toContainText(
      'Pagamento: Contador (teste)',
    );
  });
});

for (const tela of LARGURAS) {
  test.describe(`CRM Seguros — responsividade ${tela.nome} (${tela.width}px)`, () => {
    test.use({ viewport: { width: tela.width, height: tela.height } });

    test('todas as telas sem rolagem horizontal', async ({ page }) => {
      await page.goto(URL);
      await conferirLayout(page, tela.width);
      await page.screenshot({
        path: `test-results/telas/seguros-entrar-${tela.nome}.png`,
        fullPage: true,
        animations: 'disabled',
      });
      await primeiroAcesso(page, URL);
      await importar(page, FIXTURE, /Apólices/);

      const telas = [
        'Painel',
        'Clientes',
        'Apólices',
        'Renovações',
        'Cotações',
        'Propostas',
        'Aprovações',
        'Painel de produção',
        'Relatórios',
        'Estornos e vales',
        'Financeiro',
        'Configurações',
        'Usuários',
        'Importar',
        'Minha conta',
      ];
      for (const nome of telas) {
        await irPara(page, nome);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await page.waitForLoadState('networkidle');
        await conferirLayout(page, tela.width);
        await page.screenshot({
          path: `test-results/telas/seguros-${nome.toLowerCase().replace(/\s/g, '-')}-${tela.nome}.png`,
          fullPage: true,
          animations: 'disabled',
        });
      }

      await irPara(page, 'Financeiro');
      for (const aba of ['Extrato', 'Despesas', 'Faturamento']) {
        await page.getByRole('tab', { name: aba }).click();
        await conferirLayout(page, tela.width);
        await page.screenshot({
          path: `test-results/telas/seguros-financeiro-${aba.toLowerCase()}-${tela.nome}.png`,
          fullPage: true,
          animations: 'disabled',
        });
      }

      await irPara(page, 'Clientes');
      await page.getByText('Cliente Teste Alfa').click();
      await expect(page.getByRole('heading', { name: 'Cliente Teste Alfa' })).toBeVisible();
      await conferirLayout(page, tela.width);
      await page.screenshot({
        path: `test-results/telas/seguros-ficha-${tela.nome}.png`,
        fullPage: true,
        animations: 'disabled',
      });

      await page.getByRole('button', { name: 'Nova apólice' }).click();
      await conferirLayout(page, tela.width);
      await page.screenshot({
        path: `test-results/telas/seguros-form-apolice-${tela.nome}.png`,
        animations: 'disabled',
      });
      await page.keyboard.press('Escape');

      // Formulário da proposta, relatório de um produtor e pendentes
      await irPara(page, 'Propostas');
      await page
        .getByRole('row', { name: /Cliente Teste Beta/ })
        .first()
        .click();
      await conferirLayout(page, tela.width);
      await page.screenshot({
        path: `test-results/telas/seguros-form-proposta-${tela.nome}.png`,
        animations: 'disabled',
      });
      await page.keyboard.press('Escape');
      await irPara(page, 'Relatórios');
      await page.getByLabel('Produtor').selectOption({ index: 1 });
      await conferirLayout(page, tela.width);
      await page.screenshot({
        path: `test-results/telas/seguros-relatorio-produtor-${tela.nome}.png`,
        fullPage: true,
        animations: 'disabled',
      });
      await page.getByRole('tab', { name: 'Comissões pendentes' }).click();
      await conferirLayout(page, tela.width);
      await page.screenshot({
        path: `test-results/telas/seguros-relatorio-pendentes-${tela.nome}.png`,
        fullPage: true,
        animations: 'disabled',
      });
    });
  });
}
