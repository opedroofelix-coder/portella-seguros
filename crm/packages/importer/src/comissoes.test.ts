import { describe, expect, it } from 'vitest';
import type { Aba } from './converter';
import { converterComissoes, ehFormatoComissoes } from './comissoes';

// Estrutura igual à da planilha "Controle de Comissões", com dados fictícios.
const d = (s: string) => new Date(`${s}T00:00:00Z`);
const aReceber: Aba = {
  nome: 'A Receber',
  linhas: [
    ['CONTROLE DE COMISSOES'],
    [
      'Data \nProposta',
      'Nr.\n Proposta',
      'Nome/Razão Social',
      'Produto',
      'Cia Seguradora',
      'Produtor',
      'Parcela',
      'Dt. Recebto.',
      'Premio Liquido',
      'Comissão a Receber Seguradora',
      'Comissão Recebida',
      'Saldo a Receber',
    ],
    [
      d('2024-04-23'),
      '3144210781',
      'Cliente Teste Um',
      'Automovel',
      'Azul',
      'Carla',
      '8.10',
      d('2024-12-18'),
      4194.49,
      83.89,
      83.89,
      { formula: 'J3-K3', result: 0 },
    ],
    [
      d('2024-05-08'),
      '3149720173',
      'Cliente Teste Dois',
      'Endosso',
      'Azul',
      'Carla',
      '3.5',
      d('2024-12-06'),
      269.1,
      13.39,
      13.39,
      0,
    ],
    [
      d('2014-02-15'),
      '56408',
      'Cliente Teste Três',
      'Vida',
      'Porto Seguro',
      'Corretora',
      '11.12',
      d('2024-12-14'),
      294.24,
      29.42,
      29.42,
      0,
    ],
    [
      d('2024-07-19'),
      '9125116',
      'Cliente Teste Quatro',
      'Consorcio',
      'Magalu',
      'Gabriel',
      '5.12',
      d('2024-12-05'),
      420000,
      1680,
      1680,
      0,
    ],
    [d('2024-12-01'), '777', 'Cliente Teste Cinco', 'Saude', 'GNDI', 'Carla', '1.1', null, 500, 50, 0, 50],
    [],
    ['TOTAL', null, null, null, null, null, null, null, 425258.08, 1856.7, 1806.7, 50],
  ],
};
const comissoesCarla: Aba = {
  nome: 'Comissoes Carla',
  linhas: [
    ['Controle de Vendas e Comissões'],
    [
      'Data \nProposta',
      'Nr.\n Proposta',
      'Nome/Razão Social',
      'Produto',
      'Cia Seguradora',
      'Parcela',
      'Dt. Recebto.',
      'Prêmio',
      'Comissao Recebida Seguradora',
      'Comissão a pagar Corretor',
      'Comissão Paga',
      'Saldo',
    ],
    [
      d('2024-04-23'),
      '3144210781',
      'Cliente Teste Um',
      'Automovel',
      'Azul',
      '8.10',
      d('2024-12-30'),
      4194.49,
      83.89,
      { formula: 'I3*20%', result: 16.778 },
      { formula: 'J3', result: 16.778 },
      0,
    ],
    [
      d('2024-05-08'),
      '3149720173',
      'Cliente Teste Dois',
      'Automovel',
      'Azul',
      '3.5',
      d('2024-12-30'),
      269.1,
      13.39,
      2.68,
      2.68,
      0,
    ],
    [d('2024-12-01'), '777', 'Cliente Teste Cinco', 'Saude', 'GNDI', '1.1', null, 500, 50, 10, 0, 10],
    [],
    ['Total', null, null, null, null, null, null, 4963.59, 147.28, 29.46, 19.46],
    [],
    ['Controle de Estornos', 'Controle de Estornos'],
    [
      'Data',
      'Nr.\n Proposta',
      'Nome/Razão Social',
      'Produto',
      'Cia Seguradora',
      'Parcela',
      'Dt. Desconto',
      'Prêmio',
      'Comissão Descontada Segurado',
      'Comissão a Descontar',
      'Comissão Descontada',
      'Saldo',
    ],
    [
      d('2024-12-08'),
      null,
      'Cliente Teste Seis',
      'Estorno',
      'Azul',
      '1.1',
      d('2024-12-30'),
      0,
      -574.01,
      -114.8,
      -114.8,
      null,
    ],
    [
      d('2024-12-23'),
      null,
      'Cliente Teste Sete',
      null,
      null,
      '1.1',
      d('2024-12-30'),
      0,
      -100,
      -100,
      -100,
      null,
    ],
    ['TOTAL'],
  ],
};
const comissoesDeliziane: Aba = {
  nome: 'Comissoes Deliziane',
  linhas: [
    ['Controle de Vendas e Comissões'],
    comissoesCarla.linhas[1]!,
    // Mesma parcela da Carla: repasse de supervisão
    [
      d('2024-04-23'),
      '3144210781',
      'Cliente Teste Um',
      'Automovel',
      'Azul',
      '8.10',
      d('2024-12-30'),
      4194.49,
      83.89,
      33.56,
      33.56,
      0,
    ],
  ],
};
const bradesco: Aba = {
  nome: 'Bradesco',
  linhas: [
    [],
    ['Agencia 0000 C/C: 00000-0'],
    ['Data', 'Histórico', 'Doc.', 'Crédito - R$', 'Débito - R$ ', 'Saldo - R$ '],
    [d('2024-10-31'), 'Saldo Anterior', null, 0, 0, 1000],
    [d('2024-12-02'), 'Recebimento Azul Seguros', null, 83.89, 0, 1083.89],
    [d('2024-12-02'), 'Transferencia Corretor Teste', null, 0, 16.78, 1067.11],
    [null, 'RESUMO DA CONTA CORRENTE'],
    [d('2024-12-01'), 'I - Saldo Inicial', null, null, 'xxxxxx', 1000],
  ],
};
const demonstrativo: Aba = {
  nome: 'Demonstrativo de Receitas e Des',
  linhas: [
    ['CONTROLE FINANCEIRO'],
    [],
    [null, 'Inicio', 'Final', 'Histórico ', 'Receita', null, 'Saldo '],
    ['0001', d('2024-12-01'), d('2024-12-30'), 'Recebimentos', 1806.7, 0, 1806.7],
    ['DESPESAS EMPRESA'],
    ['Item', 'Venc.', 'Data Pgto', 'Histórico', 'Débito', 'Pago', 'Saldo'],
    ['001', d('2024-12-01'), d('2024-12-02'), 'Provedor de internet', 100, 100, null],
    ['002', d('2024-12-15'), null, 'Aluguel sala', 3327, 0, null],
    [null, null, null, null, 3427, 100],
    ['COMISSÕES PARCEIROS'],
    ['001', d('2024-12-01'), d('2024-12-30'), 'Comissões Carla', 29.46, 19.46],
  ],
};
const poupanca: Aba = {
  nome: 'Poupanca Portella',
  linhas: [
    ['POUPANÇA PORTELLA', 'POUPANÇA PORTELLA', null, 'TRACKER', 'TRACKER'],
    ['Data Depósito', 'Depositado', 'Qtde', 'Data Depósito', 'Depositado'],
    ['SALDO', 0, null, 'SALDO', 0],
    [d('2024-11-01'), 11000, 1, d('2024-11-01'), 1000],
    [d('2024-09-30'), -15000, 2, null, 0],
    ['TOTAL', -4000, null, 'TOTAL', 1000],
  ],
};
const faturamento: Aba = {
  nome: 'Faturamento',
  linhas: [
    ['FATURAMENTO', 'FATURAMENTO', null, 'CONSORCIO', 'CONSORCIO'],
    ['Data Depósito', 'Depositado', null, 'Data Depósito', 'Depositado'],
    ['SALDO', 0],
    [d('2024-11-30'), 58444.12, null, d('2024-11-30'), 498000],
    [d('2024-12-31'), 65341.09, null, d('2024-12-31'), null],
    ['TOTAL', 123785.21, null, 'TOTAL', 498000],
  ],
};
const abas = [
  { nome: 'Essencial Allianz', linhas: [] },
  bradesco,
  demonstrativo,
  aReceber,
  comissoesCarla,
  comissoesDeliziane,
  poupanca,
  faturamento,
];

describe('formato "Controle de Comissões"', () => {
  const { seguros, consorcio, relatorio } = converterComissoes(
    abas,
    'teste.xlsx',
    new Date('2026-10-22T00:00:00Z'),
  );
  const comissoes = seguros.comissoes as Array<Record<string, unknown>>;
  const daCliente = (nome: string) => comissoes.filter((c) => c.clienteNome === nome);

  it('reconhece o formato', () => {
    expect(ehFormatoComissoes(abas)).toBe(true);
    expect(ehFormatoComissoes([{ nome: 'Clientes', linhas: [] }])).toBe(false);
  });

  it('usa "A Receber" como base e completa o repasse pela aba do corretor', () => {
    const [um, adicional] = daCliente('Cliente Teste Um');
    expect(um).toMatchObject({
      parcela: '8/10',
      dataRecebimento: '2024-12-18',
      comissaoReceber: 83.89,
      comissaoRecebida: 83.89,
      repasse: 16.78,
      repassePago: 16.78,
      responsavel: 'Carla',
      percentualRepasse: 20,
    });
    // Repasse da Deliziane sobre a mesma parcela, sem repetir o valor da seguradora
    expect(adicional).toMatchObject({
      comissaoReceber: 0,
      comissaoRecebida: 0,
      repasse: 33.56,
      responsavel: 'Deliziane',
    });
    // Produto diferente nas duas abas (Endosso × Automovel) não impede a junção
    expect(daCliente('Cliente Teste Dois')).toEqual([
      expect.objectContaining({ produto: 'Endosso', repasse: 2.68 }),
    ]);
    expect(daCliente('Cliente Teste Cinco')[0]).toMatchObject({
      comissaoRecebida: 0,
      repasse: 10,
      repassePago: 0,
    });
  });

  it('marca vendas da corretora (sem repasse) e lê os estornos, inclusive sem seguradora', () => {
    expect(daCliente('Cliente Teste Três')[0]).toMatchObject({
      vendaDaCorretora: true,
      responsavel: undefined,
      repasse: undefined,
    });
    expect(daCliente('Cliente Teste Seis')[0]).toMatchObject({
      estorno: true,
      comissaoReceber: -574.01,
      repasse: -114.8,
      responsavel: 'Carla',
    });
    expect(daCliente('Cliente Teste Sete')[0]).toMatchObject({
      estorno: true,
      companhia: 'Não informada',
      repasse: -100,
    });
  });

  it('cria apólices com vigência estimada só para ramos anuais e não cria para endosso nem estorno', () => {
    const apolices = seguros.apolices as Array<Record<string, unknown>>;
    expect(apolices.map((a) => a.ramo).sort()).toEqual(['Automovel', 'Saude', 'Vida']);
    expect(apolices.find((a) => a.ramo === 'Automovel')).toMatchObject({
      inicioVigencia: '2024-04-23',
      fimVigencia: '2025-04-23',
      vigenciaEstimada: true,
      seguradora: 'Azul',
    });
    expect(apolices.find((a) => a.ramo === 'Vida')).toMatchObject({ fimVigencia: undefined });
    expect(daCliente('Cliente Teste Um')[0]?.vendaChave).toBe('azul|3144210781');
  });

  it('separa o consórcio com cota pendente de grupo, cota e prazo', () => {
    expect(consorcio.clientes.map((c) => c.nome)).toEqual(['Cliente Teste Quatro']);
    expect(consorcio.cotas).toEqual([
      expect.objectContaining({
        administradora: 'Magalu',
        numeroProposta: '9125116',
        valorCredito: 420000,
        dataAdesao: '2024-07-19',
        responsavel: 'Gabriel',
      }),
    ]);
    expect((consorcio.cotas as Array<Record<string, unknown>>)[0]).not.toHaveProperty('grupo');
    expect(consorcio.comissoes).toEqual([
      expect.objectContaining({ comissaoRecebida: 1680, vendaChave: 'magalu|9125116' }),
    ]);
  });

  it('lê extrato, despesas, poupança e faturamento', () => {
    expect(seguros.movimentos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ conta: 'Bradesco', tipo: 'saldo_inicial', valor: 1000 }),
        expect.objectContaining({ conta: 'Bradesco', tipo: 'saida', valor: 16.78 }),
        expect.objectContaining({
          conta: 'Poupança Portella',
          tipo: 'saida',
          valor: 15000,
          descricao: 'Resgate',
        }),
        expect.objectContaining({ conta: 'Tracker', tipo: 'entrada', valor: 1000 }),
      ]),
    );
    expect((seguros.movimentos as unknown[]).length).toBe(3 + 2 + 1);
    expect(seguros.despesas).toEqual([
      expect.objectContaining({
        descricao: 'Provedor de internet',
        valor: 100,
        pago: 100,
        pagamento: '2024-12-02',
      }),
      expect.objectContaining({ descricao: 'Aluguel sala', valor: 3327, pago: 0 }),
    ]);
    expect(seguros.fechamentos).toEqual([
      { mes: '2024-11', faturamento: 58444.12, creditoConsorcio: 498000 },
      { mes: '2024-12', faturamento: 65341.09 },
    ]);
  });

  it('relata o uso de cada aba', () => {
    expect(relatorio.abas.find((a) => a.nome === 'Essencial Allianz')?.uso).toMatch(/ignorada/);
    expect(relatorio.abas.find((a) => a.nome === 'Comissoes Deliziane')?.uso).toMatch(
      /1 repasse\(s\) adicional/,
    );
    expect(relatorio.avisos).toEqual([]);
  });
});
