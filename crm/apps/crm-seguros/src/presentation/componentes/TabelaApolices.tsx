import { useColecao, useEquipe, useIndice, useSessao } from '@portella/app-base';
import { formatarData, formatarDinheiro } from '@portella/core';
import type { Coluna } from '@portella/ui';
import { Tabela } from '@portella/ui';
import type { ReactNode } from 'react';
import type { Apolice } from '../../domain/apolice';
import { comissao } from '../../domain/apolice';
import { nomeRamo, nomeSeguradora } from '../../domain/catalogo';
import { useServicosSeguros } from '../hooks';
import { SeloRenovacao, SeloSituacao } from './SeloSituacao';

export function TabelaApolices({
  apolices,
  aoClicar,
  mostrarCliente = true,
  mostrarRenovacao = false,
  acoes,
  vazio,
  totais,
  ordem = 'asc',
}: {
  apolices: Apolice[];
  aoClicar?: (a: Apolice) => void;
  mostrarCliente?: boolean;
  mostrarRenovacao?: boolean;
  acoes?: (a: Apolice) => ReactNode;
  vazio?: ReactNode;
  /** Linha com a soma do prêmio líquido e da comissão das apólices listadas. */
  totais?: boolean;
  /** Ordem inicial pelo fim da vigência. */
  ordem?: 'asc' | 'desc';
}) {
  const { clientes } = useServicosSeguros();
  const { data } = useColecao('clientes', clientes);
  const indice = useIndice(data);
  const { pode } = useSessao();
  const { nomeDe } = useEquipe();
  // A comissão é da corretora: o produtor não a vê (como em Propostas).
  const verComissao = pode('financeiro:gerenciar');
  const nomeCliente = (a: Apolice) => indice.get(a.clienteId)?.nome ?? '—';

  const colunas: Coluna<Apolice>[] = [
    ...(mostrarCliente
      ? [
          {
            chave: 'cliente',
            titulo: 'Cliente',
            principal: true,
            render: nomeCliente,
            ordenar: (a: Apolice, b: Apolice) => nomeCliente(a).localeCompare(nomeCliente(b), 'pt-BR'),
          },
        ]
      : []),
    {
      chave: 'ramo',
      titulo: 'Ramo',
      principal: !mostrarCliente,
      render: (a) => `${nomeRamo(a.ramo)}${a.item ? ` · ${a.item}` : ''}`,
    },
    {
      chave: 'seg',
      titulo: 'Seguradora',
      render: (a) => nomeSeguradora(a.seguradora),
      ordenar: (a, b) => nomeSeguradora(a.seguradora).localeCompare(nomeSeguradora(b.seguradora), 'pt-BR'),
    },
    {
      chave: 'fim',
      titulo: 'Fim da vigência',
      render: (a) =>
        a.fimVigencia
          ? `${formatarData(a.fimVigencia)}${a.vigenciaEstimada ? ' (estimada)' : ''}`
          : 'Contínua',
      // Contratos contínuos (sem fim) ficam no fim da lista.
      ordenar: (a, b) => (a.fimVigencia ?? '9999').localeCompare(b.fimVigencia ?? '9999'),
    },
    { chave: 'sit', titulo: 'Situação', render: (a) => <SeloSituacao apolice={a} /> },
    ...(mostrarRenovacao
      ? [
          {
            chave: 'ren',
            titulo: 'Renovação',
            render: (a: Apolice) => <SeloRenovacao status={a.renovacao} />,
          },
        ]
      : []),
    {
      chave: 'premio',
      titulo: 'Prêmio líquido',
      alinharDireita: true,
      ocultarNoMobile: mostrarRenovacao,
      render: (a) => formatarDinheiro(a.premioLiquido),
      ordenar: (a, b) => (a.premioLiquido ?? 0) - (b.premioLiquido ?? 0),
    },
    ...(verComissao && !mostrarRenovacao
      ? [
          {
            chave: 'comissao',
            titulo: 'Comissão',
            alinharDireita: true,
            ocultarNoMobile: true,
            render: (a: Apolice) => formatarDinheiro(comissao(a)),
          },
        ]
      : []),
    ...(pode('carteira:ver_todos')
      ? [
          {
            chave: 'resp',
            titulo: 'Produtor',
            ocultarNoMobile: true,
            render: (a: Apolice) => nomeDe(a.responsavelId),
          },
        ]
      : []),
    ...(acoes ? [{ chave: 'acoes', titulo: 'Ações', render: acoes }] : []),
  ];

  return (
    <Tabela
      rotulo="Apólices"
      itens={apolices}
      colunas={colunas}
      chave={(a) => a.id}
      aoClicar={aoClicar}
      vazio={vazio}
      ordemInicial={{ chave: 'fim', direcao: ordem }}
      totais={
        totais
          ? {
              rotulo: `Total de ${apolices.length} apólice${apolices.length === 1 ? '' : 's'}`,
              valores: {
                premio: formatarDinheiro(apolices.reduce((t, a) => t + (a.premioLiquido ?? 0), 0)),
                ...(verComissao && !mostrarRenovacao
                  ? { comissao: formatarDinheiro(apolices.reduce((t, a) => t + (comissao(a) ?? 0), 0)) }
                  : {}),
              },
            }
          : undefined
      }
    />
  );
}
