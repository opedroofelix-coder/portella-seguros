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
import type { Apolice, Situacao } from '../../domain/apolice';
import { ROTULO_SITUACAO, situacao } from '../../domain/apolice';
import { nomeSeguradora, RAMOS, SEGURADORAS } from '../../domain/catalogo';
import { FormularioApolice } from '../componentes/FormularioApolice';
import { TabelaApolices } from '../componentes/TabelaApolices';
import { useApolices, useServicosSeguros } from '../hooks';

export function PaginaApolices() {
  const { data, isPending } = useApolices();
  const { clientes } = useServicosSeguros();
  const { data: listaClientes } = useColecao('clientes', clientes);
  const indice = useIndice(listaClientes);
  const { pode } = useSessao();
  const { equipe } = useEquipe();
  const [busca, setBusca] = useState('');
  const [seguradora, setSeguradora] = useState('');
  const [ramo, setRamo] = useState('');
  const [sit, setSit] = useState<Situacao | ''>('');
  const [responsavel, setResponsavel] = useState('');
  const [editando, setEditando] = useState<Apolice | 'nova' | null>(null);
  const hoje = hojeISO();

  const filtradas = useMemo(
    () =>
      (data ?? [])
        .filter((a) => !seguradora || a.seguradora === seguradora)
        .filter((a) => !ramo || a.ramo === ramo)
        .filter((a) => !sit || situacao(a, hoje) === sit)
        .filter((a) => !responsavel || a.responsavelId === responsavel)
        .filter((a) =>
          corresponde(busca, indice.get(a.clienteId)?.nome, a.numero, a.item, nomeSeguradora(a.seguradora)),
        )
        .sort((a, b) => a.fimVigencia.localeCompare(b.fimVigencia)),
    [data, seguradora, ramo, sit, responsavel, busca, indice, hoje],
  );

  return (
    <>
      <CabecalhoPagina
        titulo="Apólices"
        descricao={`${filtradas.length} de ${data?.length ?? 0} apólices, ordenadas pelo fim da vigência.`}
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
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </Campo>
          <Campo rotulo="Seguradora">
            <Selecao value={seguradora} onChange={(e) => setSeguradora(e.target.value)}>
              <option value="">Todas</option>
              {SEGURADORAS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Ramo">
            <Selecao value={ramo} onChange={(e) => setRamo(e.target.value)}>
              <option value="">Todos</option>
              {RAMOS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Situação">
            <Selecao value={sit} onChange={(e) => setSit(e.target.value as Situacao | '')}>
              <option value="">Todas</option>
              {(Object.keys(ROTULO_SITUACAO) as Situacao[]).map((s) => (
                <option key={s} value={s}>
                  {ROTULO_SITUACAO[s]}
                </option>
              ))}
            </Selecao>
          </Campo>
          {pode('carteira:ver_todos') && (
            <Campo rotulo="Responsável">
              <Selecao value={responsavel} onChange={(e) => setResponsavel(e.target.value)}>
                <option value="">Todos</option>
                {equipe.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </Selecao>
            </Campo>
          )}
        </BarraFiltros>
        {isPending ? (
          <Carregando />
        ) : (
          <TabelaApolices
            apolices={filtradas}
            aoClicar={setEditando}
            vazio={
              <EstadoVazio titulo="Nenhuma apólice encontrada">
                Ajuste os filtros ou cadastre uma apólice.
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
