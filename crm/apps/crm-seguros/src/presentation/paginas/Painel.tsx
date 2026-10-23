import {
  AvisoAprovacoes,
  ROTA_FUNIL,
  useColecao,
  useServicos,
  useSessao,
  useUsuario,
} from '@portella/app-base';
import { diasEntre, formatarData, formatarDinheiro, hojeISO, resumirFunil } from '@portella/core';
import type { Coluna } from '@portella/ui';
import { Barras, CabecalhoPagina, Cartao, Carregando, EstadoVazio, Indicador, Tabela } from '@portella/ui';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { filaRenovacao, resumirCarteira } from '../../domain/apolice';
import { nomeRamo, nomeSeguradora } from '../../domain/catalogo';
import { EstadoErro } from '../componentes/EstadoErro';
import { SeloSituacao } from '../componentes/SeloSituacao';
import { useApolices } from '../hooks';

/** Quantas seguradoras aparecem com nome antes de agrupar o resto em "Outras". */
const SEGURADORAS_NO_PAINEL = 6;
const LISTA_RENOVACOES = 8;

interface LinhaSeguradora {
  nome: string;
  quantidade: number;
  premio: number;
}

export function PaginaPainel() {
  const usuario = useUsuario();
  const { pode } = useSessao();
  const { oportunidades, clientes } = useServicos();
  const { data: apolices, isPending, isError, refetch } = useApolices();
  const { data: listaClientes = [], isPending: carregandoClientes } = useColecao('clientes', clientes);
  const { data: listaOportunidades = [] } = useColecao('oportunidades', oportunidades);
  const navegar = useNavigate();
  const hoje = hojeISO();
  const verComissao = pode('financeiro:gerenciar');

  const resumo = useMemo(() => resumirCarteira(apolices ?? [], hoje), [apolices, hoje]);
  // As mesmas apólices do indicador "Renovar em 30 dias": as vencidas ficam na fila de Renovações.
  const proximas = useMemo(
    () => filaRenovacao(apolices ?? [], hoje, 30).filter((a) => diasEntre(hoje, a.fimVigencia!) >= 0),
    [apolices, hoje],
  );
  const porSeguradora = useMemo<LinhaSeguradora[]>(() => {
    const linhas = resumo.porSeguradora.map((s) => ({
      nome: nomeSeguradora(s.seguradora),
      quantidade: s.quantidade,
      premio: s.premio,
    }));
    if (linhas.length <= SEGURADORAS_NO_PAINEL + 1) return linhas;
    const resto = linhas.slice(SEGURADORAS_NO_PAINEL);
    return [
      ...linhas.slice(0, SEGURADORAS_NO_PAINEL),
      {
        nome: `Outras ${resto.length} seguradoras`,
        quantidade: resto.reduce((t, s) => t + s.quantidade, 0),
        premio: resto.reduce((t, s) => t + s.premio, 0),
      },
    ];
  }, [resumo]);
  const funil = useMemo(() => resumirFunil(listaOportunidades), [listaOportunidades]);
  const nomeCliente = new Map(listaClientes.map((c) => [c.id, c.nome]));
  const primeiroNome = usuario.nome.split(' ')[0];

  const cabecalho = (
    <CabecalhoPagina
      titulo={
        <>
          Olá, <em>{primeiroNome}</em>
        </>
      }
      descricao={`Resumo da carteira em ${formatarData(hoje)}.`}
    />
  );
  if (isError) {
    return (
      <>
        {cabecalho}
        <EstadoErro oque="a carteira" aoTentar={() => refetch()} />
      </>
    );
  }
  if (isPending || carregandoClientes) {
    return (
      <>
        {cabecalho}
        <Carregando texto="Carregando a carteira…" />
      </>
    );
  }

  const colunasSeguradora: Coluna<LinhaSeguradora>[] = [
    { chave: 'nome', titulo: 'Seguradora', principal: true, render: (s) => s.nome },
    { chave: 'qtd', titulo: 'Apólices', alinharDireita: true, render: (s) => s.quantidade },
    {
      chave: 'premio',
      titulo: 'Prêmio líquido',
      alinharDireita: true,
      render: (s) => formatarDinheiro(s.premio),
    },
  ];

  return (
    <>
      {cabecalho}
      <AvisoAprovacoes />
      <div className="grade">
        <div className="grade-4">
          <Indicador
            tom="primaria"
            icone="documento"
            rotulo="Apólices vigentes"
            valor={resumo.ativas.toLocaleString('pt-BR')}
            detalhe={`${listaClientes.length.toLocaleString('pt-BR')} clientes${
              resumo.aIniciar ? ` · ${resumo.aIniciar} a iniciar` : ''
            }`}
            para="/apolices"
          />
          <Indicador
            tom="alerta"
            icone="calendario"
            rotulo="Renovar em 30 dias"
            valor={resumo.aVencer30}
            detalhe={`até 60 dias: ${resumo.aVencer60} · até 90: ${resumo.aVencer90}`}
            para="/renovacoes"
          />
          <Indicador
            tom="destaque"
            icone="carteira"
            rotulo="Prêmio líquido vigente"
            valor={formatarDinheiro(resumo.premioAtivo)}
            detalhe="só apólices vigentes e a vencer"
          />
          {verComissao ? (
            <Indicador
              tom="sucesso"
              icone="moeda"
              rotulo="Comissão prevista"
              valor={formatarDinheiro(resumo.comissaoAtiva)}
              detalhe="sobre o prêmio líquido"
            />
          ) : (
            <Indicador
              tom="sucesso"
              icone="funil"
              rotulo="Cotações em aberto"
              valor={funil.emAberto}
              detalhe={`${funil.porEtapa.proposta} com proposta enviada`}
              para={ROTA_FUNIL}
            />
          )}
        </div>

        <Cartao titulo="Renovações dos próximos 30 dias" acoes={<Link to="/renovacoes">Abrir a fila</Link>}>
          {proximas.length ? (
            <>
              {proximas.length > LISTA_RENOVACOES && (
                <p className="texto-suave">
                  Mostrando {LISTA_RENOVACOES} de {proximas.length}. As vencidas ficam na fila de renovação.
                </p>
              )}
              <ul className="lista-simples">
                {proximas.slice(0, LISTA_RENOVACOES).map((a) => (
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
            </>
          ) : (
            <EstadoVazio titulo="Nada vence nos próximos 30 dias">
              As vencidas que ainda podem ser renovadas estão na fila de renovação.
            </EstadoVazio>
          )}
        </Cartao>

        <div className="grade-3">
          <Cartao titulo="Por seguradora">
            {porSeguradora.length ? (
              <Tabela
                rotulo="Apólices vigentes por seguradora"
                itens={porSeguradora}
                colunas={colunasSeguradora}
                chave={(s) => s.nome}
                porPagina={SEGURADORAS_NO_PAINEL + 1}
              />
            ) : (
              <EstadoVazio titulo="Sem apólices vigentes" />
            )}
          </Cartao>
          <Cartao titulo="Por ramo">
            {resumo.porRamo.length ? (
              <Barras
                rotulo="Apólices vigentes por ramo"
                itens={resumo.porRamo.map((r) => ({ rotulo: nomeRamo(r.ramo), valor: r.quantidade }))}
              />
            ) : (
              <EstadoVazio titulo="Sem apólices vigentes" />
            )}
          </Cartao>
          <Cartao titulo="Cotações" acoes={<Link to={ROTA_FUNIL}>Abrir funil</Link>}>
            <dl className="lista-dados">
              <div>
                <dt>Em aberto</dt>
                <dd>{funil.emAberto}</dd>
              </div>
              <div>
                <dt>Com proposta enviada</dt>
                <dd>{funil.porEtapa.proposta}</dd>
              </div>
              <div>
                <dt>Fechadas</dt>
                <dd>{funil.porEtapa.ganho}</dd>
              </div>
              <div>
                <dt>Fechadas entre as encerradas</dt>
                <dd>{funil.taxaConversao == null ? '—' : `${Math.round(funil.taxaConversao * 100)}%`}</dd>
              </div>
            </dl>
          </Cartao>
        </div>
      </div>
    </>
  );
}
