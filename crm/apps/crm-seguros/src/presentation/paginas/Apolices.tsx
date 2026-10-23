import { useColecao, useEquipe, useIndice, useSessao } from '@portella/app-base';
import { corresponde, hojeISO } from '@portella/core';
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
} from '@portella/ui';
import { useMemo, useState } from 'react';
import type { Apolice, Situacao, StatusRenovacao } from '../../domain/apolice';
import {
  estaValendo,
  ROTULO_RENOVACAO,
  ROTULO_SITUACAO,
  situacao,
  STATUS_RENOVACAO,
} from '../../domain/apolice';
import { nomeSeguradora, RAMOS } from '../../domain/catalogo';
import { EstadoErro } from '../componentes/EstadoErro';
import { FormularioApolice } from '../componentes/FormularioApolice';
import { TabelaApolices } from '../componentes/TabelaApolices';
import { useApolices, useServicosSeguros } from '../hooks';

/** "valendo" = vigentes e a vencer, o filtro padrão: a lista abre pelo que precisa de atenção. */
type FiltroSituacao = Situacao | 'valendo' | '';
const PADRAO = {
  busca: '',
  seguradora: '',
  ramo: '',
  sit: 'valendo' as FiltroSituacao,
  vigencia: '',
  renovacao: '',
  responsavel: '',
};

export function PaginaApolices() {
  const { data, isPending, isError, refetch } = useApolices();
  const { clientes } = useServicosSeguros();
  const { data: listaClientes } = useColecao('clientes', clientes);
  const indice = useIndice(listaClientes);
  const { pode } = useSessao();
  const { equipe } = useEquipe();
  const [f, setF] = useState(PADRAO);
  const [editando, setEditando] = useState<Apolice | 'nova' | null>(null);
  const hoje = hojeISO();
  const mudar = (campo: keyof typeof PADRAO) => (e: { target: { value: string } }) =>
    setF((atual) => ({ ...atual, [campo]: e.target.value }));
  const filtrando = JSON.stringify(f) !== JSON.stringify(PADRAO);

  // Seguradoras que aparecem nas apólices, parceiras ou não (Akad, GNDI…), em ordem alfabética.
  const seguradoras = useMemo(
    () =>
      [...new Set((data ?? []).map((a) => a.seguradora))]
        .map((id) => ({ id, nome: nomeSeguradora(id) }))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [data],
  );
  const estimadas = useMemo(() => (data ?? []).filter((a) => a.vigenciaEstimada).length, [data]);

  const filtradas = useMemo(
    () =>
      (data ?? [])
        .filter((a) => !f.seguradora || a.seguradora === f.seguradora)
        .filter((a) => !f.ramo || a.ramo === f.ramo)
        .filter((a) =>
          !f.sit ? true : f.sit === 'valendo' ? estaValendo(a, hoje) : situacao(a, hoje) === f.sit,
        )
        .filter((a) => !f.vigencia || (f.vigencia === 'estimada' ? a.vigenciaEstimada : !a.vigenciaEstimada))
        .filter((a) => !f.renovacao || a.renovacao === f.renovacao)
        .filter((a) => !f.responsavel || a.responsavelId === f.responsavel)
        .filter((a) =>
          corresponde(f.busca, indice.get(a.clienteId)?.nome, a.numero, a.item, nomeSeguradora(a.seguradora)),
        ),
    [data, f, indice, hoje],
  );

  const total = data?.length ?? 0;
  return (
    <>
      <CabecalhoPagina
        titulo="Apólices"
        descricao={
          isPending
            ? 'Carregando a carteira…'
            : `${filtradas.length.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')} apólices${
                f.sit === 'valendo' ? ' (vigentes e a vencer)' : ''
              }, pela vigência mais próxima.`
        }
        acoes={
          <Botao icone="mais" onClick={() => setEditando('nova')}>
            Nova apólice
          </Botao>
        }
      />
      <Cartao>
        <BarraFiltros>
          <Campo rotulo="Buscar">
            <Entrada
              type="search"
              placeholder="Cliente, nº, placa…"
              value={f.busca}
              onChange={mudar('busca')}
            />
          </Campo>
          <Campo rotulo="Situação">
            <Selecao value={f.sit} onChange={mudar('sit')}>
              <option value="valendo">Vigentes e a vencer</option>
              <option value="">Todas</option>
              {(Object.keys(ROTULO_SITUACAO) as Situacao[]).map((s) => (
                <option key={s} value={s}>
                  {ROTULO_SITUACAO[s]}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Seguradora">
            <Selecao value={f.seguradora} onChange={mudar('seguradora')}>
              <option value="">Todas</option>
              {seguradoras.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Ramo">
            <Selecao value={f.ramo} onChange={mudar('ramo')}>
              <option value="">Todos</option>
              {RAMOS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Vigência">
            <Selecao value={f.vigencia} onChange={mudar('vigencia')}>
              <option value="">Todas</option>
              <option value="estimada">Estimada: confirmar ({estimadas})</option>
              <option value="confirmada">Confirmada</option>
            </Selecao>
          </Campo>
          <Campo rotulo="Renovação">
            <Selecao value={f.renovacao} onChange={mudar('renovacao')}>
              <option value="">Todas</option>
              {STATUS_RENOVACAO.map((s: StatusRenovacao) => (
                <option key={s} value={s}>
                  {ROTULO_RENOVACAO[s]}
                </option>
              ))}
            </Selecao>
          </Campo>
          {pode('carteira:ver_todos') && (
            <Campo rotulo="Produtor">
              <Selecao value={f.responsavel} onChange={mudar('responsavel')}>
                <option value="">Todos</option>
                {equipe
                  .filter((u) => u.ativo || u.id === f.responsavel)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome}
                    </option>
                  ))}
              </Selecao>
            </Campo>
          )}
          {filtrando && (
            <Botao variante="fantasma" onClick={() => setF(PADRAO)}>
              Limpar filtros
            </Botao>
          )}
        </BarraFiltros>
        {isError ? (
          <EstadoErro oque="as apólices" aoTentar={() => refetch()} />
        ) : isPending ? (
          <Carregando texto="Carregando as apólices…" />
        ) : (
          <TabelaApolices
            apolices={filtradas}
            aoClicar={setEditando}
            totais
            vazio={
              <EstadoVazio
                titulo={total ? 'Nenhuma apólice com estes filtros' : 'Nenhuma apólice cadastrada'}
                acao={
                  total ? (
                    <Botao variante="secundario" onClick={() => setF(PADRAO)}>
                      Limpar filtros
                    </Botao>
                  ) : (
                    <Botao icone="mais" onClick={() => setEditando('nova')}>
                      Nova apólice
                    </Botao>
                  )
                }
              >
                {total
                  ? 'Mude a busca ou os filtros para ver outras apólices.'
                  : 'Cadastre a primeira apólice ou importe a planilha da corretora.'}
              </EstadoVazio>
            }
          />
        )}
      </Cartao>
      {editando && (
        <FormularioApolice
          apolice={editando === 'nova' ? undefined : editando}
          aoFechar={() => setEditando(null)}
        />
      )}
    </>
  );
}
