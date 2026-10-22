import { describe, expect, it } from 'vitest';
import type { LancamentoComissao } from './comissao';
import { formatarParcela, mesCompetencia, resumirComissoes, situacaoComissao, validarComissao } from './comissao';
import { ErroValidacao } from './erros';

let n = 0;
const c = (p: Partial<LancamentoComissao>): LancamentoComissao => ({
  id: String(++n), responsavelId: 'carla', criadoEm: '2026-10-01T00:00:00Z', atualizadoEm: '',
  clienteNome: 'Cliente Teste', produto: 'Auto', companhia: 'Suhai', comissaoReceber: 10000, comissaoRecebida: 10000, ...p,
});

describe('comissões', () => {
  it('formata parcelas como na planilha', () => {
    expect(formatarParcela('8.10')).toBe('8/10');
    expect(formatarParcela('3/3')).toBe('3/3');
    expect(formatarParcela('1.2.3.')).toBe('1, 2, 3');
    expect(formatarParcela(14)).toBe('14');
    expect(formatarParcela('-')).toBeUndefined();
  });

  it('classifica a situação e o mês de competência', () => {
    expect(situacaoComissao(c({}))).toBe('recebida');
    expect(situacaoComissao(c({ comissaoRecebida: 0 }))).toBe('a_receber');
    expect(situacaoComissao(c({ comissaoReceber: -500, comissaoRecebida: -500 }))).toBe('estorno');
    expect(mesCompetencia(c({ dataProposta: '2024-07-19', dataRecebimento: '2024-12-30' }))).toBe('2024-12');
    expect(mesCompetencia(c({ dataProposta: '2024-07-19' }))).toBe('2024-07');
  });

  it('valida campos obrigatórios', () => {
    expect(() => validarComissao(c({}))).not.toThrow();
    expect(() => validarComissao(c({ companhia: '' }))).toThrow(ErroValidacao);
    expect(() => validarComissao(c({ percentualRepasse: 120 }))).toThrow(ErroValidacao);
  });

  it('resume recebimentos, estornos e repasses por corretor', () => {
    const r = resumirComissoes([
      c({ comissaoReceber: 10000, comissaoRecebida: 10000, repasse: 2000, repassePago: 2000 }),
      c({ comissaoReceber: 5000, comissaoRecebida: 0, repasse: 1000 }),
      c({ estorno: true, comissaoReceber: -3000, comissaoRecebida: -3000, repasse: -600, repassePago: -600 }),
      c({ responsavelId: 'adm', vendaDaCorretora: true, companhia: 'Porto', comissaoReceber: 7000, comissaoRecebida: 7000 }),
    ]);
    expect(r).toMatchObject({ aReceber: 5000, recebido: 17000, estornos: -3000, repasse: 2400, repassePago: 1400, liquidoCorretora: 17000 - 3000 - 2400 });
    expect(r.porCorretor).toEqual([{ responsavelId: 'carla', recebido: 7000, repasse: 2400, repassePago: 1400, saldo: 1000 }]);
    expect(r.porCompanhia[0]).toEqual({ companhia: 'Suhai', recebido: 10000 });
  });
});
