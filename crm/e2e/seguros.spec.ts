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
  escolher,
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
    await expect(page.getByRole('row', { name: /Deliziane.*40%/ })).toContainText('Aguardando 1º acesso');
    await cadastrarUsuario(page, CORRETOR, 'Produtor');

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
    await escolher(ap.getByLabel('Seguradora'), { label: 'Porto Seguro' });
    const fim = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10);
    const inicio = new Date(Date.now() - 345 * 86_400_000).toISOString().slice(0, 10);
    await ap.getByLabel('Início da vigência').fill(inicio);
    await ap.getByLabel('Fim da vigência').fill(fim);
    await escolher(ap.getByLabel('Tipo', { exact: true }), { label: 'Seguro novo' });
    await ap.getByLabel('Modelo do veículo').fill('Onix 1.0 2022');
    await ap.getByLabel('Placa').fill('abc1d23');
    // Prêmio líquido e comissão ficam na proposta: a apólice tem o prêmio total e as parcelas
    await expect(ap.getByLabel('Prêmio líquido')).toHaveCount(0);
    await ap.getByLabel('Prêmio total').fill('2.000');
    await ap.getByLabel('Quantidade de parcelas').fill('3');
    await ap.getByLabel('1º vencimento').fill(inicio);
    await ap.getByRole('button', { name: 'Gerar parcelas' }).click();
    // R$ 2.000,00 em 3: a sobra de centavos fica na 1ª parcela
    await expect(ap.getByLabel('Valor').first()).toHaveValue('666,68');
    await expect(ap.getByText('Soma das parcelas: R$ 2.000,00 de R$ 2.000,00')).toBeVisible();
    const checklist = page.waitForEvent('download');
    await ap.getByRole('button', { name: 'Checklist (PDF)' }).click();
    expect((await checklist).suggestedFilename()).toMatch(/^checklist-maria-teste.*\.pdf$/);
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('Apólice cadastrada.')).toBeVisible();
    await expect(page.getByText(/Vence em (19|20) dias/)).toBeVisible();

    // Painel e fila de renovação
    await irPara(page, 'Painel');
    await expect(page.getByText('apólice vence nos próximos 30 dias')).toBeVisible();
    await irPara(page, 'Renovações');
    await page.getByRole('button', { name: 'Renovar' }).click();
    await page.getByRole('button', { name: 'Registrar renovação' }).click();
    await expect(page.getByText('Renovação registrada.')).toBeVisible();
    await expect(page.getByText('Tudo em dia')).toBeVisible();

    // Cotação no funil, com a origem do lead
    await irPara(page, 'Cotações');
    await page.getByRole('button', { name: 'Nova oportunidade' }).click();
    const lead = page.getByRole('dialog');
    await lead.getByLabel('Contato').fill('Lead Teste');
    await escolher(lead.getByLabel('Origem'), { label: 'Indicação' });
    await lead.getByLabel('Indicado por').fill('Maria Teste');
    await expect(lead.getByRole('button', { name: 'Cadastrar como cliente' })).toBeVisible();
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByRole('region', { name: 'Novo' })).toContainText('Indicação de Maria Teste');
    await escolher(page.getByLabel('Etapa de Lead Teste'), { label: 'Proposta enviada' });
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
    await cadastrarUsuario(page, CORRETOR, 'Produtor');
    await importar(page, FIXTURE, /Propostas/);
    await irPara(page, 'Apólices');
    await escolher(page.getByLabel('Situação'), { label: 'Todas' });
    await expect(page.getByText(/12 de 12 apólices/)).toBeVisible();
    await irPara(page, 'Propostas');
    // 12 propostas + cabeçalho + linha de totais
    await expect(page.getByRole('table', { name: 'Propostas' }).getByRole('row')).toHaveCount(12 + 2);
    await sair(page);
    await entrarPelaPrimeiraVez(page, URL, CORRETOR);
    await irPara(page, 'Apólices');
    await escolher(page.getByLabel('Situação'), { label: 'Todas' });
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
    await cadastrarUsuario(page, { ...CORRETOR, percentual: '30' }, 'Produtor');
    await sair(page);

    // Produtor lança a proposta: fica pendente e ele ainda pode editar
    await entrarPelaPrimeiraVez(page, URL, CORRETOR);
    await irPara(page, 'Propostas');
    await page.getByRole('button', { name: 'Nova proposta' }).click();
    const form = page.getByRole('dialog', { name: 'Nova proposta' });
    await form.getByLabel('Nome completo do cliente').fill('Cliente Teste Proposta');
    await form.getByLabel('Nº da proposta / apólice').fill('TESTE-900');
    await escolher(form.getByLabel('Seguradora'), { label: 'Porto Seguro' });
    await escolher(form.getByLabel('Produto', { exact: true }), { label: 'Automóvel' });
    // Tipo de negócio e prêmio são obrigatórios
    await page.getByRole('button', { name: 'Enviar para aprovação' }).click();
    await expect(form.getByText('Escolha o tipo de negócio.')).toBeVisible();
    await escolher(form.getByLabel('Tipo de negócio'), { label: 'Seguro novo' });
    await form.getByLabel('Placa').fill('XYZ9A87');
    await escolher(form.getByLabel('Forma de pagamento'), { label: 'Cartão de crédito' });
    await form.getByLabel('Quantidade de parcelas').fill('10');
    // Comissão normal ou vitalícia: só a administração define
    await expect(form.getByLabel('Regra de recebimento')).toHaveCount(0);
    await form.getByLabel('Prêmio líquido').fill('1.000');
    await form.getByLabel('Comissão trabalhada').fill('20');
    await expect(form.getByText('Receberá R$ 60,00')).toBeVisible();
    await expect(form.getByText('Soma dos produtores').locator('..')).toContainText('30%');
    await page.getByRole('button', { name: 'Enviar para aprovação' }).click();
    await expect(page.getByText('Proposta enviada para aprovação.')).toBeVisible();
    await expect(page.getByRole('row', { name: /Cliente Teste Proposta/ })).toContainText(
      'Aguardando aprovação',
    );
    await sair(page);

    // Administradora: aviso no painel e contador no menu; dá a baixa e aprova
    await entrar(page, URL, ADMIN);
    // No Painel da administração, o aviso fica nas pendências do mural.
    await expect(page.getByRole('link', { name: /Proposta aguardando aprovação/ })).toContainText('Corretor');
    await expect(page.getByRole('link', { name: 'Aprovações 1 pendente(s)' })).toBeVisible();

    // Administradora muda o % do produtor de 30% para 25%, também nas propostas em aberto
    await irPara(page, 'Configurações');
    await page.getByLabel('Aplicar também às propostas em aberto').check();
    await page.getByLabel(`% de ${CORRETOR.nome}`).fill('25');
    await page
      .getByRole('listitem')
      .filter({ hasText: CORRETOR.nome })
      .getByRole('button', { name: 'Salvar e aplicar…' })
      .click();
    await page
      .getByRole('alertdialog', { name: /Aplicar 25% às propostas em aberto/ })
      .getByRole('button', { name: 'Aplicar às propostas' })
      .click();
    await expect(
      page.getByText(`Repasse de ${CORRETOR.nome}: 25%. 1 proposta(s) em aberto atualizada(s).`),
    ).toBeVisible();

    await irPara(page, 'Aprovações');
    await page.getByRole('row', { name: /Cliente Teste Proposta/ }).click();
    const aprovar = page.getByRole('dialog', { name: /Cliente Teste Proposta/ });
    await aprovar.getByRole('button', { name: 'Adicionar recebimento' }).click();
    await expect(aprovar.getByLabel('Regra de recebimento')).toBeVisible();
    await aprovar.getByLabel('Valor', { exact: true }).fill('150');
    // Controle por saldo: sem a parcela, cada recebimento mostra o saldo que fica
    await expect(aprovar.getByLabel('Parcela', { exact: true })).toHaveCount(0);
    await expect(aprovar.getByText('Saldo depois').locator('..')).toContainText('R$ 50,00');
    await aprovar.getByLabel('Valor', { exact: true }).fill('200');
    await expect(aprovar.getByText('Saldo a receber').locator('..')).toContainText('R$ 0,00');
    await aprovar.getByRole('button', { name: 'Aprovar proposta' }).click();
    await expect(page.getByText('Proposta aprovada.')).toBeVisible();
    await expect(page.getByText('Nada para aprovar')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Aprovações', exact: true })).toBeVisible();

    // Vale do produtor, descontado no mês
    await irPara(page, 'Estornos e vales');
    await page.getByRole('tab', { name: 'Vales' }).click();
    await page.getByRole('button', { name: 'Novo vale' }).click();
    const vale = page.getByRole('dialog', { name: 'Novo vale' });
    await escolher(vale.getByLabel('Produtor'), { label: CORRETOR.nome });
    await vale.getByLabel('Valor', { exact: true }).fill('10');
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
    // Registrar pagamento confirma valor e data antes de gravar
    await page.getByRole('button', { name: 'Registrar pagamento…' }).click();
    const pagamento = page.getByRole('alertdialog', { name: /Registrar o pagamento de Corretor Teste/ });
    await expect(pagamento.getByLabel('Valor pago')).toHaveValue('40,00');
    await pagamento.getByRole('button', { name: 'Registrar pagamento' }).click();
    await expect(page.getByText('Pagamento de Corretor Teste registrado.')).toBeVisible();

    // Painel de produção
    await irPara(page, 'Painel de produção');
    await escolher(page.getByLabel('Período'), { label: 'Todo o período' });
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

  test('apólice da proposta aprovada, cancelamento visível e cotação encaminhada pelo produto', async ({
    page,
  }) => {
    await primeiroAcesso(page, URL);
    await cadastrarUsuario(page, CORRETOR, 'Produtor');

    // Cliente e proposta aprovada (a administração lança já aprovada)
    await irPara(page, 'Clientes');
    await page.getByRole('button', { name: 'Novo cliente' }).click();
    const cli = page.getByRole('dialog', { name: 'Novo cliente' });
    await cli.getByLabel('Nome completo').fill('Joana Pereira Lima');
    await escolher(cli.getByLabel('Origem'), { label: 'Instagram' });
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('Instagram')).toBeVisible();

    await irPara(page, 'Propostas');
    await page.getByRole('button', { name: 'Nova proposta' }).click();
    const form = page.getByRole('dialog', { name: 'Nova proposta' });
    await form.getByLabel('Nome completo do cliente').fill('Joana Pereira Lima');
    await form.getByLabel('Nº da proposta / apólice').fill('P-321');
    await escolher(form.getByRole('combobox', { name: 'Seguradora' }), { label: 'Porto Seguro' });
    await escolher(form.getByLabel('Produto', { exact: true }), { label: 'Moto' });
    await escolher(form.getByLabel('Tipo de negócio'), { label: 'Endosso' });
    await form.getByLabel('Placa').fill('MOT0A12');
    await escolher(form.getByLabel('Forma de pagamento'), { label: 'Boleto' });
    await form.getByLabel('Quantidade de parcelas').fill('4');
    await form.getByLabel('Prêmio líquido').fill('800');
    await form.getByLabel('Comissão trabalhada').fill('15');
    await page.getByRole('button', { name: 'Salvar (já aprovada)' }).click();
    await expect(page.getByText('Proposta salva.')).toBeVisible();

    // A proposta aprovada vira apólice já preenchida
    await page.getByRole('row', { name: /Joana Pereira Lima/ }).click();
    await page.getByRole('button', { name: 'Cadastrar apólice' }).click();
    const ap = page.getByRole('dialog', { name: 'Nova apólice' });
    await expect(ap.getByRole('combobox', { name: 'Ramo' })).toHaveText(/Moto \/ ciclomotor/);
    await expect(ap.getByRole('combobox', { name: 'Tipo', exact: true })).toHaveText(/Endosso/);
    await expect(ap.getByLabel('Nº da proposta')).toHaveValue('P-321');
    await expect(ap.getByLabel('Placa')).toHaveValue('MOT0A12');
    await expect(ap.getByText('Forma de pagamento: Boleto (proposta nº P-321)')).toBeVisible();
    await ap.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('Apólice cadastrada.')).toBeVisible();
    await page.keyboard.press('Escape');

    // Cancelada continua na lista de Apólices, com a data
    await irPara(page, 'Apólices');
    await page.getByRole('row', { name: /Joana Pereira Lima/ }).click();
    const editar = page.getByRole('dialog', { name: 'Editar apólice' });
    await escolher(editar.getByLabel('Status'), { label: 'Cancelada' });
    await editar.getByRole('button', { name: 'Salvar' }).click();
    await expect(editar.getByText('Informe a data do cancelamento.')).toBeVisible();
    await editar.getByLabel('Data do cancelamento').fill('2026-10-29');
    await escolher(editar.getByLabel('Motivo do cancelamento'), { label: 'Venda do bem' });
    await editar.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('Apólice atualizada.')).toBeVisible();
    await expect(page.getByRole('row', { name: /Joana Pereira Lima/ })).toContainText(
      'Cancelada em 29/10/2026',
    );

    // Comissões pendentes por cliente
    await irPara(page, 'Relatórios');
    await page.getByRole('tab', { name: 'Comissões pendentes' }).click();
    await escolher(page.getByLabel('Ver por'), { label: 'Cliente' });
    await expect(page.getByRole('table', { name: 'Pendentes por cliente' })).toContainText(
      'Joana Pereira Lima',
    );

    // Consórcio vai direto para o produtor que atende o produto
    await irPara(page, 'Usuários');
    await page.getByRole('row', { name: new RegExp(CORRETOR.nome) }).click();
    await page.getByRole('dialog').getByLabel('Consórcio').check();
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('Usuário atualizado.')).toBeVisible();
    await irPara(page, 'Cotações');
    await page.getByRole('button', { name: 'Nova oportunidade' }).click();
    const lead = page.getByRole('dialog');
    await lead.getByLabel('Contato').fill('Lead Consórcio');
    await escolher(lead.getByLabel('Produto'), { label: 'Consórcio' });
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText(`Cotação encaminhada para ${CORRETOR.nome}.`)).toBeVisible();
    await page.getByRole('button', { name: 'Abrir Lead Consórcio' }).click();
    await expect(page.getByRole('region', { name: 'Histórico da cotação' })).toContainText('Cadastrada');
  });

  test('mural da administração e bloco de notas do produtor', async ({ page }) => {
    await primeiroAcesso(page, URL);
    await cadastrarUsuario(page, CORRETOR, 'Produtor');

    // Administração: mural no Painel, recado para o produtor e checklist pessoal
    await irPara(page, 'Painel');
    const mural = page.getByLabel('Mural da equipe');
    await expect(mural.getByRole('heading', { name: 'Pendências do CRM' })).toBeVisible();
    await expect(mural.getByText('Nada pendente agora.')).toBeVisible();
    await mural.getByLabel('Novo recado').fill('Ligar para a Ana Paula sobre a 2ª parcela');
    await escolher(mural.getByLabel('Para'), { label: CORRETOR.nome });
    await mural.getByRole('button', { name: 'Enviar recado' }).click();
    await expect(page.getByText(`Recado enviado para ${CORRETOR.nome}.`)).toBeVisible();
    await expect(mural.getByRole('list', { name: 'Recados enviados' })).toContainText('Em aberto');
    await mural.getByLabel('Novo item do checklist').fill('Fechar pagamento dos produtores');
    await mural.getByLabel('Novo item do checklist').press('Enter');
    await expect(mural.getByRole('checkbox', { name: 'Fechar pagamento dos produtores' })).not.toBeChecked();
    // A administração não tem a gaveta: o mural fica no Painel.
    await expect(page.getByRole('button', { name: /^Bloco de notas/ })).toHaveCount(0);
    await sair(page);

    // Produtor: gaveta com o recado e o próprio checklist (não vê o da administração)
    await entrarPelaPrimeiraVez(page, URL, CORRETOR);
    await expect(page.getByLabel('Mural da equipe')).toHaveCount(0);
    await page.getByRole('button', { name: 'Bloco de notas, 1 em aberto' }).click();
    const gaveta = page.getByRole('dialog', { name: 'Bloco de notas' });
    await expect(gaveta).toContainText('Ligar para a Ana Paula sobre a 2ª parcela');
    await expect(gaveta).not.toContainText('Fechar pagamento dos produtores');
    await gaveta.getByRole('checkbox', { name: 'Feito' }).click();
    await expect(gaveta.getByRole('checkbox', { name: 'Feito' })).toBeChecked();
    await gaveta.getByLabel('Novo item do checklist').fill('Mandar a CNH do cliente');
    await gaveta.getByLabel('Novo item do checklist').press('Enter');
    await expect(page.getByRole('button', { name: 'Bloco de notas, 1 em aberto' })).toBeVisible();
    await gaveta.getByRole('checkbox', { name: 'Mandar a CNH do cliente' }).click();
    // O item feito sai da lista e fica em "Ver 1 feita"
    await expect(gaveta.getByText('1 de 1 feita')).toBeVisible();
    await gaveta.getByRole('button', { name: 'Ver 1 feita' }).click();
    await expect(gaveta.getByRole('checkbox', { name: 'Mandar a CNH do cliente' })).toBeChecked();
    await expect(page.getByRole('button', { name: 'Bloco de notas', exact: true })).toBeVisible();
    // A gaveta fecha com Esc e abre em qualquer tela
    await page.keyboard.press('Escape');
    await expect(gaveta).toHaveCount(0);
    await irPara(page, 'Clientes');
    await page.getByRole('button', { name: 'Bloco de notas', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Bloco de notas' })).toBeVisible();
    await sair(page);

    // Administração vê que o recado foi feito
    await entrar(page, URL, ADMIN);
    await expect(
      page.getByLabel('Mural da equipe').getByRole('list', { name: 'Recados enviados' }),
    ).toContainText('Feito');
  });

  test('financeiro sem a poupança', async ({ page }) => {
    await primeiroAcesso(page, URL);
    await importar(page, FIXTURE, /Movimentos/);
    await irPara(page, 'Financeiro');
    await expect(page.getByText('Saldo Bradesco')).toBeVisible();
    await expect(page.getByText(/Poupança/)).toHaveCount(0);
    await page.getByRole('tab', { name: 'Despesas' }).click();
    await escolher(page.getByLabel('Mês do vencimento'), { label: 'Todos' });
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
    await escolher(page.getByLabel('Mês'), { label: 'Todos' });
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
      await escolher(page.getByLabel('Produtor'), { index: 1 });
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
      await escolher(page.getByLabel('Ver por'), { label: 'Cliente' });
      await conferirLayout(page, tela.width);
      await page.screenshot({
        path: `test-results/telas/seguros-relatorio-pendentes-cliente-${tela.nome}.png`,
        fullPage: true,
        animations: 'disabled',
      });

      await irPara(page, 'Cotações');
      await page.getByRole('button', { name: 'Nova oportunidade' }).click();
      await escolher(page.getByRole('dialog').getByLabel('Origem'), { label: 'Indicação' });
      await conferirLayout(page, tela.width);
      await page.screenshot({
        path: `test-results/telas/seguros-form-cotacao-${tela.nome}.png`,
        animations: 'disabled',
      });
      await page.keyboard.press('Escape');
    });
  });
}
