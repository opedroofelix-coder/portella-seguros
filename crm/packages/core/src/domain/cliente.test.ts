import { describe, expect, it } from 'vitest';
import { corresponde, validarCliente } from './cliente';
import { ErroValidacao } from './erros';
import { resumirFunil, type Oportunidade } from './oportunidade';

describe('cliente', () => {
  it('aceita cliente mínimo e rejeita dados inválidos', () => {
    expect(() => validarCliente({ nome: 'Maria', tipoPessoa: 'PF' })).not.toThrow();
    try {
      validarCliente({ nome: 'M', tipoPessoa: 'PF', documento: '123', email: 'x', telefone: '1' });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ErroValidacao);
      expect(Object.keys((e as ErroValidacao).campos).sort()).toEqual(['documento', 'email', 'nome', 'telefone']);
    }
  });

  it('busca sem acento, por partes e por dígitos', () => {
    expect(corresponde('jose silva', 'José da Silva')).toBe(true);
    expect(corresponde('52998224725', 'Ana', '529.982.247-25')).toBe(true);
    expect(corresponde('pedro', 'José da Silva')).toBe(false);
    expect(corresponde('', 'qualquer')).toBe(true);
  });
});

describe('funil', () => {
  it('resume etapas e conversão', () => {
    const base = { responsavelId: 'u', criadoEm: '', atualizadoEm: '', nomeContato: 'X', produto: 'Auto' };
    const ops = (['novo', 'ganho', 'ganho', 'perdido'] as const).map(
      (etapa, i): Oportunidade => ({ ...base, id: String(i), etapa }),
    );
    const r = resumirFunil(ops);
    expect(r.emAberto).toBe(1);
    expect(r.porEtapa.ganho).toBe(2);
    expect(r.taxaConversao).toBeCloseTo(2 / 3);
    expect(resumirFunil([]).taxaConversao).toBeNull();
  });
});
