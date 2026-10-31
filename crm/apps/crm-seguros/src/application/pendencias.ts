import type { DataISO, Oportunidade, Proposta } from '@portella/core';
import { diasEntre, etapaEncerrada } from '@portella/core';
import type { Apolice } from '../domain/apolice';
import { filaRenovacao } from '../domain/apolice';

/** Linha do quadro "Pendências do CRM" no mural da administração (gerada sozinha, some quando resolvida). */
export interface Pendencia {
  id: 'parcelas' | 'aprovacoes' | 'renovacoes' | 'cotacoes';
  quantidade: number;
  titulo: string;
  detalhe: string;
  para: string;
  tom: 'destaque' | 'info' | 'perigo' | 'neutro';
}

/** Cotação sem movimento há este tanto de dias conta como parada. */
export const DIAS_COTACAO_PARADA = 7;
/** Renovações que vencem dentro desta janela. */
export const DIAS_RENOVACAO = 15;

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export function pendenciasDoCrm(
  dados: { apolices: Apolice[]; propostas: Proposta[]; oportunidades: Oportunidade[] },
  hoje: DataISO,
  nomeDe: (id: string) => string,
): Pendencia[] {
  const lista: Pendencia[] = [];

  // Parcelas já vencidas, sem a data da consulta e sem "pago": falta conferir a baixa na seguradora.
  const apolicesComParcela = dados.apolices
    .filter((a) => !a.cancelada)
    .map((a) => ({
      a,
      n: (a.parcelas ?? []).filter((p) => p.vencimento && p.vencimento < hoje && !p.pago && !p.consulta)
        .length,
    }))
    .filter((x) => x.n > 0);
  const parcelas = apolicesComParcela.reduce((t, x) => t + x.n, 0);
  if (parcelas)
    lista.push({
      id: 'parcelas',
      quantidade: parcelas,
      titulo: parcelas === 1 ? 'Parcela para conferir a baixa' : 'Parcelas para conferir a baixa',
      detalhe: `Vencidas, sem data da consulta · ${plural(apolicesComParcela.length, 'apólice', 'apólices')}`,
      para: '/apolices',
      tom: 'destaque',
    });

  const pendentes = dados.propostas.filter((p) => p.status === 'pendente');
  if (pendentes.length) {
    const quem = [...new Set(pendentes.map((p) => nomeDe(p.responsavelId).split(' ')[0]))];
    lista.push({
      id: 'aprovacoes',
      quantidade: pendentes.length,
      titulo: pendentes.length === 1 ? 'Proposta aguardando aprovação' : 'Propostas aguardando aprovação',
      detalhe:
        quem.length > 3 ? `${quem.slice(0, 3).join(', ')} e mais ${quem.length - 3}` : quem.join(' e '),
      para: '/aprovacoes',
      tom: 'info',
    });
  }

  const renovacoes = filaRenovacao(dados.apolices, hoje, DIAS_RENOVACAO).filter(
    (a) => diasEntre(hoje, a.fimVigencia!) >= 0,
  );
  if (renovacoes.length) {
    const semContato = renovacoes.filter((a) => a.renovacao === 'pendente').length;
    lista.push({
      id: 'renovacoes',
      quantidade: renovacoes.length,
      titulo: `Renovações nos próximos ${DIAS_RENOVACAO} dias`,
      detalhe: semContato
        ? `${plural(semContato, 'ainda sem contato', 'ainda sem contato')}`
        : 'Todas já em contato',
      para: '/renovacoes',
      tom: 'perigo',
    });
  }

  const paradas = dados.oportunidades.filter(
    (o) => !etapaEncerrada(o.etapa) && diasEntre(o.atualizadoEm.slice(0, 10), hoje) >= DIAS_COTACAO_PARADA,
  );
  if (paradas.length) {
    const exemplo = paradas.sort((a, b) => a.atualizadoEm.localeCompare(b.atualizadoEm))[0]!;
    lista.push({
      id: 'cotacoes',
      quantidade: paradas.length,
      titulo:
        paradas.length === 1
          ? `Cotação parada há ${DIAS_COTACAO_PARADA}+ dias`
          : `Cotações paradas há ${DIAS_COTACAO_PARADA}+ dias`,
      detalhe: `${exemplo.nomeContato} · ${exemplo.produto} · ${nomeDe(exemplo.responsavelId).split(' ')[0]}${paradas.length > 1 ? ` e mais ${paradas.length - 1}` : ''}`,
      para: '/oportunidades',
      tom: 'neutro',
    });
  }
  return lista;
}
