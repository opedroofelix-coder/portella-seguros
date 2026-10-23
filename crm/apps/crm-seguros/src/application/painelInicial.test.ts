import type { Proposta } from '@portella/core';
import { CORRETORA, montarPainel } from '@portella/core';
import { describe, expect, it } from 'vitest';
import {
  crescimento,
  linhasPorProdutor,
  maioresEOutros,
  producaoPorMes,
  serieMensal,
  somarMes,
} from './painelInicial';

let n = 0;
const proposta = (p: Partial<Proposta>): Proposta => ({
  responsavelId: 'admin',
  criadoEm: '',
  atualizadoEm: '',
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

describe('painel inicial', () => {
  it('soma e subtrai meses atravessando o ano', () => {
    expect(somarMes('2026-01', -1)).toBe('2025-12');
    expect(somarMes('2025-11', 2)).toBe('2026-01');
    expect(somarMes('2026-10', -12)).toBe('2025-10');
  });

  it('produção por mês só das aprovadas e, para o produtor, só a fatia dele', () => {
    const ps = [
      proposta({ data: '2026-09-10', premioLiquido: 200000 }),
      proposta({
        data: '2026-10-02',
        premioLiquido: 300000,
        produtores: [
          { produtorId: 'gisele', percentual: 30 },
          { produtorId: 'danila', percentual: 10 },
        ],
      }),
      proposta({ data: '2026-10-05', status: 'pendente' }),
    ];
    const todos = producaoPorMes(ps);
    expect(todos.get('2026-09')).toBe(200000);
    expect(todos.get('2026-10')).toBe(300000);
    expect(producaoPorMes(ps, 'gisele').get('2026-10')).toBe(225000);
    expect(producaoPorMes(ps, 'danila').get('2026-09')).toBeUndefined();
  });

  it('série de 12 meses termina no mês pedido e completa com zero', () => {
    const serie = serieMensal(new Map([['2026-10', 5]]), '2026-10');
    expect(serie).toHaveLength(12);
    expect(serie[0]).toEqual({ mes: '2025-11', premio: 0 });
    expect(serie[11]).toEqual({ mes: '2026-10', premio: 5 });
  });

  it('crescimento sobre o mês anterior, o mesmo mês e o acumulado do ano', () => {
    const porMes = new Map([
      ['2025-01', 100],
      ['2025-10', 200],
      ['2026-01', 150],
      ['2026-09', 100],
      ['2026-10', 250],
    ]);
    const c = crescimento(porMes, '2026-10');
    expect(c.mes).toBeCloseTo(1.5);
    expect(c.mesAnoAnterior).toBeCloseTo(0.25);
    expect(c.acumulado).toBeCloseTo((500 - 300) / 300);
    expect(crescimento(new Map([['2026-10', 1]]), '2026-10')).toEqual({
      mes: null,
      mesAnoAnterior: null,
      acumulado: null,
    });
  });

  it('por produtor junta a produção do período com o saldo e o repasse pendentes; corretora por último', () => {
    const painel = montarPainel([
      proposta({ premioLiquido: 100000, comissaoReceber: 10000 }),
      proposta({ premioLiquido: 500000, comissaoReceber: 20000, produtores: [] }),
    ]);
    const linhas = linhasPorProdutor(painel);
    expect(linhas.map((l) => l.produtorId)).toEqual(['gisele', CORRETORA]);
    expect(linhas[0]).toMatchObject({ producao: 100000, saldo: 10000, repasse: 5000 });
    expect(linhas[1]).toMatchObject({ producao: 500000, saldo: 20000, repasse: 0 });
  });

  it('agrupa o resto em "Outras" só quando sobra mais de um', () => {
    const g = (chave: string, premio: number) => ({ chave, premio, quantidade: 1 });
    const grupos = [g('A', 5), g('B', 4), g('C', 3), g('D', 2)];
    expect(maioresEOutros(grupos, 3, (q) => `Outras ${q}`)).toHaveLength(4);
    const agrupado = maioresEOutros(grupos, 2, (q) => `Outras ${q}`);
    expect(agrupado.map((x) => x.chave)).toEqual(['A', 'B', 'Outras 2']);
    expect(agrupado[2]).toMatchObject({ premio: 5, quantidade: 2, outros: true });
  });
});
