import { ErroValidacao } from '@portella/core';
import { describe, expect, it } from 'vitest';
import type { Despesa, Movimento } from './financeiro';
import {
  extrato,
  resumirMes,
  saldosPorConta,
  situacaoDespesa,
  textoMovimento,
  validarDespesa,
  validarFechamento,
  validarMovimento,
} from './financeiro';

let n = 0;
const base = () => ({
  id: String(++n),
  responsavelId: 'a',
  criadoEm: '2026-10-01T00:00:00Z',
  atualizadoEm: '',
});
const mov = (p: Partial<Movimento>): Movimento => ({
  ...base(),
  conta: 'Bradesco',
  data: '2026-10-05',
  descricao: 'Mov',
  tipo: 'entrada',
  valor: 1000,
  ...p,
});
const desp = (p: Partial<Despesa>): Despesa => ({
  ...base(),
  descricao: 'Aluguel',
  valor: 300000,
  pago: 0,
  ...p,
});

describe('financeiro', () => {
  const movimentos = [
    mov({ tipo: 'saldo_inicial', data: '2026-09-30', valor: 1638931, descricao: 'Saldo anterior' }),
    mov({ data: '2026-10-02', valor: 3143 }),
    mov({ data: '2026-10-02', tipo: 'saida', valor: 10000 }),
    mov({ data: '2026-11-01', valor: 5000 }),
    mov({ conta: 'Poupança', data: '2026-10-02', valor: 100000 }),
  ];

  it('calcula saldo por conta e extrato acumulado', () => {
    expect(saldosPorConta(movimentos).get('Bradesco')).toBe(1638931 + 3143 - 10000 + 5000);
    expect(saldosPorConta(movimentos, '2026-10-31').get('Bradesco')).toBe(1638931 + 3143 - 10000);
    const e = extrato(movimentos, 'Bradesco');
    expect(e.map((m) => m.saldo)).toEqual([1638931, 1642074, 1632074, 1637074]);
  });

  it('resume o mês da conta principal e as despesas', () => {
    const r = resumirMes(
      movimentos,
      [
        desp({ vencimento: '2026-10-15', pago: 300000 }),
        desp({ vencimento: '2026-10-20', valor: 10000 }),
        desp({ vencimento: '2026-11-05' }),
      ],
      '2026-10',
    );
    expect(r).toEqual({
      entradas: 3143,
      saidas: 10000,
      despesas: 310000,
      despesasPagas: 300000,
      despesasAbertas: 10000,
    });
  });

  it('classifica despesas e valida dados', () => {
    expect(situacaoDespesa({ valor: 100, pago: 100 }, '2026-10-22')).toBe('paga');
    expect(situacaoDespesa({ valor: 100, pago: 0, vencimento: '2026-10-21' }, '2026-10-22')).toBe('vencida');
    expect(situacaoDespesa({ valor: 100, pago: 0, vencimento: '2026-10-22' }, '2026-10-22')).toBe('aberta');
    expect(() => validarMovimento(mov({ descricao: '' }))).toThrow(ErroValidacao);
    expect(() => validarDespesa(desp({ valor: 0 }))).toThrow(ErroValidacao);
    expect(() => validarFechamento({ mes: '2024-13' })).toThrow(ErroValidacao);
    expect(() => validarFechamento({ mes: '2024-12' })).not.toThrow();
  });
});

describe('origem do recebimento', () => {
  it('mostra a origem da entrada e o detalhe, sem repetir', () => {
    expect(textoMovimento(mov({ origem: 'Porto Seguro', descricao: 'Porto Seguro' }))).toBe('Porto Seguro');
    expect(textoMovimento(mov({ origem: 'Cliente (pagamento direto)', descricao: 'Saúde Ana' }))).toBe(
      'Cliente (pagamento direto) · Saúde Ana',
    );
    expect(textoMovimento(mov({ descricao: 'TED recebida' }))).toBe('TED recebida');
    expect(textoMovimento(mov({ tipo: 'saldo_inicial', descricao: 'Jan' }))).toBe('Saldo inicial · Jan');
  });
});
