import type { LinhaCrescimento, Periodo, Proposta } from '@portella/core';
import { CORRETORA, formatarDinheiro, hojeISO, montarPainel } from '@portella/core';
import {
  Barras,
  BarraFiltros,
  CabecalhoPagina,
  Campo,
  Cartao,
  Carregando,
  EstadoVazio,
  Indicador,
  Selecao,
  Tabela,
} from '@portella/ui';
import { useMemo, useState } from 'react';
import { useRefinada } from '../config';
import { useColecao, useEquipe } from '../hooks/dados';
import { useServicos } from '../servicos';
import { useSessao, useUsuario } from '../sessao/Sessao';
import { AvisoAprovacoes } from './Propostas';
import { rotuloMes } from './Relatorios';

const pct = (v: number | null | undefined) =>
  v == null ? '—' : `${v >= 0 ? '+' : ''}${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

type Filtro = 'tudo' | 'ano' | 'mes';

/** Painel de produção (dashboard): prêmio emitido, comissões, produtores, produtos, seguradoras e crescimento. */
export function PaginaProducao() {
  const { propostas } = useServicos();
  const { pode } = useSessao();
  const { nomeDe } = useEquipe();
  const { data, isPending } = useColecao<Proposta>('propostas', propostas);
  const aprovadas = useMemo(() => (data ?? []).filter((p) => p.status === 'aprovada'), [data]);
  const anos = useMemo(
    () => [...new Set(aprovadas.map((p) => p.data.slice(0, 4)))].sort().reverse(),
    [aprovadas],
  );
  const meses = useMemo(
    () => [...new Set(aprovadas.map((p) => p.data.slice(0, 7)))].sort().reverse(),
    [aprovadas],
  );
  const [filtro, setFiltro] = useState<Filtro>('ano');
  const [ano, setAno] = useState<string | null>(null);
  const [mes, setMes] = useState<string | null>(null);
  const anoAtivo = ano ?? anos[0] ?? hojeISO().slice(0, 4);
  const mesAtivo = mes ?? meses[0] ?? hojeISO().slice(0, 7);

  const periodo: Periodo =
    filtro === 'ano'
      ? { de: `${anoAtivo}-01`, ate: `${anoAtivo}-12` }
      : filtro === 'mes'
        ? { de: mesAtivo, ate: mesAtivo }
        : {};
  const painel = useMemo(() => montarPainel(aprovadas, periodo), [aprovadas, periodo.de, periodo.ate]); // eslint-disable-line react-hooks/exhaustive-deps
  const nomeProdutor = (id: string) => (id === CORRETORA ? 'Corretora' : nomeDe(id));
  const gestao = pode('financeiro:gerenciar');
  const usuario = useUsuario();
  const refinada = useRefinada();
  // Interface refinada: o produtor vê a própria produção e o próprio repasse, nunca a comissão
  // que a corretora recebe da seguradora nem o repasse dos colegas (spec §0.2 e §4.1).
  const soMeu = refinada && !gestao;
  const meuRepasse = painel.pendentes.find((g) => g.produtorId === usuario.id)?.repasseProjetado ?? 0;
  const qtd = (n: number) => (refinada ? `${n} proposta${n === 1 ? '' : 's'}` : `${n}`);

  const cabecalho = (
    <CabecalhoPagina
      titulo={
        <>
          Painel de <em>produção</em>
        </>
      }
      descricao="Propostas aprovadas. Produção = prêmio líquido pela data da proposta."
    />
  );
  if (isPending)
    return refinada ? (
      <>
        {cabecalho}
        <Carregando texto="Carregando a produção…" />
      </>
    ) : (
      <Carregando />
    );

  return (
    <>
      {cabecalho}
      {gestao && <AvisoAprovacoes />}
      <Cartao style={{ marginBottom: 20 }}>
        <BarraFiltros>
          <Campo rotulo="Período">
            <Selecao value={filtro} onChange={(e) => setFiltro(e.target.value as Filtro)}>
              <option value="ano">Ano</option>
              <option value="mes">Mês</option>
              <option value="tudo">Todo o período</option>
            </Selecao>
          </Campo>
          {filtro === 'ano' && (
            <Campo rotulo="Ano">
              <Selecao value={anoAtivo} onChange={(e) => setAno(e.target.value)}>
                {(anos.length ? anos : [anoAtivo]).map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </Selecao>
            </Campo>
          )}
          {filtro === 'mes' && (
            <Campo rotulo="Mês">
              <Selecao value={mesAtivo} onChange={(e) => setMes(e.target.value)}>
                {(meses.length ? meses : [mesAtivo]).map((m) => (
                  <option key={m} value={m}>
                    {rotuloMes(m)}
                  </option>
                ))}
              </Selecao>
            </Campo>
          )}
        </BarraFiltros>
        <div className="grade-4">
          <Indicador
            tom="primaria"
            icone="tendencia"
            rotulo="Produção (prêmio líquido)"
            valor={formatarDinheiro(painel.producao)}
            detalhe={`${painel.quantidade} proposta(s)`}
          />
          {soMeu ? (
            <Indicador
              tom="sucesso"
              icone="moeda"
              rotulo="Meu repasse a receber"
              valor={formatarDinheiro(meuRepasse)}
              detalhe="das propostas com saldo, sem filtro de período"
            />
          ) : (
            <>
              <Indicador
                tom="sucesso"
                icone="moeda"
                rotulo="Comissão recebida"
                valor={formatarDinheiro(painel.comissaoRecebida)}
                detalhe="pela data do recebimento"
              />
              <Indicador
                tom="info"
                icone="usuarios"
                rotulo="Repassada aos produtores"
                valor={formatarDinheiro(painel.comissaoRepassada)}
              />
              <Indicador
                tom="alerta"
                icone="moeda"
                rotulo="Saldo a receber"
                valor={formatarDinheiro(painel.saldoReceber)}
                detalhe="todas as propostas, sem filtro"
              />
            </>
          )}
        </div>
      </Cartao>

      {!aprovadas.length ? (
        <EstadoVazio titulo="Sem produção ainda">
          Lance e aprove propostas, ou importe a planilha.
        </EstadoVazio>
      ) : (
        <div className="grade">
          <div className="grade-3">
            <Indicador
              tom="destaque"
              icone="mais"
              rotulo="Seguro novo"
              valor={formatarDinheiro(painel.porTipo.novo.premio)}
              detalhe={`${painel.porTipo.novo.quantidade} proposta(s)`}
            />
            <Indicador
              tom="info"
              icone="calendario"
              rotulo="Renovação"
              valor={formatarDinheiro(painel.porTipo.renovacao.premio)}
              detalhe={`${painel.porTipo.renovacao.quantidade} proposta(s)${painel.porTipo.endosso.quantidade ? ` · endosso: ${formatarDinheiro(painel.porTipo.endosso.premio)} (${painel.porTipo.endosso.quantidade})` : ''}`}
            />
            <Indicador
              tom="primaria"
              icone={refinada ? 'documento' : undefined}
              rotulo="Tipo não informado"
              valor={formatarDinheiro(painel.porTipo.nao_informado.premio)}
              detalhe={`${painel.porTipo.nao_informado.quantidade} proposta(s)`}
            />
          </div>
          <div className="grade-3">
            {!soMeu && (
              <Cartao titulo="Por produtor">
                <Barras
                  rotulo="Prêmio líquido por produtor (proporcional ao %)"
                  itens={painel.porProdutor.map((g) => ({
                    chave: g.chave,
                    rotulo: nomeProdutor(g.chave),
                    valor: g.premio,
                    valorTexto: formatarDinheiro(g.premio),
                    detalhe: qtd(g.quantidade),
                  }))}
                />
                <p className="texto-suave" style={{ fontSize: 13, marginBottom: 0 }}>
                  Dividido pelo % de cada produtor na proposta.
                </p>
              </Cartao>
            )}
            <Cartao titulo="Por produto">
              <Barras
                rotulo="Prêmio líquido por produto"
                itens={painel.porProduto.map((g) => ({
                  rotulo: g.chave,
                  valor: g.premio,
                  valorTexto: formatarDinheiro(g.premio),
                  detalhe: qtd(g.quantidade),
                }))}
              />
            </Cartao>
            <Cartao titulo="Por seguradora">
              {refinada ? (
                // Todas as seguradoras, com os valores exatos (spec §0.7).
                <Tabela
                  rotulo="Prêmio líquido por seguradora"
                  itens={painel.porCompanhia}
                  chave={(g) => g.chave}
                  porPagina={10}
                  colunas={[
                    { chave: 'seg', titulo: 'Seguradora', principal: true, render: (g) => g.chave },
                    { chave: 'qtd', titulo: 'Propostas', alinharDireita: true, render: (g) => g.quantidade },
                    {
                      chave: 'premio',
                      titulo: 'Prêmio líquido',
                      alinharDireita: true,
                      render: (g) => formatarDinheiro(g.premio),
                    },
                  ]}
                />
              ) : (
                <>
                  <Barras
                    rotulo="Prêmio líquido por seguradora"
                    itens={painel.porCompanhia.slice(0, 15).map((g) => ({
                      rotulo: g.chave,
                      valor: g.premio,
                      valorTexto: formatarDinheiro(g.premio),
                      detalhe: `${g.quantidade}`,
                    }))}
                  />
                  {painel.porCompanhia.length > 15 && (
                    <p className="texto-suave" style={{ fontSize: 13, marginBottom: 0 }}>
                      15 maiores de {painel.porCompanhia.length}.
                    </p>
                  )}
                </>
              )}
            </Cartao>
          </div>

          {!soMeu && (
            <Cartao titulo="Comissão pendente por produtor">
              <Tabela
                rotulo="Comissão pendente por produtor"
                itens={painel.pendentes}
                chave={(g) => g.produtorId || 'corretora'}
                vazio={<p className="texto-suave">Nada pendente.</p>}
                colunas={[
                  {
                    chave: 'produtor',
                    titulo: 'Produtor',
                    principal: true,
                    render: (g) => nomeProdutor(g.produtorId),
                  },
                  { chave: 'qtd', titulo: 'Propostas', alinharDireita: true, render: (g) => g.itens.length },
                  {
                    chave: 'saldo',
                    titulo: 'Saldo a receber',
                    alinharDireita: true,
                    render: (g) => formatarDinheiro(g.saldo),
                  },
                  {
                    chave: 'repasse',
                    titulo: 'Repasse previsto',
                    alinharDireita: true,
                    render: (g) => formatarDinheiro(g.repasseProjetado),
                  },
                ]}
              />
            </Cartao>
          )}

          <Cartao titulo="Crescimento mês a mês">
            <TabelaCrescimento linhas={[...painel.crescimentoMensal].reverse().slice(0, 24)} mensal />
          </Cartao>
          <Cartao titulo="Crescimento ano a ano">
            <TabelaCrescimento linhas={[...painel.crescimentoAnual].reverse()} />
          </Cartao>
        </div>
      )}
    </>
  );
}

function TabelaCrescimento({ linhas, mensal }: { linhas: LinhaCrescimento[]; mensal?: boolean }) {
  return (
    <Tabela
      rotulo={mensal ? 'Crescimento mensal' : 'Crescimento anual'}
      itens={linhas}
      chave={(l) => l.periodo}
      porPagina={12}
      colunas={[
        {
          chave: 'periodo',
          titulo: mensal ? 'Mês' : 'Ano',
          principal: true,
          render: (l) => (mensal ? rotuloMes(l.periodo) : l.periodo),
        },
        {
          chave: 'premio',
          titulo: 'Prêmio líquido',
          alinharDireita: true,
          render: (l) => formatarDinheiro(l.premio),
        },
        {
          chave: 'anterior',
          titulo: mensal ? 'vs mês anterior' : 'vs ano anterior',
          alinharDireita: true,
          render: (l) => pct(l.variacaoAnterior),
        },
        ...(mensal
          ? [
              {
                chave: 'ano',
                titulo: 'vs mesmo mês do ano anterior',
                alinharDireita: true,
                render: (l: LinhaCrescimento) => pct(l.variacaoAnoAnterior),
              },
            ]
          : []),
      ]}
    />
  );
}
