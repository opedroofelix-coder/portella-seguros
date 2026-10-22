import type { Proposta, StatusProposta, TipoNegocio } from '@portella/core';
import {
  corresponde,
  formatarData,
  formatarDinheiro,
  percentualDe,
  recebidoTotal,
  repassePrevisto,
  ROTULO_STATUS_PROPOSTA,
  ROTULO_TIPO_NEGOCIO,
  saldoReceber,
} from '@portella/core';
import type { Coluna } from '@portella/ui';
import {
  BarraFiltros,
  Botao,
  CabecalhoPagina,
  Campo,
  Cartao,
  Carregando,
  Entrada,
  EstadoVazio,
  Selecao,
  Selo,
  Tabela,
} from '@portella/ui';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FormularioProposta } from '../componentes/FormularioProposta';
import { useColecao, useEquipe, usePendentesAprovacao } from '../hooks/dados';
import { useServicos } from '../servicos';
import { useSessao, useUsuario } from '../sessao/Sessao';

export const ROTA_APROVACOES = '/aprovacoes';

/** Faixa de aviso para a administração quando há propostas esperando aprovação. */
export function AvisoAprovacoes() {
  const pendentes = usePendentesAprovacao();
  if (!pendentes) return null;
  return (
    <div className="aviso-faixa" role="status">
      <span>
        <strong>{pendentes}</strong> {pendentes === 1 ? 'proposta aguardando' : 'propostas aguardando'}{' '}
        aprovação.
      </span>
      <Link to={ROTA_APROVACOES}>Ver aprovações</Link>
    </div>
  );
}

export function PaginaPropostas({ somentePendentes = false }: { somentePendentes?: boolean }) {
  const usuario = useUsuario();
  const { propostas } = useServicos();
  const { pode } = useSessao();
  const { equipe, nomeDe } = useEquipe();
  const { data, isPending } = useColecao<Proposta>('propostas', propostas);
  const gestao = pode('financeiro:gerenciar');
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<StatusProposta | ''>('');
  const [produtor, setProdutor] = useState('');
  const [tipo, setTipo] = useState<TipoNegocio | 'nao' | ''>('');
  const [saldo, setSaldo] = useState<'' | 'aberto' | 'quitado'>('');
  const [editando, setEditando] = useState<Proposta | 'nova' | null>(null);

  const lista = useMemo(
    () =>
      (data ?? [])
        .filter((p) => (somentePendentes ? p.status === 'pendente' : !status || p.status === status))
        .filter(
          (p) =>
            !produtor ||
            p.produtores.some((x) => x.produtorId === produtor) ||
            (!p.produtores.length && produtor === '-'),
        )
        .filter((p) => !tipo || (tipo === 'nao' ? !p.tipoNegocio : p.tipoNegocio === tipo))
        .filter((p) => !saldo || (saldo === 'aberto') === saldoReceber(p) > 0)
        .filter((p) => corresponde(busca, p.clienteNome, p.numero, p.companhia, p.produto))
        .sort((a, b) => b.data.localeCompare(a.data)),
    [data, somentePendentes, status, produtor, tipo, saldo, busca],
  );

  const colunas: Coluna<Proposta>[] = [
    { chave: 'cliente', titulo: 'Cliente', principal: true, render: (p) => p.clienteNome },
    { chave: 'data', titulo: 'Data', render: (p) => formatarData(p.data) },
    { chave: 'numero', titulo: 'Nº', ocultarNoMobile: true, render: (p) => p.numero ?? '—' },
    { chave: 'produto', titulo: 'Seguradora · produto', render: (p) => `${p.companhia} · ${p.produto}` },
    {
      chave: 'tipo',
      titulo: 'Tipo',
      ocultarNoMobile: true,
      render: (p) =>
        p.tipoNegocio ? (
          <Selo tom={p.tipoNegocio === 'novo' ? 'info' : 'dourado'}>
            {ROTULO_TIPO_NEGOCIO[p.tipoNegocio]}
          </Selo>
        ) : (
          '—'
        ),
    },
    {
      chave: 'premio',
      titulo: 'Prêmio líquido',
      alinharDireita: true,
      render: (p) => formatarDinheiro(p.premioLiquido),
    },
    ...(gestao
      ? [
          {
            chave: 'comissao',
            titulo: 'Comissão',
            alinharDireita: true,
            render: (p: Proposta) => formatarDinheiro(p.comissaoReceber),
          },
          {
            chave: 'recebido',
            titulo: 'Recebido',
            alinharDireita: true,
            ocultarNoMobile: true,
            render: (p: Proposta) => formatarDinheiro(recebidoTotal(p)),
          },
          {
            chave: 'saldo',
            titulo: 'Saldo',
            alinharDireita: true,
            render: (p: Proposta) => formatarDinheiro(saldoReceber(p)),
          },
          {
            chave: 'produtores',
            titulo: 'Produtores',
            ocultarNoMobile: true,
            render: (p: Proposta) =>
              p.produtores.length
                ? p.produtores.map((x) => `${nomeDe(x.produtorId)} ${x.percentual}%`).join(', ')
                : 'Corretora',
          },
        ]
      : [
          {
            chave: 'receberei',
            titulo: 'Minha comissão prevista',
            alinharDireita: true,
            render: (p: Proposta) => formatarDinheiro(repassePrevisto(p, percentualDe(p, usuario.id))),
          },
        ]),
    {
      chave: 'status',
      titulo: 'Situação',
      render: (p) =>
        p.status === 'pendente' ? (
          <Selo tom="alerta">Pendente</Selo>
        ) : saldoReceber(p) > 0 ? (
          <Selo tom="info">Com saldo</Selo>
        ) : (
          <Selo tom="sucesso">{ROTULO_STATUS_PROPOSTA.aprovada}</Selo>
        ),
    },
  ];

  return (
    <>
      <CabecalhoPagina
        titulo={somentePendentes ? <>Aprovações</> : gestao ? 'Propostas' : 'Minhas propostas'}
        descricao={
          somentePendentes
            ? 'Propostas lançadas pelos produtores. Revise, corrija se preciso e aprove para entrarem no controle.'
            : `${lista.length} de ${data?.length ?? 0} propostas.`
        }
        acoes={
          <Botao icone="mais" onClick={() => setEditando('nova')}>
            Nova proposta
          </Botao>
        }
      />
      <Cartao>
        <BarraFiltros>
          <Campo rotulo="Buscar">
            <Entrada
              type="search"
              placeholder="Cliente, nº, seguradora, produto"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </Campo>
          {!somentePendentes && (
            <Campo rotulo="Situação">
              <Selecao value={status} onChange={(e) => setStatus(e.target.value as StatusProposta | '')}>
                <option value="">Todas</option>
                <option value="pendente">Pendentes de aprovação</option>
                <option value="aprovada">Aprovadas</option>
              </Selecao>
            </Campo>
          )}
          {gestao && (
            <Campo rotulo="Produtor">
              <Selecao value={produtor} onChange={(e) => setProdutor(e.target.value)}>
                <option value="">Todos</option>
                {equipe.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
                <option value="-">Corretora (sem produtor)</option>
              </Selecao>
            </Campo>
          )}
          <Campo rotulo="Tipo de negócio">
            <Selecao value={tipo} onChange={(e) => setTipo(e.target.value as TipoNegocio | 'nao' | '')}>
              <option value="">Todos</option>
              <option value="novo">{ROTULO_TIPO_NEGOCIO.novo}</option>
              <option value="renovacao">{ROTULO_TIPO_NEGOCIO.renovacao}</option>
              <option value="nao">Não informado</option>
            </Selecao>
          </Campo>
          {gestao && (
            <Campo rotulo="Saldo">
              <Selecao value={saldo} onChange={(e) => setSaldo(e.target.value as '' | 'aberto' | 'quitado')}>
                <option value="">Todos</option>
                <option value="aberto">Com saldo a receber</option>
                <option value="quitado">Quitadas</option>
              </Selecao>
            </Campo>
          )}
        </BarraFiltros>
        {isPending ? (
          <Carregando />
        ) : (
          <Tabela
            rotulo="Propostas"
            itens={lista}
            colunas={colunas}
            chave={(p) => p.id}
            aoClicar={setEditando}
            vazio={
              <EstadoVazio titulo={somentePendentes ? 'Nada para aprovar' : 'Nenhuma proposta'}>
                {somentePendentes
                  ? 'Quando um produtor lançar uma proposta, ela aparece aqui.'
                  : 'Lance a primeira proposta ou importe a planilha.'}
              </EstadoVazio>
            }
          />
        )}
      </Cartao>
      {editando && (
        <FormularioProposta
          proposta={editando === 'nova' ? undefined : editando}
          aoFechar={() => setEditando(null)}
        />
      )}
    </>
  );
}
