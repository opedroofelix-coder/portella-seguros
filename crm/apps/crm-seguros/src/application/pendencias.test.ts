import type { Oportunidade, Proposta } from '@portella/core';
import { describe, expect, it } from 'vitest';
import type { Apolice } from '../domain/apolice';
import { pendenciasDoCrm } from './pendencias';

const HOJE = '2026-10-31';
const base = { responsavelId: 'gisele', criadoEm: '', atualizadoEm: '2026-10-30T10:00:00Z' };
const apolice = (p: Partial<Apolice>): Apolice => ({
  ...base,
  id: Math.random().toString(36),
  clienteId: 'c',
  seguradora: 'porto',
  ramo: 'auto',
  inicioVigencia: '2026-01-01',
  fimVigencia: '2027-01-01',
  renovacao: 'pendente',
  ...p,
});
const nomes: Record<string, string> = { gisele: 'Gisele Costa', mary: 'Marielly', gabriel: 'Gabriel' };
const nomeDe = (id: string) => nomes[id] ?? id;

describe('pendências do CRM (mural da administração)', () => {
  it('nada pendente: lista vazia', () => {
    expect(
      pendenciasDoCrm({ apolices: [apolice({})], propostas: [], oportunidades: [] }, HOJE, nomeDe),
    ).toEqual([]);
  });

  it('acha parcelas a conferir, aprovações, renovações próximas e cotações paradas', () => {
    const pendencias = pendenciasDoCrm(
      {
        apolices: [
          apolice({
            parcelas: [
              { valor: 100, vencimento: '2026-10-10', pago: true },
              { valor: 100, vencimento: '2026-10-20', consulta: '2026-10-25' },
              { valor: 100, vencimento: '2026-10-28' },
              { valor: 100, vencimento: '2026-11-10' },
            ],
          }),
          apolice({ cancelada: true, parcelas: [{ vencimento: '2026-10-01' }] }),
          apolice({ fimVigencia: '2026-11-10' }),
          apolice({ fimVigencia: '2026-11-12', renovacao: 'em_contato' }),
          apolice({ fimVigencia: '2026-12-20' }),
        ],
        propostas: [
          { ...base, status: 'pendente', responsavelId: 'gisele' } as Proposta,
          { ...base, status: 'pendente', responsavelId: 'mary' } as Proposta,
          { ...base, status: 'aprovada' } as Proposta,
        ],
        oportunidades: [
          {
            ...base,
            id: 'o1',
            nomeContato: 'Marcos',
            produto: 'Consórcio',
            etapa: 'novo',
            responsavelId: 'gabriel',
            atualizadoEm: '2026-10-20T10:00:00Z',
          } as Oportunidade,
          {
            ...base,
            id: 'o2',
            nomeContato: 'Ana',
            produto: 'Auto',
            etapa: 'ganho',
            atualizadoEm: '2026-09-01T10:00:00Z',
          } as Oportunidade,
          { ...base, id: 'o3', nomeContato: 'Bia', produto: 'Auto', etapa: 'contato' } as Oportunidade,
        ],
      },
      HOJE,
      nomeDe,
    );
    expect(pendencias.map((p) => [p.id, p.quantidade, p.detalhe])).toEqual([
      ['parcelas', 1, 'Vencidas, sem data da consulta · 1 apólice'],
      ['aprovacoes', 2, 'Gisele e Marielly'],
      ['renovacoes', 2, '1 ainda sem contato'],
      ['cotacoes', 1, 'Marcos · Consórcio · Gabriel'],
    ]);
  });
});
