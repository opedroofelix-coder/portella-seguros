import { useColecao, useEquipe, useIndice, useSessao } from '@portella/app-base';
import { formatarData, formatarDinheiro } from '@portella/core';
import type { Coluna } from '@portella/ui';
import { Tabela } from '@portella/ui';
import type { ReactNode } from 'react';
import type { Apolice } from '../../domain/apolice';
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
}: {
  apolices: Apolice[];
  aoClicar?: (a: Apolice) => void;
  mostrarCliente?: boolean;
  mostrarRenovacao?: boolean;
  acoes?: (a: Apolice) => ReactNode;
  vazio?: ReactNode;
}) {
  const { clientes } = useServicosSeguros();
  const { data } = useColecao('clientes', clientes);
  const indice = useIndice(data);
  const { pode } = useSessao();
  const { nomeDe } = useEquipe();

  const colunas: Coluna<Apolice>[] = [
    ...(mostrarCliente ? [{ chave: 'cliente', titulo: 'Cliente', principal: true, render: (a: Apolice) => indice.get(a.clienteId)?.nome ?? '—' }] : []),
    { chave: 'ramo', titulo: 'Ramo', principal: !mostrarCliente, render: (a) => `${nomeRamo(a.ramo)}${a.item ? ` · ${a.item}` : ''}` },
    { chave: 'seg', titulo: 'Seguradora', render: (a) => nomeSeguradora(a.seguradora) },
    { chave: 'fim', titulo: 'Fim da vigência', render: (a) => formatarData(a.fimVigencia) },
    { chave: 'sit', titulo: 'Situação', render: (a) => <SeloSituacao apolice={a} /> },
    ...(mostrarRenovacao ? [{ chave: 'ren', titulo: 'Renovação', render: (a: Apolice) => <SeloRenovacao status={a.renovacao} /> }] : []),
    { chave: 'premio', titulo: 'Prêmio', alinharDireita: true, ocultarNoMobile: mostrarRenovacao, render: (a) => formatarDinheiro(a.premioTotal ?? a.premioLiquido) },
    ...(pode('carteira:ver_todos') ? [{ chave: 'resp', titulo: 'Responsável', ocultarNoMobile: true, render: (a: Apolice) => nomeDe(a.responsavelId) }] : []),
    ...(acoes ? [{ chave: 'acoes', titulo: 'Ações', render: acoes }] : []),
  ];

  return <Tabela rotulo="Apólices" itens={apolices} colunas={colunas} chave={(a) => a.id} aoClicar={aoClicar} vazio={vazio} />;
}
