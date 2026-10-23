import { ErroValidacao } from '@portella/core';
import { describe, expect, it } from 'vitest';
import type { Apolice } from './apolice';
import { comissao, filaRenovacao, resumirCarteira, situacao, validarApolice } from './apolice';

const HOJE = '2026-10-22';
let n = 0;
const apolice = (p: Partial<Apolice>): Apolice => ({
  id: String(++n),
  responsavelId: 'u',
  criadoEm: '',
  atualizadoEm: '',
  clienteId: 'c',
  seguradora: 'porto',
  ramo: 'auto',
  inicioVigencia: '2026-01-01',
  fimVigencia: '2027-01-01',
  renovacao: 'pendente',
  ...p,
});

describe('apólice', () => {
  it('calcula a situação pela vigência', () => {
    expect(situacao(apolice({ fimVigencia: '2027-06-01' }), HOJE)).toBe('vigente');
    expect(situacao(apolice({ fimVigencia: '2026-11-21' }), HOJE)).toBe('a_vencer');
    expect(situacao(apolice({ fimVigencia: '2026-10-22' }), HOJE)).toBe('a_vencer');
    expect(situacao(apolice({ fimVigencia: '2026-10-21' }), HOJE)).toBe('vencida');
    expect(situacao(apolice({ cancelada: true }), HOJE)).toBe('cancelada');
    expect(situacao(apolice({ ramo: 'saude', fimVigencia: undefined }), HOJE)).toBe('vigente');
  });

  it('a apólice nova fica "a iniciar" e a renovada não aparece como vencida', () => {
    const nova = apolice({ inicioVigencia: '2026-11-10', fimVigencia: '2027-11-10' });
    expect(situacao(nova, HOJE)).toBe('a_iniciar');
    expect(situacao(apolice({ fimVigencia: '2026-09-01', renovacao: 'renovada' }), HOJE)).toBe('renovada');
    expect(situacao(apolice({ fimVigencia: '2026-09-01', renovacao: 'nao_renovada' }), HOJE)).toBe('vencida');
  });

  it('não conta em dobro a apólice renovada antes do fim da anterior', () => {
    const anterior = apolice({ premioLiquido: 100000, fimVigencia: '2026-11-10', renovacao: 'renovada' });
    const nova = apolice({ premioLiquido: 110000, inicioVigencia: '2026-11-10', fimVigencia: '2027-11-10' });
    const r = resumirCarteira([anterior, nova], HOJE);
    expect(r.ativas).toBe(1);
    expect(r.aIniciar).toBe(1);
    expect(r.premioAtivo).toBe(100000);
  });

  it('calcula a comissão sobre o prêmio líquido', () => {
    expect(comissao({ premioLiquido: 200000, comissaoPercentual: 15 })).toBe(30000);
    expect(comissao({ premioLiquido: 200000 })).toBeNull();
  });

  it('valida campos obrigatórios e vigência', () => {
    expect(() => validarApolice(apolice({}))).not.toThrow();
    expect(() => validarApolice(apolice({ fimVigencia: '2025-12-31' }))).toThrow(ErroValidacao);
    expect(() => validarApolice(apolice({ comissaoPercentual: 120 }))).toThrow(ErroValidacao);
    expect(() => validarApolice({})).toThrow(ErroValidacao);
    expect(() => validarApolice(apolice({ ramo: 'vida', fimVigencia: undefined }))).not.toThrow();
  });

  it('monta a fila de renovação na ordem de vencimento, sem renovadas nem canceladas', () => {
    const fila = filaRenovacao(
      [
        apolice({ id: 'b', fimVigencia: '2026-12-01' }),
        apolice({ id: 'a', fimVigencia: '2026-11-01', renovacao: 'em_contato' }),
        apolice({ id: 'x', fimVigencia: '2026-11-05', renovacao: 'renovada' }),
        apolice({ id: 'y', fimVigencia: '2026-11-05', cancelada: true }),
        apolice({ id: 'z', fimVigencia: '2027-05-01' }),
        apolice({ id: 'v', fimVigencia: '2026-10-10' }),
        apolice({ id: 'antiga', fimVigencia: '2026-08-01' }),
        apolice({ id: 'continua', ramo: 'saude', fimVigencia: undefined }),
      ],
      HOJE,
      60,
    );
    expect(fila.map((a) => a.id)).toEqual(['v', 'a', 'b']);
  });

  it('resume a carteira ativa', () => {
    const r = resumirCarteira(
      [
        apolice({
          seguradora: 'porto',
          premioLiquido: 100000,
          premioTotal: 107380,
          comissaoPercentual: 20,
          fimVigencia: '2026-11-10',
        }),
        apolice({
          seguradora: 'porto',
          ramo: 'vida',
          premioLiquido: 50000,
          comissaoPercentual: 10,
          fimVigencia: '2027-08-01',
        }),
        apolice({ seguradora: 'hdi', premioLiquido: 80000, fimVigencia: '2026-12-15' }),
        apolice({ seguradora: 'hdi', fimVigencia: '2026-01-01' }),
        apolice({ seguradora: 'hdi', cancelada: true }),
      ],
      HOJE,
    );
    expect(r.ativas).toBe(3);
    expect(r.aVencer30).toBe(1);
    expect(r.aVencer60).toBe(2);
    expect(r.premioAtivo).toBe(100000 + 50000 + 80000);
    expect(r.comissaoAtiva).toBe(20000 + 5000);
    expect(r.porSeguradora[0]).toEqual({ seguradora: 'porto', quantidade: 2, premio: 150000 });
    expect(r.porRamo).toEqual([
      { ramo: 'auto', quantidade: 2 },
      { ramo: 'vida', quantidade: 1 },
    ]);
  });
});
