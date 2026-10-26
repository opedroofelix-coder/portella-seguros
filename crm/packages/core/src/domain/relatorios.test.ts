import { describe, expect, it } from 'vitest';
import type { DadosComissao } from './relatorios';
import {
  CORRETORA,
  fechamentoDoMes,
  montarPainel,
  pagamentoMensal,
  pendentesPorProdutor,
} from './relatorios';
import type { Proposta } from './proposta';
import { descontoDoEstorno, fatiaProducao, propostaDoEstorno, repassePrevisto } from './proposta';

let n = 0;
const base = { responsavelId: 'admin', criadoEm: '', atualizadoEm: '' };
const proposta = (p: Partial<Proposta>): Proposta => ({
  ...base,
  id: `p${++n}`,
  clienteNome: `Cliente ${n}`,
  data: '2026-10-01',
  companhia: 'Porto Seguro',
  produto: 'Automóvel',
  premioLiquido: 100000,
  comissaoReceber: 10000,
  produtores: [{ produtorId: 'gisele', percentual: 50 }],
  recebimentos: [],
  status: 'aprovada',
  ...p,
});

const dados = (propostas: Proposta[]): DadosComissao => ({
  propostas,
  estornos: [
    {
      ...base,
      id: 'e1',
      responsavelId: 'gisele',
      segurado: 'S',
      companhia: 'Azul',
      produto: 'Auto',
      data: '2026-10-20',
      valor: 2000,
      descontoProdutor: 1000,
    },
  ],
  vales: [{ ...base, id: 'v1', responsavelId: 'gisele', data: '2026-10-15', valor: 500 }],
  pagamentos: [
    { ...base, id: 'pg1', responsavelId: 'gisele', mes: '2026-10', data: '2026-10-31', valor: 2000 },
  ],
});

describe('pagamento mensal', () => {
  const ps = [
    proposta({
      recebimentos: [
        { id: 'r1', data: '2026-10-05', valor: 8000, parcela: '1ª' },
        { id: 'r2', data: '2026-11-05', valor: 2000 },
      ],
    }),
    proposta({
      produtores: [
        { produtorId: 'gisele', percentual: 50 },
        { produtorId: 'mary', percentual: 15 },
      ],
      recebimentos: [{ id: 'r3', data: '2026-10-25', valor: 4000, repasses: { gisele: 1999 } }],
    }),
    proposta({ status: 'pendente', recebimentos: [{ id: 'r4', data: '2026-10-05', valor: 9999 }] }),
  ];

  it('soma os recebimentos do mês × % (ou o repasse fixo), menos estornos e vales', () => {
    const p = pagamentoMensal('gisele', '2026-10', dados(ps));
    expect(p.itens.map((i) => i.repasse)).toEqual([4000, 1999]);
    expect(p).toMatchObject({
      totalRecebido: 12000,
      totalRepasse: 5999,
      totalEstornos: 1000,
      totalVales: 500,
      liquido: 4499,
      pago: 2000,
      saldo: 2499,
    });
    expect(pagamentoMensal('mary', '2026-10', dados(ps)).totalRepasse).toBe(600);
  });

  it('fecha o mês com uma linha por produtor', () => {
    expect(
      fechamentoDoMes('2026-10', dados(ps))
        .map((l) => [l.produtorId, l.liquido])
        .sort(),
    ).toEqual([
      ['gisele', 4499],
      ['mary', 600],
    ]);
  });
});

describe('pendentes e painel', () => {
  it('lista o saldo a receber por produtor com o repasse projetado; vendas sem produtor ficam com a corretora', () => {
    const pend = pendentesPorProdutor([
      proposta({ recebimentos: [{ id: 'r', data: '2026-10-05', valor: 8000 }] }),
      proposta({ produtores: [] }),
      proposta({ recebimentos: [{ id: 'r', data: '2026-10-05', valor: 10000 }] }),
    ]);
    expect(pend.map((g) => [g.produtorId, g.saldo, g.repasseProjetado])).toEqual([
      [CORRETORA, 10000, 0],
      ['gisele', 2000, 1000],
    ]);
    expect(repassePrevisto({ comissaoReceber: 10000 }, 40)).toBe(4000);
  });

  it('produção por produtor é proporcional ao % dentro da divisão', () => {
    const p = proposta({
      produtores: [
        { produtorId: 'gisele', percentual: 30 },
        { produtorId: 'mary', percentual: 10 },
      ],
    });
    expect(fatiaProducao(p, 'gisele')).toBe(0.75);
    const painel = montarPainel([p]);
    expect(painel.porProdutor).toEqual([
      { chave: 'gisele', premio: 75000, quantidade: 1 },
      { chave: 'mary', premio: 25000, quantidade: 1 },
    ]);
  });

  it('separa seguro novo e renovação, agrupa por produto e seguradora e calcula o crescimento', () => {
    const painel = montarPainel(
      [
        proposta({ data: '2025-10-10', tipoNegocio: 'novo', premioLiquido: 50000 }),
        proposta({ data: '2026-09-10', tipoNegocio: 'renovacao', premioLiquido: 80000, produto: 'Saúde' }),
        proposta({
          data: '2026-10-10',
          tipoNegocio: 'novo',
          premioLiquido: 100000,
          companhia: 'HDI',
          recebimentos: [{ id: 'r', data: '2026-10-20', valor: 5000 }],
        }),
        proposta({ data: '2026-10-11', premioLiquido: 20000 }),
        proposta({ data: '2026-10-12', premioLiquido: 999999, status: 'pendente' }),
      ],
      { de: '2026-09', ate: '2026-10' },
    );
    expect(painel.producao).toBe(200000);
    expect(painel.porTipo).toEqual({
      novo: { premio: 100000, quantidade: 1 },
      renovacao: { premio: 80000, quantidade: 1 },
      nao_informado: { premio: 20000, quantidade: 1 },
    });
    expect(painel.porCompanhia).toEqual([
      { chave: 'Porto Seguro', premio: 100000, quantidade: 2 },
      { chave: 'HDI', premio: 100000, quantidade: 1 },
    ]);
    expect(painel.porProduto.map((g) => g.chave)).toEqual(['Automóvel', 'Saúde']);
    expect(painel).toMatchObject({ comissaoRecebida: 5000, comissaoRepassada: 2500 });
    const out = painel.crescimentoMensal.find((l) => l.periodo === '2026-10')!;
    expect(out.premio).toBe(120000);
    expect(out.variacaoAnterior).toBeCloseTo(0.5);
    expect(out.variacaoAnoAnterior).toBeCloseTo(1.4);
    expect(painel.crescimentoAnual.map((l) => [l.periodo, l.premio])).toEqual([
      ['2025', 50000],
      ['2026', 200000],
    ]);
  });
});

describe('vitalício', () => {
  it('marca como vitalícios os recebimentos depois de quitada a comissão', async () => {
    const { marcarVitalicios } = await import('./proposta');
    const marcados = marcarVitalicios({
      comissaoReceber: 300,
      percentualVitalicio: 2,
      recebimentos: [
        { id: 'c', data: '2026-04-01', valor: 100 },
        { id: 'a', data: '2026-01-01', valor: 100 },
        { id: 'b', data: '2026-02-01', valor: 200, vitalicio: true },
        { id: 'd', data: '2026-05-01', valor: 6 },
      ],
    });
    expect(marcados.map((r) => [r.id, Boolean(r.vitalicio)])).toEqual([
      ['a', false],
      ['b', false],
      ['c', true],
      ['d', true],
    ]);
    expect(
      marcarVitalicios({ comissaoReceber: 0, recebimentos: [{ id: 'x', data: '2026-01-01', valor: 5 }] })[0]
        ?.vitalicio,
    ).toBeUndefined();
  });
});

describe('estorno do produtor', () => {
  const vendas = [
    { numero: '123.456-7', produtores: [{ produtorId: 'gisele', percentual: 50 }] },
    { numero: '1234567', produtores: [{ produtorId: 'mary', percentual: 40 }] },
  ];
  it('acha a proposta pelo nº da apólice, de preferência a do produtor', () => {
    expect(propostaDoEstorno(vendas, '1234567', 'mary')).toBe(vendas[1]);
    expect(propostaDoEstorno(vendas, '123456-7', 'gisele')).toBe(vendas[0]);
    expect(propostaDoEstorno(vendas, '123456-7')).toBe(vendas[0]);
    expect(propostaDoEstorno(vendas, '999')).toBeUndefined();
    expect(propostaDoEstorno(vendas, '  ')).toBeUndefined();
  });
  it('desconta do produtor só o % dele sobre a comissão estornada', () => {
    expect(descontoDoEstorno(100000, 40)).toBe(40000);
    expect(descontoDoEstorno(100000, 50)).toBe(50000);
    expect(descontoDoEstorno(33333, 15)).toBe(5000);
  });
});
