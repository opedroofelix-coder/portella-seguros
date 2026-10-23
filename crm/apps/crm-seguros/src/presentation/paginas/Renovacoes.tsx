import { mensagemErro, useColecao, useIndice, useSalvar, useSessao } from '@portella/app-base';
import { corresponde, diasEntre, formatarData, hojeISO, linkWhatsApp } from '@portella/core';
import {
  BarraFiltros,
  Botao,
  CabecalhoPagina,
  Campo,
  Cartao,
  Carregando,
  classesBotao,
  ConfirmarAcao,
  Entrada,
  EstadoVazio,
  Selecao,
  useAvisos,
} from '@portella/ui';
import { useMemo, useState } from 'react';
import { sugerirRenovacao } from '../../application/renovacao';
import type { Apolice } from '../../domain/apolice';
import { filaRenovacao, MOTIVOS_NAO_RENOVACAO } from '../../domain/apolice';
import { nomeRamo, nomeSeguradora } from '../../domain/catalogo';
import { EstadoErro } from '../componentes/EstadoErro';
import { FormularioApolice } from '../componentes/FormularioApolice';
import { TabelaApolices } from '../componentes/TabelaApolices';
import { useApolices, useServicosSeguros } from '../hooks';

/** Mensagem pronta para o WhatsApp do cliente. */
function mensagemRenovacao(nome: string | undefined, a: Apolice, hoje: string) {
  const primeiro = nome?.split(' ')[0];
  const fim = a.fimVigencia!;
  const quando =
    diasEntre(hoje, fim) < 0 ? `venceu em ${formatarData(fim)}` : `vence em ${formatarData(fim)}`;
  return `Olá${primeiro ? `, ${primeiro}` : ''}! Aqui é da Portella Seguros. O seu seguro ${nomeRamo(a.ramo)} (${nomeSeguradora(a.seguradora)}) ${quando}. Podemos cuidar da renovação para você?`;
}

export function PaginaRenovacoes() {
  const { data, isPending, isError, refetch } = useApolices();
  const { apolices, clientes } = useServicosSeguros();
  const { data: listaClientes } = useColecao('clientes', clientes);
  const indice = useIndice(listaClientes);
  const salvar = useSalvar('apolices', apolices);
  const { pode } = useSessao();
  const { avisar } = useAvisos();
  const [janela, setJanela] = useState(30);
  const [busca, setBusca] = useState('');
  const [contato, setContato] = useState<'' | Apolice['renovacao']>('');
  const [renovando, setRenovando] = useState<Apolice | null>(null);
  const [abrindo, setAbrindo] = useState<Apolice | null>(null);
  const [naoRenovou, setNaoRenovou] = useState<Apolice | null>(null);
  const [motivo, setMotivo] = useState<string>(MOTIVOS_NAO_RENOVACAO[0]);
  const hoje = hojeISO();

  const fila = useMemo(() => filaRenovacao(data ?? [], hoje, janela), [data, hoje, janela]);
  const vencidas = fila.filter((a) => diasEntre(hoje, a.fimVigencia!) < 0).length;
  const visiveis = useMemo(
    () =>
      fila
        .filter((a) => !contato || a.renovacao === contato)
        .filter((a) =>
          corresponde(busca, indice.get(a.clienteId)?.nome, a.numero, nomeSeguradora(a.seguradora)),
        ),
    [fila, contato, busca, indice],
  );

  const marcar = (a: Apolice, dados: Partial<Apolice>, texto: string, depois?: () => void) =>
    salvar.mutate(
      { ...a, ...dados },
      {
        onSuccess: () => {
          avisar(texto);
          depois?.();
        },
        onError: (e) => avisar(mensagemErro(e), 'erro'),
      },
    );

  return (
    <>
      <CabecalhoPagina
        titulo={
          <>
            Fila de <em>renovação</em>
          </>
        }
        descricao={
          isPending
            ? 'Carregando a fila…'
            : `${fila.length - vencidas} vence${fila.length - vencidas === 1 ? '' : 'm'} em até ${janela} dias${
                vencidas ? ` · ${vencidas} vencida${vencidas === 1 ? '' : 's'} há menos de 30 dias` : ''
              }.`
        }
      />
      <Cartao>
        <BarraFiltros>
          <Campo rotulo="Buscar">
            <Entrada
              type="search"
              placeholder="Cliente, nº ou seguradora"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </Campo>
          <Campo rotulo="Vence em até" dica="As vencidas há até 30 dias aparecem sempre.">
            <Selecao value={janela} onChange={(e) => setJanela(Number(e.target.value))}>
              {[15, 30, 60, 90].map((d) => (
                <option key={d} value={d}>
                  {d} dias
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Contato">
            <Selecao value={contato} onChange={(e) => setContato(e.target.value as typeof contato)}>
              <option value="">Todos</option>
              <option value="pendente">Sem contato</option>
              <option value="em_contato">Em contato</option>
            </Selecao>
          </Campo>
        </BarraFiltros>
        {isError ? (
          <EstadoErro oque="a fila de renovação" aoTentar={() => refetch()} />
        ) : isPending ? (
          <Carregando texto="Carregando a fila…" />
        ) : (
          <TabelaApolices
            apolices={visiveis}
            mostrarRenovacao
            aoClicar={setAbrindo}
            vazio={
              <EstadoVazio titulo={fila.length ? 'Nenhuma apólice com estes filtros' : 'Tudo em dia'}>
                {fila.length
                  ? 'Mude a busca ou o filtro de contato.'
                  : `Nenhuma apólice para renovar nos próximos ${janela} dias.`}
              </EstadoVazio>
            }
            acoes={(a) => {
              if (!pode('registro:editar', a)) return null;
              const cliente = indice.get(a.clienteId);
              const whatsapp = cliente?.telefone ? linkWhatsApp(cliente.telefone) : null;
              const ocupado = salvar.isPending && salvar.variables?.id === a.id;
              return (
                <div className="acoes-linha">
                  {whatsapp ? (
                    <a
                      className={classesBotao({ variante: 'secundario', pequeno: true })}
                      href={`${whatsapp}?text=${encodeURIComponent(mensagemRenovacao(cliente?.nome, a, hoje))}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`WhatsApp de ${cliente?.nome ?? 'cliente'} (abre em nova aba)`}
                      onClick={() =>
                        a.renovacao === 'pendente' &&
                        marcar(a, { renovacao: 'em_contato' }, 'Marcada como "em contato".')
                      }
                    >
                      WhatsApp
                    </a>
                  ) : (
                    a.renovacao === 'pendente' && (
                      <Botao
                        variante="secundario"
                        pequeno
                        disabled={ocupado}
                        onClick={() => marcar(a, { renovacao: 'em_contato' }, 'Marcada como "em contato".')}
                      >
                        Em contato
                      </Botao>
                    )
                  )}
                  <Botao pequeno disabled={ocupado} onClick={() => setRenovando(a)}>
                    Renovar
                  </Botao>
                  <Botao
                    variante="fantasma"
                    pequeno
                    disabled={ocupado}
                    onClick={() => {
                      setMotivo(MOTIVOS_NAO_RENOVACAO[0]);
                      setNaoRenovou(a);
                    }}
                  >
                    Não renovou
                  </Botao>
                </div>
              );
            }}
          />
        )}
      </Cartao>
      {renovando && (
        <FormularioApolice
          inicial={sugerirRenovacao(renovando)}
          renovando={renovando}
          aoFechar={() => setRenovando(null)}
        />
      )}
      {abrindo && <FormularioApolice apolice={abrindo} aoFechar={() => setAbrindo(null)} />}
      <ConfirmarAcao
        aberto={naoRenovou != null}
        titulo="Marcar como não renovada?"
        mensagem={`${indice.get(naoRenovou?.clienteId ?? '')?.nome ?? 'A apólice'} sai da fila. Dá para desfazer na ficha da apólice, em "Renovação".`}
        textoConfirmar="Marcar não renovada"
        perigo
        carregando={salvar.isPending}
        aoCancelar={() => setNaoRenovou(null)}
        aoConfirmar={() =>
          naoRenovou &&
          marcar(
            naoRenovou,
            { renovacao: 'nao_renovada', motivoNaoRenovacao: motivo },
            'Marcada como não renovada.',
            () => setNaoRenovou(null),
          )
        }
      >
        <Campo rotulo="Motivo">
          <Selecao value={motivo} onChange={(e) => setMotivo(e.target.value)}>
            {MOTIVOS_NAO_RENOVACAO.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Selecao>
        </Campo>
      </ConfirmarAcao>
    </>
  );
}
