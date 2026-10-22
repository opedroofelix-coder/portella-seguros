import { describe, expect, it } from 'vitest';
import type { ProdutoDemo } from './gerador';
import { gerarDemo, somarMeses } from './gerador';

const produtos: ProdutoDemo[] = [
  { nome: 'Automóvel', peso: 3, premio: [1000, 3000], comissao: [10, 20], parcelas: [1, 4] },
  { nome: 'Vida', peso: 1, premio: [500, 900], comissao: [25], parcelas: [12], vitalicio: 2 },
];
const opcoes = {
  hoje: new Date('2026-10-22T12:00:00'),
  meses: 12,
  quantidade: 80,
  produtos,
  companhias: ['A', 'B'],
};

describe('dados da demonstração', () => {
  it('é determinístico e só tem clientes fictícios', () => {
    const a = gerarDemo(opcoes);
    expect(gerarDemo(opcoes)).toEqual(a);
    expect(gerarDemo({ ...opcoes, semente: 1 })).not.toEqual(a);
    expect(a.clientes).toHaveLength(80);
    expect(a.clientes.every((c) => c.nome.startsWith('Cliente Teste '))).toBe(true);
  });

  it('recebimentos nunca passam da comissão nem de hoje; pagamentos só de meses fechados', () => {
    const { vendas, pagamentos, estornos } = gerarDemo(opcoes);
    for (const { proposta: p } of vendas) {
      expect(p.data <= '2026-10-22').toBe(true);
      const recebido = p.recebimentos.reduce((t, r) => t + r.valor, 0);
      expect(recebido).toBeLessThanOrEqual(p.comissaoReceber + 0.01);
      expect(p.recebimentos.every((r) => r.data <= '2026-10-22' && r.data > p.data)).toBe(true);
      expect(p.produtores.reduce((t, x) => t + x.percentual, 0)).toBeLessThanOrEqual(100);
    }
    expect(vendas.some((v) => !v.proposta.produtores.length)).toBe(true);
    expect(vendas.some((v) => v.proposta.produtores.length === 2)).toBe(true);
    expect(pagamentos.length).toBeGreaterThan(0);
    expect(pagamentos.every((p) => p.mes < '2026-10' && p.valor > 0)).toBe(true);
    expect(estornos.every((e) => e.data <= '2026-10-22' && e.descontoProdutor > 0)).toBe(true);
  });

  it('soma meses sem pular o fim do mês', () => {
    expect(somarMeses(new Date('2026-01-31T00:00:00Z'), 1).toISOString().slice(0, 10)).toBe('2026-02-28');
    expect(somarMeses(new Date('2026-10-22T00:00:00Z'), -14, 5).toISOString().slice(0, 10)).toBe(
      '2025-08-05',
    );
  });
});
