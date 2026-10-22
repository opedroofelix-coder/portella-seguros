import { AvisoAprovacoes, ROTA_FUNIL, useColecao, useServicos, useUsuario } from '@portella/app-base';
import { formatarData, formatarDinheiro, hojeISO, resumirFunil } from '@portella/core';
import { Barras, CabecalhoPagina, Cartao, Carregando, EstadoVazio, Indicador } from '@portella/ui';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { filaRenovacao, resumirCarteira } from '../../domain/apolice';
import { nomeRamo, nomeSeguradora } from '../../domain/catalogo';
import { SeloSituacao } from '../componentes/SeloSituacao';
import { useApolices } from '../hooks';

export function PaginaPainel() {
  const usuario = useUsuario();
  const { oportunidades, clientes } = useServicos();
  const { data: apolices, isPending } = useApolices();
  const { data: listaClientes = [] } = useColecao('clientes', clientes);
  const { data: listaOportunidades = [] } = useColecao('oportunidades', oportunidades);
  const navegar = useNavigate();
  const hoje = hojeISO();

  const resumo = useMemo(() => resumirCarteira(apolices ?? [], hoje), [apolices, hoje]);
  const fila = useMemo(() => filaRenovacao(apolices ?? [], hoje, 30).slice(0, 8), [apolices, hoje]);
  const funil = useMemo(() => resumirFunil(listaOportunidades), [listaOportunidades]);
  const nomeCliente = new Map(listaClientes.map((c) => [c.id, c.nome]));
  const primeiroNome = usuario.nome.split(' ')[0];

  if (isPending) return <Carregando />;

  return (
    <>
      <CabecalhoPagina
        titulo={
          <>
            Olá, <em>{primeiroNome}</em>
          </>
        }
        descricao={`Resumo da carteira em ${formatarData(hoje)}.`}
      />
      <AvisoAprovacoes />
      <div className="grade">
        <div className="grade-4">
          <Indicador
            tom="primaria"
            icone="documento"
            rotulo="Apólices ativas"
            valor={resumo.ativas.toLocaleString('pt-BR')}
            detalhe={`${listaClientes.length.toLocaleString('pt-BR')} clientes`}
          />
          <Indicador
            tom="alerta"
            icone="calendario"
            rotulo="Renovar em 30 dias"
            valor={resumo.aVencer30}
            detalhe={`${resumo.aVencer60} em 60 · ${resumo.aVencer90} em 90 dias`}
          />
          <Indicador
            tom="destaque"
            icone="carteira"
            rotulo="Prêmio ativo"
            valor={formatarDinheiro(resumo.premioAtivo)}
          />
          <Indicador
            tom="sucesso"
            icone="moeda"
            rotulo="Comissão prevista"
            valor={formatarDinheiro(resumo.comissaoAtiva)}
            detalhe="sobre o prêmio líquido"
          />
        </div>

        <Cartao titulo="Próximas renovações" acoes={<Link to="/renovacoes">Ver todas</Link>}>
          {fila.length ? (
            <ul className="lista-simples">
              {fila.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => navegar(`/clientes/${a.clienteId}`)}>
                    <span>
                      <strong>{nomeCliente.get(a.clienteId) ?? '—'}</strong>
                      <small>
                        {nomeRamo(a.ramo)} · {nomeSeguradora(a.seguradora)} · {formatarData(a.fimVigencia)}
                      </small>
                    </span>
                    <SeloSituacao apolice={a} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EstadoVazio titulo="Nenhuma renovação pendente">
              Nos próximos 30 dias não há apólices para renovar.
            </EstadoVazio>
          )}
        </Cartao>

        <div className="grade-3">
          <Cartao titulo="Apólices por seguradora">
            {resumo.porSeguradora.length ? (
              <Barras
                rotulo="Apólices ativas por seguradora"
                itens={resumo.porSeguradora
                  .slice(0, 8)
                  .map((s) => ({ rotulo: nomeSeguradora(s.seguradora), valor: s.quantidade }))}
              />
            ) : (
              <p className="texto-suave">Sem apólices ativas.</p>
            )}
          </Cartao>
          <Cartao titulo="Apólices por ramo">
            {resumo.porRamo.length ? (
              <Barras
                rotulo="Apólices ativas por ramo"
                itens={resumo.porRamo.map((r) => ({ rotulo: nomeRamo(r.ramo), valor: r.quantidade }))}
              />
            ) : (
              <p className="texto-suave">Sem apólices ativas.</p>
            )}
          </Cartao>
          <Cartao titulo="Cotações" acoes={<Link to={ROTA_FUNIL}>Abrir funil</Link>}>
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
