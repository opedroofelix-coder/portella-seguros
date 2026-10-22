import { useColecao, useEquipe, useIndice, useSessao } from '@portella/app-base';
import { corresponde } from '@portella/core';
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
import type { Cota, StatusCota } from '../../domain/cota';
import { camposPendentes, ROTULO_STATUS_COTA, STATUS_COTA, TIPOS_BEM } from '../../domain/cota';
import { FormularioCota } from '../componentes/FormularioCota';
import { TabelaCotas } from '../componentes/TabelaCotas';
import { useCotas, useServicosConsorcio } from '../hooks';

export function PaginaCotas() {
  const { data, isPending } = useCotas();
  const { clientes } = useServicosConsorcio();
  const { data: listaClientes } = useColecao('clientes', clientes);
  const indice = useIndice(listaClientes);
  const { pode } = useSessao();
  const { equipe } = useEquipe();
  const [busca, setBusca] = useState('');
  const [administradora, setAdministradora] = useState('');
  const [tipo, setTipo] = useState('');
  const [status, setStatus] = useState<StatusCota | ''>('');
  const [responsavel, setResponsavel] = useState('');
  const [pendencia, setPendencia] = useState<'' | 'pendente' | 'completo'>('');
  const [editando, setEditando] = useState<Cota | 'nova' | null>(null);
  const administradoras = useMemo(
    () => [...new Set((data ?? []).map((c) => c.administradora))].sort(),
    [data],
  );

  const filtradas = useMemo(
    () =>
      (data ?? [])
        .filter((c) => !administradora || c.administradora === administradora)
        .filter((c) => !tipo || c.tipoBem === tipo)
        .filter((c) => !status || c.status === status)
        .filter((c) => !responsavel || c.responsavelId === responsavel)
        .filter((c) => corresponde(busca, indice.get(c.clienteId)?.nome, c.grupo, c.cota, c.administradora, c.numeroProposta))
        .filter((c) => !pendencia || (pendencia === 'pendente') === camposPendentes(c).length > 0)
        .sort(
          (a, b) =>
            a.administradora.localeCompare(b.administradora) ||
            (a.grupo ?? '').localeCompare(b.grupo ?? '', 'pt-BR', { numeric: true }),
        ),
    [data, administradora, tipo, status, responsavel, busca, indice, pendencia],
  );

  return (
    <>
      <CabecalhoPagina
        titulo="Cotas"
        descricao={`${filtradas.length} de ${data?.length ?? 0} cotas.`}
        acoes={
          <Botao icone="mais" onClick={() => setEditando('nova')}>
            Nova cota
          </Botao>
        }
      />
      <Cartao>
        <BarraFiltros>
          <Campo rotulo="Buscar">
            <Entrada
              type="search"
              placeholder="Cliente, grupo, cota…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </Campo>
          <Campo rotulo="Administradora">
            <Selecao value={administradora} onChange={(e) => setAdministradora(e.target.value)}>
              <option value="">Todas</option>
              {administradoras.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Bem">
            <Selecao value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Todos</option>
              {TIPOS_BEM.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Situação">
            <Selecao value={status} onChange={(e) => setStatus(e.target.value as StatusCota | '')}>
              <option value="">Todas</option>
              {STATUS_COTA.map((s) => (
                <option key={s} value={s}>
                  {ROTULO_STATUS_COTA[s]}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Cadastro">
            <Selecao value={pendencia} onChange={(e) => setPendencia(e.target.value as '' | 'pendente' | 'completo')}>
              <option value="">Todos</option>
              <option value="pendente">A completar</option>
              <option value="completo">Completo</option>
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
          <TabelaCotas
            cotas={filtradas}
            aoClicar={setEditando}
            vazio={
              <EstadoVazio titulo="Nenhuma cota encontrada">
                Ajuste os filtros ou cadastre uma cota.
              </EstadoVazio>
            }
          />
        )}
      </Cartao>
      {editando && (
        <FormularioCota
          cota={editando === 'nova' ? undefined : editando}
          aoFechar={() => setEditando(null)}
        />
      )}
    </>
  );
}
