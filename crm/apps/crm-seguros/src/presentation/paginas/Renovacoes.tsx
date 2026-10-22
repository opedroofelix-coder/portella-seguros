import { mensagemErro, useSalvar, useSessao } from '@portella/app-base';
import { hojeISO, linkWhatsApp } from '@portella/core';
import {
  BarraFiltros,
  Botao,
  CabecalhoPagina,
  Campo,
  Cartao,
  Carregando,
  classesBotao,
  EstadoVazio,
  Selecao,
  useAvisos,
} from '@portella/ui';
import { useMemo, useState } from 'react';
import { useColecao, useIndice } from '@portella/app-base';
import { sugerirRenovacao } from '../../application/renovacao';
import type { Apolice } from '../../domain/apolice';
import { filaRenovacao } from '../../domain/apolice';
import { FormularioApolice } from '../componentes/FormularioApolice';
import { TabelaApolices } from '../componentes/TabelaApolices';
import { useApolices, useServicosSeguros } from '../hooks';

export function PaginaRenovacoes() {
  const { data, isPending } = useApolices();
  const { apolices, clientes } = useServicosSeguros();
  const { data: listaClientes } = useColecao('clientes', clientes);
  const indice = useIndice(listaClientes);
  const salvar = useSalvar('apolices', apolices);
  const { pode } = useSessao();
  const { avisar } = useAvisos();
  const [janela, setJanela] = useState(30);
  const [renovando, setRenovando] = useState<Apolice | null>(null);
  const fila = useMemo(() => filaRenovacao(data ?? [], hojeISO(), janela), [data, janela]);

  const marcar = (a: Apolice, renovacao: Apolice['renovacao'], texto: string) =>
    salvar.mutate(
      { ...a, renovacao },
      { onSuccess: () => avisar(texto), onError: (e) => avisar(mensagemErro(e), 'erro') },
    );

  return (
    <>
      <CabecalhoPagina
        titulo={
          <>
            Fila de <em>renovação</em>
          </>
        }
        descricao="Apólices a vencer (e vencidas há até 30 dias) que ainda não foram renovadas."
      />
      <Cartao>
        <BarraFiltros>
          <Campo rotulo="Vencendo em até">
            <Selecao value={janela} onChange={(e) => setJanela(Number(e.target.value))}>
              {[15, 30, 60, 90].map((d) => (
                <option key={d} value={d}>
                  {d} dias
                </option>
              ))}
            </Selecao>
          </Campo>
        </BarraFiltros>
        {isPending ? (
          <Carregando />
        ) : (
          <TabelaApolices
            apolices={fila}
            mostrarRenovacao
            vazio={
              <EstadoVazio titulo="Tudo em dia">Nenhuma apólice para renovar nesse período.</EstadoVazio>
            }
            acoes={(a) => {
              const telefone = indice.get(a.clienteId)?.telefone;
              const whatsapp = telefone ? linkWhatsApp(telefone) : null;
              if (!pode('registro:editar', a)) return null;
              return (
                <div
                  className="acoes-linha"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  {whatsapp && (
                    <a
                      className={classesBotao({ variante: 'fantasma', pequeno: true })}
                      href={whatsapp}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() =>
                        a.renovacao === 'pendente' && marcar(a, 'em_contato', 'Marcado como "em contato".')
                      }
                    >
                      WhatsApp
                    </a>
                  )}
                  {a.renovacao === 'pendente' && (
                    <Botao
                      variante="secundario"
                      pequeno
                      onClick={() => marcar(a, 'em_contato', 'Marcado como "em contato".')}
                    >
                      Em contato
                    </Botao>
                  )}
                  <Botao pequeno onClick={() => setRenovando(a)}>
                    Renovar
                  </Botao>
                  <Botao
                    variante="fantasma"
                    pequeno
                    onClick={() => marcar(a, 'nao_renovada', 'Marcada como não renovada.')}
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
    </>
  );
}
