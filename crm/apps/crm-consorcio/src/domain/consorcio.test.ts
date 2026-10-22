import { ErroValidacao } from '@portella/core';
import { describe, expect, it } from 'vitest';
import type { Cota } from './cota';
import { parcelasRestantes, progresso, resumirCotas, validarCota } from './cota';
import { validarLance } from './lance';

let n = 0;
const cota = (p: Partial<Cota>): Cota => ({
  id: String(++n), responsavelId: 'u', criadoEm: '', atualizadoEm: '',
  clienteId: 'c', administradora: 'Adm Teste', grupo: '1001', cota: '12', tipoBem: 'imovel',
  valorCredito: 30000000, prazoMeses: 200, dataAdesao: '2026-01-10', status: 'ativa', ...p,
});

describe('cota', () => {
  it('valida dados e exige contemplação quando contemplada', () => {
    expect(() => validarCota(cota({}))).not.toThrow();
    expect(() => validarCota(cota({ valorCredito: 0 }))).toThrow(ErroValidacao);
    expect(() => validarCota(cota({ parcelasPagas: 201 }))).toThrow(ErroValidacao);
    expect(() => validarCota(cota({ status: 'contemplada' }))).toThrow(/contemplação|cota/);
    expect(() => validarCota(cota({ status: 'contemplada', contemplacao: { data: '2026-05-01', forma: 'sorteio' } }))).not.toThrow();
  });

  it('calcula parcelas restantes e progresso', () => {
    expect(parcelasRestantes({ prazoMeses: 100, parcelasPagas: 30 })).toBe(70);
    expect(parcelasRestantes({ prazoMeses: 100 })).toBe(100);
    expect(progresso({ prazoMeses: 200, parcelasPagas: 50 })).toBe(0.25);
  });

  it('resume a carteira por administradora e tipo de bem', () => {
    const r = resumirCotas([
      cota({ administradora: 'A', valorCredito: 100 }),
      cota({ administradora: 'A', valorCredito: 200, status: 'contemplada', tipoBem: 'automovel', contemplacao: { data: '2026-01-01', forma: 'lance' } }),
      cota({ administradora: 'B', valorCredito: 300 }),
      cota({ administradora: 'B', status: 'cancelada' }),
    ]);
    expect(r).toMatchObject({ ativas: 2, contempladas: 1, creditoAtivo: 400, creditoContemplado: 200 });
    expect(r.porAdministradora).toEqual([
      { administradora: 'A', quantidade: 2, credito: 300 },
      { administradora: 'B', quantidade: 1, credito: 300 },
    ]);
    expect(r.porTipo[0]).toEqual({ tipo: 'imovel', quantidade: 2 });
  });
});

describe('lance', () => {
  it('exige percentual ou valor', () => {
    expect(() => validarLance({ cotaId: 'x', assembleia: '2026-11-10', tipo: 'livre', resultado: 'aguardando' })).toThrow(ErroValidacao);
    expect(() => validarLance({ cotaId: 'x', assembleia: '2026-11-10', tipo: 'livre', percentual: 30, resultado: 'aguardando' })).not.toThrow();
    expect(() => validarLance({ cotaId: 'x', assembleia: '2026-11-10', tipo: 'livre', percentual: 130, resultado: 'aguardando' })).toThrow();
  });
});
