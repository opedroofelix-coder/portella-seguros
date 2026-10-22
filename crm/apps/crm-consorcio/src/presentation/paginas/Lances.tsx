import { mensagemErro, useColecao, useIndice, useSessao, useUsuario } from '@portella/app-base';
import { formatarData, formatarDinheiro } from '@portella/core';
import {
  BarraFiltros,
  Botao,
  CabecalhoPagina,
  Campo,
  Cartao,
  Carregando,
  EstadoVazio,
  Selecao,
  Tabela,
  useAvisos,
} from '@portella/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { registrarResultado } from '../../application/lances';
import type { Lance, ResultadoLance } from '../../domain/lance';
import { RESULTADOS_LANCE, ROTULO_RESULTADO, ROTULO_TIPO_LANCE } from '../../domain/lance';
import { FormularioLance } from '../componentes/FormularioLance';
import { SeloLance } from '../componentes/Selos';
import { useCotas, useLances, useServicosConsorcio } from '../hooks';

export function PaginaLances() {
  const usuario = useUsuario();
  const { lances, cotas: servicoCotas, clientes } = useServicosConsorcio();
  const { data, isPending } = useLances();
  const { data: cotas } = useCotas();
  const { data: listaClientes } = useColecao('clientes', clientes);
  const indiceCotas = useIndice(cotas);
  const indiceClientes = useIndice(listaClientes);
  const { pode } = useSessao();
  const { avisar } = useAvisos();
  const consultas = useQueryClient();
  const [filtro, setFiltro] = useState<ResultadoLance | ''>('aguardando');
  const [editando, setEditando] = useState<Lance | 'novo' | null>(null);

  const lista = useMemo(
    () =>
      (data ?? [])
        .filter((l) => !filtro || l.resultado === filtro)
        .sort((a, b) => a.assembleia.localeCompare(b.assembleia)),
    [data, filtro],
  );

  const resultado = async (l: Lance, r: ResultadoLance) => {
    try {
      await registrarResultado(lances, servicoCotas, usuario, l, r);
      await consultas.invalidateQueries({ queryKey: ['lances'] });
      await consultas.invalidateQueries({ queryKey: ['cotas'] });
      avisar(r === 'contemplado' ? 'Parabéns! Cota contemplada por lance.' : 'Resultado registrado.');
    } catch (e) {
      avisar(mensagemErro(e), 'erro');
    }
  };

  const descricaoCota = (l: Lance) => {
    const c = indiceCotas.get(l.cotaId);
    return c ? `${c.administradora} ${c.grupo}/${c.cota}` : '—';
  };

  return (
    <>
      <CabecalhoPagina
        titulo={
          <>
            Lances e <em>assembleias</em>
          </>
        }
        descricao="Registre os lances ofertados e o resultado de cada assembleia."
        acoes={
          <Botao icone="mais" onClick={() => setEditando('novo')}>
            Novo lance
          </Botao>
        }
      />
      <Cartao>
        <BarraFiltros>
          <Campo rotulo="Resultado">
            <Selecao value={filtro} onChange={(e) => setFiltro(e.target.value as ResultadoLance | '')}>
              <option value="">Todos</option>
              {RESULTADOS_LANCE.map((r) => (
                <option key={r} value={r}>
                  {ROTULO_RESULTADO[r]}
                </option>
              ))}
            </Selecao>
          </Campo>
        </BarraFiltros>
        {isPending ? (
          <Carregando />
        ) : (
          <Tabela
            rotulo="Lances"
            itens={lista}
            chave={(l) => l.id}
            aoClicar={(l) => pode('registro:editar', l) && setEditando(l)}
            vazio={
              <EstadoVazio titulo="Nenhum lance">Registre um lance para acompanhar a assembleia.</EstadoVazio>
            }
            colunas={[
              {
                chave: 'cliente',
                titulo: 'Cliente',
                principal: true,
                render: (l) => indiceClientes.get(indiceCotas.get(l.cotaId)?.clienteId ?? '')?.nome ?? '—',
              },
              { chave: 'cota', titulo: 'Cota', render: descricaoCota },
              { chave: 'assembleia', titulo: 'Assembleia', render: (l) => formatarData(l.assembleia) },
              {
                chave: 'oferta',
                titulo: 'Oferta',
                render: (l) =>
                  [
                    ROTULO_TIPO_LANCE[l.tipo],
                    l.percentual != null && `${String(l.percentual).replace('.', ',')}%`,
                    l.valor != null && formatarDinheiro(l.valor),
                  ]
                    .filter(Boolean)
                    .join(' · '),
              },
              {
                chave: 'resultado',
                titulo: 'Resultado',
                render: (l) => <SeloLance resultado={l.resultado} />,
              },
              {
                chave: 'acoes',
                titulo: 'Ações',
                render: (l) =>
                  l.resultado === 'aguardando' && pode('registro:editar', l) ? (
                    <div
                      className="acoes-linha"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <Botao pequeno onClick={() => resultado(l, 'contemplado')}>
                        Contemplado
                      </Botao>
                      <Botao pequeno variante="secundario" onClick={() => resultado(l, 'nao_contemplado')}>
                        Não contemplado
                      </Botao>
                    </div>
                  ) : null,
              },
            ]}
          />
        )}
      </Cartao>
      {editando && (
        <FormularioLance
          lance={editando === 'novo' ? undefined : editando}
          aoFechar={() => setEditando(null)}
        />
      )}
    </>
  );
}
