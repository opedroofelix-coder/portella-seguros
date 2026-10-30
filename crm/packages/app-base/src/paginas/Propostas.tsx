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
  useAvisos,
} from '@portella/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useRefinada } from '../config';
import { mensagemErro } from '../erros';
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
  const { data, isPending, isError, refetch } = useColecao<Proposta>('propostas', propostas);
  const gestao = pode('financeiro:gerenciar');
  const refinada = useRefinada();
  const consultas = useQueryClient();
  const { avisar } = useAvisos();
  const aprovar = useMutation({
    mutationFn: (p: Proposta) => propostas.aprovar(usuario, p.id),
    onSuccess: async (_, p) => {
      await consultas.invalidateQueries({ queryKey: ['propostas'] });
      avisar(`Proposta de ${p.clienteNome} aprovada.`);
    },
    onError: (e) => avisar(mensagemErro(e), 'erro'),
  });
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<StatusProposta | ''>('');
  const [produtor, setProdutor] = useState('');
  const [tipo, setTipo] = useState<TipoNegocio | 'nao' | ''>('');
  const [saldo, setSaldo] = useState<'' | 'aberto' | 'quitado'>('');
  const [editando, setEditando] = useState<Proposta | 'nova' | null>(null);
  // "Nova proposta" do menu no topo chega com ?nova=1: abre o formulário e limpa o endereço.
  const [parametros, setParametros] = useSearchParams();
  const pedirNova = refinada && !somentePendentes && parametros.get('nova') === '1';
  useEffect(() => {
    if (!pedirNova) return;
    setEditando('nova');
    setParametros({}, { replace: true });
  }, [pedirNova, setParametros]);

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

  // Interface refinada: colunas ordenáveis e o nº visível no celular (é o que a seguradora usa).
  const ordenar = <K,>(f: (p: Proposta) => K, cmp: (a: K, b: K) => number) =>
    refinada ? (a: Proposta, b: Proposta) => cmp(f(a), f(b)) : undefined;
  const texto = (a: string, b: string) => a.localeCompare(b, 'pt-BR');
  const num = (a: number, b: number) => a - b;
  const colunas: Coluna<Proposta>[] = [
    {
      chave: 'cliente',
      titulo: 'Cliente',
      principal: true,
      render: (p) => p.clienteNome,
      ordenar: ordenar((p) => p.clienteNome, texto),
    },
    {
      chave: 'data',
      titulo: 'Data',
      render: (p) => formatarData(p.data),
      ordenar: ordenar((p) => p.data, texto),
    },
    {
      chave: 'numero',
      titulo: 'Nº',
      ocultarNoMobile: !refinada,
      // O nº não quebra no meio ("TESTE-" / "1000").
      render: (p) =>
        refinada ? <span style={{ whiteSpace: 'nowrap' }}>{p.numero ?? '—'}</span> : (p.numero ?? '—'),
    },
    { chave: 'produto', titulo: 'Seguradora · produto', render: (p) => `${p.companhia} · ${p.produto}` },
    {
      chave: 'tipo',
      titulo: 'Tipo',
      ocultarNoMobile: true,
      render: (p) =>
        p.tipoNegocio ? (
          <Selo tom={p.tipoNegocio === 'novo' ? 'info' : p.tipoNegocio === 'endosso' ? 'neutro' : 'dourado'}>
            {/* Na tabela, o rótulo curto ("Novo", "Renovação") para as colunas caberem. */}
            {refinada && p.tipoNegocio === 'novo' ? 'Novo' : ROTULO_TIPO_NEGOCIO[p.tipoNegocio]}
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
      ordenar: ordenar((p) => p.premioLiquido ?? 0, num),
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
            ordenar: ordenar(saldoReceber, num),
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
            titulo: refinada ? 'Meu repasse previsto' : 'Minha comissão prevista',
            alinharDireita: true,
            render: (p: Proposta) => formatarDinheiro(repassePrevisto(p, percentualDe(p, usuario.id))),
          },
        ]),
    {
      chave: 'status',
      titulo: 'Situação',
      render: (p) =>
        refinada ? (
          // Um selo só: "Saldo a receber" e "Quitada" já são de propostas aprovadas.
          p.status === 'pendente' ? (
            <Selo tom="alerta">Aguardando aprovação</Selo>
          ) : !gestao ? (
            <Selo tom="sucesso">{ROTULO_STATUS_PROPOSTA.aprovada}</Selo>
          ) : saldoReceber(p) > 0 ? (
            <Selo tom="info">Saldo a receber</Selo>
          ) : (
            <Selo tom="sucesso">Quitada</Selo>
          )
        ) : p.status === 'pendente' ? (
          <Selo tom="alerta">Pendente</Selo>
        ) : saldoReceber(p) > 0 ? (
          <Selo tom="info">Com saldo</Selo>
        ) : (
          <Selo tom="sucesso">{ROTULO_STATUS_PROPOSTA.aprovada}</Selo>
        ),
    },
    ...(refinada && somentePendentes && gestao
      ? [
          {
            chave: 'aprovar',
            titulo: 'Ações',
            render: (p: Proposta) => (
              <Botao
                pequeno
                icone="aprovar"
                carregando={aprovar.isPending && aprovar.variables?.id === p.id}
                aria-label={`Aprovar a proposta de ${p.clienteNome}`}
                onClick={() => aprovar.mutate(p)}
              >
                Aprovar
              </Botao>
            ),
          },
        ]
      : []),
  ];

  const somar = (f: (p: Proposta) => number) => formatarDinheiro(lista.reduce((t, p) => t + f(p), 0));
  const totais = refinada
    ? {
        rotulo: `Total de ${lista.length} proposta${lista.length === 1 ? '' : 's'}`,
        valores: gestao
          ? {
              premio: somar((p) => p.premioLiquido ?? 0),
              comissao: somar((p) => p.comissaoReceber),
              recebido: somar(recebidoTotal),
              saldo: somar(saldoReceber),
            }
          : {
              premio: somar((p) => p.premioLiquido ?? 0),
              receberei: somar((p) => repassePrevisto(p, percentualDe(p, usuario.id))),
            },
      }
    : undefined;
  const pendentes = (data ?? []).filter((p) => p.status === 'pendente').length;

  return (
    <>
      <CabecalhoPagina
        titulo={somentePendentes ? 'Aprovações' : gestao ? 'Propostas' : 'Minhas propostas'}
        descricao={
          somentePendentes
            ? refinada
              ? `${pendentes} proposta${pendentes === 1 ? '' : 's'} aguardando aprovação. Abra para revisar ou aprove direto na lista.`
              : 'Propostas lançadas pelos produtores. Revise, corrija se preciso e aprove para entrarem no controle.'
            : `${lista.length} de ${data?.length ?? 0} propostas.`
        }
        acoes={
          refinada && somentePendentes ? undefined : (
            <Botao icone="mais" onClick={() => setEditando('nova')}>
              Nova proposta
            </Botao>
          )
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
                {equipe
                  .filter((u) => !refinada || u.ativo || u.id === produtor)
                  .map((u) => (
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
              <option value="endosso">{ROTULO_TIPO_NEGOCIO.endosso}</option>
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
        {refinada && isError ? (
          <div role="alert">
            <EstadoVazio
              titulo="Não foi possível carregar as propostas"
              acao={
                <Botao variante="secundario" onClick={() => refetch()}>
                  Tentar de novo
                </Botao>
              }
            />
          </div>
        ) : isPending ? (
          <Carregando />
        ) : (
          <Tabela
            rotulo="Propostas"
            itens={lista}
            colunas={colunas}
            chave={(p) => p.id}
            aoClicar={setEditando}
            totais={totais}
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
