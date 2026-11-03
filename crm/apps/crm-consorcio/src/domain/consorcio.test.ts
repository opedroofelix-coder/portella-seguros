import { ErroValidacao } from '@portella/core';
import { describe, expect, it } from 'vitest';
import type { Cota } from './cota';
import {
  camposPendentes,
  conferirCotaRepetida,
  identificacaoCota,
  parcelasRestantes,
  progresso,
  resumirCotas,
  validarCota,
} from './cota';
import { validarLance, validarLanceNaCota } from './lance';

let n = 0;
const cota = (p: Partial<Cota>): Cota => ({
  id: String(++n),
  responsavelId: 'u',
  criadoEm: '',
  atualizadoEm: '',
  clienteId: 'c',
  administradora: 'Adm Teste',
  grupo: '1001',
  cota: '12',
  tipoBem: 'imovel',
  valorCredito: 30000000,
  prazoMeses: 200,
  dataAdesao: '2026-01-10',
  status: 'ativa',
  ...p,
});

describe('cota', () => {
  it('valida dados e exige contemplação quando contemplada', () => {
    expect(() => validarCota(cota({}))).not.toThrow();
    expect(() => validarCota(cota({ valorCredito: 0 }))).toThrow(ErroValidacao);
    expect(() => validarCota(cota({ parcelasPagas: 201 }))).toThrow(ErroValidacao);
    expect(() => validarCota(cota({ status: 'contemplada' }))).toThrow(/contemplação|cota/);
    expect(() =>
      validarCota(cota({ status: 'contemplada', contemplacao: { data: '2026-05-01', forma: 'sorteio' } })),
    ).not.toThrow();
  });

  it('calcula parcelas restantes e progresso', () => {
    expect(parcelasRestantes({ prazoMeses: 100, parcelasPagas: 30 })).toBe(70);
    expect(parcelasRestantes({ prazoMeses: 100 })).toBe(100);
    expect(progresso({ prazoMeses: 200, parcelasPagas: 50 })).toBe(0.25);
    expect(parcelasRestantes({ prazoMeses: undefined })).toBeNull();
  });

  it('aceita cota com grupo, cota e prazo pendentes e os destaca', () => {
    const pendente = cota({
      grupo: undefined,
      cota: undefined,
      prazoMeses: undefined,
      numeroProposta: '9125116',
    });
    expect(() => validarCota(pendente)).not.toThrow();
    expect(camposPendentes(pendente)).toEqual(['grupo', 'cota', 'prazo']);
    expect(identificacaoCota(pendente)).toBe('Proposta 9125116');
    expect(identificacaoCota(cota({}))).toBe('1001 / 12');
    expect(resumirCotas([pendente, cota({})]).pendentes).toBe(1);
  });

  it('resume a carteira por administradora e tipo de bem', () => {
    const r = resumirCotas([
      cota({ administradora: 'A', valorCredito: 100 }),
      cota({
        administradora: 'A',
        valorCredito: 200,
        status: 'contemplada',
        tipoBem: 'automovel',
        contemplacao: { data: '2026-01-01', forma: 'lance' },
      }),
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
    expect(() =>
      validarLance({ cotaId: 'x', assembleia: '2026-11-10', tipo: 'livre', resultado: 'aguardando' }),
    ).toThrow(ErroValidacao);
    expect(() =>
      validarLance({
        cotaId: 'x',
        assembleia: '2026-11-10',
        tipo: 'livre',
        percentual: 30,
        resultado: 'aguardando',
      }),
    ).not.toThrow();
    expect(() =>
      validarLance({
        cotaId: 'x',
        assembleia: '2026-11-10',
        tipo: 'livre',
        percentual: 130,
        resultado: 'aguardando',
      }),
    ).toThrow();
  });
});

describe('cota repetida e lance coerente com a cota', () => {
  const existentes = [{ id: 'a', administradora: 'Porto Seguro', grupo: '1234', cota: '57' }];
  it('recusa a mesma administradora, grupo e cota', () => {
    expect(() =>
      conferirCotaRepetida({ administradora: 'porto seguro ', grupo: '1234', cota: '57' }, existentes),
    ).toThrow(ErroValidacao);
  });
  it('aceita outra cota, cota pendente e a edição da própria cota', () => {
    expect(() =>
      conferirCotaRepetida({ administradora: 'Porto Seguro', grupo: '1234', cota: '58' }, existentes),
    ).not.toThrow();
    expect(() =>
      conferirCotaRepetida({ administradora: 'Porto Seguro', grupo: '1234' }, existentes),
    ).not.toThrow();
    expect(() =>
      conferirCotaRepetida(
        { id: 'a', administradora: 'Porto Seguro', grupo: '1234', cota: '57' },
        existentes,
      ),
    ).not.toThrow();
  });
  it('lance: valor até o crédito e assembleia depois da adesão', () => {
    const cota = { valorCredito: 10_000_000, dataAdesao: '2025-01-10' };
    try {
      validarLanceNaCota({ assembleia: '2000-01-01', valor: 99_999_999_900 }, cota);
      expect.unreachable();
    } catch (e) {
      expect(Object.keys((e as ErroValidacao).campos).sort()).toEqual(['assembleia', 'valor']);
    }
    expect(() => validarLanceNaCota({ assembleia: '2026-11-20', valor: 3_000_000 }, cota)).not.toThrow();
  });
});
