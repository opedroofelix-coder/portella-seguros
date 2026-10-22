import {
  AvisoAprovacoes,
  ROTA_FUNIL,
  useColecao,
  useIndice,
  useServicos,
  useUsuario,
} from '@portella/app-base';
import { formatarData, formatarDinheiro, hojeISO, resumirFunil } from '@portella/core';
import { Barras, CabecalhoPagina, Cartao, Carregando, EstadoVazio, Indicador } from '@portella/ui';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { identificacaoCota, nomeTipoBem, resumirCotas } from '../../domain/cota';
import { SeloLance } from '../componentes/Selos';
import { useCotas, useLances } from '../hooks';

export function PaginaPainel() {
  const usuario = useUsuario();
  const { clientes, oportunidades } = useServicos();
  const { data: cotas, isPending } = useCotas();
  const { data: lances = [] } = useLances();
  const { data: listaClientes = [] } = useColecao('clientes', clientes);
  const { data: listaOportunidades = [] } = useColecao('oportunidades', oportunidades);
  const indiceCotas = useIndice(cotas);
  const indiceClientes = useIndice(listaClientes);
  const navegar = useNavigate();
  const hoje = hojeISO();

  const resumo = useMemo(() => resumirCotas(cotas ?? []), [cotas]);
  const funil = useMemo(() => resumirFunil(listaOportunidades), [listaOportunidades]);
  const proximos = useMemo(
    () =>
      lances
        .filter((l) => l.resultado === 'aguardando')
        .sort((a, b) => a.assembleia.localeCompare(b.assembleia))
        .slice(0, 8),
    [lances],
  );

  if (isPending) return <Carregando />;

  return (
    <>
      <CabecalhoPagina
        titulo={
          <>
            Olá, <em>{usuario.nome.split(' ')[0]}</em>
          </>
        }
        descricao={`Resumo do consórcio em ${formatarData(hoje)}.`}
      />
      <AvisoAprovacoes />
      <div className="grade">
        <div className="grade-4">
          <Indicador
            rotulo="Cotas ativas"
            valor={resumo.ativas.toLocaleString('pt-BR')}
            detalhe={
              resumo.pendentes
                ? `${resumo.pendentes} com cadastro a completar`
                : `${listaClientes.length.toLocaleString('pt-BR')} clientes`
            }
          />
          <Indicador
            rotulo="Contempladas"
            valor={resumo.contempladas.toLocaleString('pt-BR')}
            detalhe={formatarDinheiro(resumo.creditoContemplado)}
          />
          <Indicador rotulo="Crédito em andamento" valor={formatarDinheiro(resumo.creditoAtivo)} />
          <Indicador
            rotulo="Lances aguardando"
            valor={lances.filter((l) => l.resultado === 'aguardando').length}
          />
        </div>

        <Cartao titulo="Próximas assembleias" acoes={<Link to="/lances">Ver lances</Link>}>
          {proximos.length ? (
            <ul className="lista-simples">
              {proximos.map((l) => {
                const cota = indiceCotas.get(l.cotaId);
                return (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => navegar(cota ? `/clientes/${cota.clienteId}` : '/lances')}
                    >
                      <span>
                        <strong>{indiceClientes.get(cota?.clienteId ?? '')?.nome ?? '—'}</strong>
                        <small>
                          {cota ? `${cota.administradora} ${identificacaoCota(cota)}` : '—'} ·{' '}
                          {formatarData(l.assembleia)}
                        </small>
                      </span>
                      <SeloLance resultado={l.resultado} />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EstadoVazio titulo="Nenhum lance aguardando">Registre os lances em Lances.</EstadoVazio>
          )}
        </Cartao>

        <div className="grade-3">
          <Cartao titulo="Cotas por administradora">
            {resumo.porAdministradora.length ? (
              <Barras
                rotulo="Cotas em carteira por administradora"
                itens={resumo.porAdministradora
                  .slice(0, 8)
                  .map((a) => ({ rotulo: a.administradora, valor: a.quantidade }))}
              />
            ) : (
              <p className="texto-suave">Sem cotas em carteira.</p>
            )}
          </Cartao>
          <Cartao titulo="Cotas por tipo de bem">
            {resumo.porTipo.length ? (
              <Barras
                rotulo="Cotas em carteira por tipo de bem"
                itens={resumo.porTipo.map((t) => ({ rotulo: nomeTipoBem(t.tipo), valor: t.quantidade }))}
              />
            ) : (
              <p className="texto-suave">Sem cotas em carteira.</p>
            )}
          </Cartao>
          <Cartao titulo="Propostas" acoes={<Link to={ROTA_FUNIL}>Abrir funil</Link>}>
            <dl className="lista-dados">
              <div>
                <dt>Em aberto</dt>
                <dd>{funil.emAberto}</dd>
              </div>
              <div>
                <dt>Propostas enviadas</dt>
                <dd>{funil.porEtapa.proposta}</dd>
              </div>
              <div>
                <dt>Fechadas</dt>
                <dd>{funil.porEtapa.ganho}</dd>
              </div>
              <div>
                <dt>Conversão</dt>
                <dd>{funil.taxaConversao == null ? '—' : `${Math.round(funil.taxaConversao * 100)}%`}</dd>
              </div>
            </dl>
          </Cartao>
        </div>
      </div>
    </>
  );
}
