import { useColecao, useEquipe, useIndice, useSessao } from '@portella/app-base';
import { formatarDinheiro } from '@portella/core';
import type { Coluna } from '@portella/ui';
import { Selo, Tabela } from '@portella/ui';
import type { ReactNode } from 'react';
import type { Cota } from '../../domain/cota';
import { camposPendentes, identificacaoCota, nomeTipoBem } from '../../domain/cota';
import { useServicosConsorcio } from '../hooks';
import { SeloCota } from './Selos';

export function TabelaCotas({
  cotas,
  aoClicar,
  mostrarCliente = true,
  vazio,
}: {
  cotas: Cota[];
  aoClicar?: (c: Cota) => void;
  mostrarCliente?: boolean;
  vazio?: ReactNode;
}) {
  const { clientes } = useServicosConsorcio();
  const { data } = useColecao('clientes', clientes);
  const indice = useIndice(data);
  const { pode } = useSessao();
  const { nomeDe } = useEquipe();

  const colunas: Coluna<Cota>[] = [
    ...(mostrarCliente
      ? [
          {
            chave: 'cliente',
            titulo: 'Cliente',
            principal: true,
            render: (c: Cota) => indice.get(c.clienteId)?.nome ?? '—',
          },
        ]
      : []),
    {
      chave: 'gc',
      titulo: 'Grupo / cota',
      principal: !mostrarCliente,
      render: (c) =>
        camposPendentes(c).length ? (
          <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {identificacaoCota(c)} <Selo tom="alerta">Completar cadastro</Selo>
          </span>
        ) : (
          identificacaoCota(c)
        ),
    },
    { chave: 'adm', titulo: 'Administradora', render: (c) => c.administradora },
    { chave: 'bem', titulo: 'Bem', render: (c) => nomeTipoBem(c.tipoBem) },
    {
      chave: 'credito',
      titulo: 'Crédito',
      alinharDireita: true,
      render: (c) => formatarDinheiro(c.valorCredito),
    },
    {
      chave: 'parcelas',
      titulo: 'Parcelas',
      ocultarNoMobile: true,
      render: (c) => `${c.parcelasPagas ?? 0} de ${c.prazoMeses ?? '?'}`,
    },
    { chave: 'status', titulo: 'Situação', render: (c) => <SeloCota status={c.status} /> },
    ...(pode('carteira:ver_todos')
      ? [
          {
            chave: 'resp',
            titulo: 'Responsável',
            ocultarNoMobile: true,
            render: (c: Cota) => nomeDe(c.responsavelId),
          },
        ]
      : []),
  ];
  return (
    <Tabela
      rotulo="Cotas"
      itens={cotas}
      colunas={colunas}
      chave={(c) => c.id}
      aoClicar={aoClicar}
      vazio={vazio}
    />
  );
}
