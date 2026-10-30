import {
  ROTA_APROVACOES,
  useDadosComissao,
  useEquipe,
  usePendentesAprovacao,
  useSessao,
  useUsuario,
} from '@portella/app-base';
import type { Periodo } from '@portella/core';
import {
  CORRETORA,
  diasEntre,
  fechamentoDoMes,
  formatarDinheiro,
  hojeISO,
  montarPainel,
} from '@portella/core';
import { CabecalhoPagina, Cartao, Carregando, EstadoVazio } from '@portella/ui';
import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  crescimento,
  linhasPorProdutor,
  maioresEOutros,
  producaoPorMes,
  serieMensal,
} from '../../application/painelInicial';
import { filaRenovacao } from '../../domain/apolice';
import { EstadoErro } from '../componentes/EstadoErro';
import { useApolices } from '../hooks';
import styles from './Painel.module.css';

type Filtro = 'mes' | 'ano' | 'tudo';

const REAIS = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});
const NOME_MES = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' });
const MES_CURTO = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' });
const DIA = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

const dataDoMes = (mes: string) => new Date(`${mes}-15T00:00:00Z`);
const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const nomeMes = (mes: string) => maiuscula(NOME_MES.format(dataDoMes(mes)));
const mesCurto = (mes: string) => MES_CURTO.format(dataDoMes(mes)).replace('.', '');
/** Valores redondos no painel; o valor exato fica na dica. */
const inteiro = (centavos: number) => REAIS.format(Math.round(centavos / 100));
const pct = (v: number | null) =>
  v == null
    ? '—'
    : `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
const tomVariacao = (v: number | null) =>
  v == null ? styles.neutro : v >= 0 ? styles.positivo : styles.negativo;
const mil = (reais: number) =>
  reais >= 1_000_000
    ? `${(reais / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
    : reais >= 1000
      ? `${(reais / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
      : `${Math.round(reais)}`;

function saudacao(agora = new Date()) {
  const h = agora.getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

const iniciais = (nome: string) =>
  nome
    .split(/\s+/)
    .filter((p) => /^\p{L}/u.test(p))
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');

function Dinheiro({ centavos }: { centavos: number }) {
  return <span title={formatarDinheiro(centavos)}>{inteiro(centavos)}</span>;
}

/** Painel inicial (A5 · Vidro + Bento): produção, comissões, produtores e o fechamento do mês. */
export function PaginaPainel() {
  const usuario = useUsuario();
  const { pode } = useSessao();
  const gestao = pode('financeiro:gerenciar');
  const { nomeDe } = useEquipe();
  const { dados, carregando } = useDadosComissao();
  const { data: apolices, isPending: carregandoApolices, isError, refetch } = useApolices();
  const pendentesGestao = usePendentesAprovacao();
  const hoje = hojeISO();
  const mesAtual = hoje.slice(0, 7);
  const anoAtual = hoje.slice(0, 4);
  const [filtro, setFiltro] = useState<Filtro>('ano');

  const periodo: Periodo =
    filtro === 'ano'
      ? { de: `${anoAtual}-01`, ate: `${anoAtual}-12` }
      : filtro === 'mes'
        ? { de: mesAtual, ate: mesAtual }
        : {};
  const painel = useMemo(
    () => montarPainel(dados.propostas, periodo),
    [dados.propostas, periodo.de, periodo.ate], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const meu = gestao ? undefined : usuario.id;
  const porMes = useMemo(() => producaoPorMes(dados.propostas, meu), [dados.propostas, meu]);
  const serie = useMemo(() => serieMensal(porMes, mesAtual), [porMes, mesAtual]);
  const variacoes = useMemo(() => crescimento(porMes, mesAtual), [porMes, mesAtual]);
  const fechamento = useMemo(() => fechamentoDoMes(mesAtual, dados), [mesAtual, dados]);
  const renovar30 = useMemo(
    () => filaRenovacao(apolices ?? [], hoje, 30).filter((a) => diasEntre(hoje, a.fimVigencia!) >= 0).length,
    [apolices, hoje],
  );

  const primeiroNome = usuario.nome.split(' ')[0];
  const cabecalho = (
    <CabecalhoPagina
      titulo={
        <>
          {saudacao()}, <em>{primeiroNome}</em>
        </>
      }
      descricao={maiuscula(DIA.format(new Date(`${hoje}T12:00:00Z`)))}
      acoes={
        <div className={styles.periodo} role="group" aria-label="Período">
          {(
            [
              ['mes', nomeMes(mesAtual)],
              ['ano', anoAtual],
              ['tudo', 'Tudo'],
            ] as const
          ).map(([f, rotulo]) => (
            <button key={f} type="button" aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
              {rotulo}
            </button>
          ))}
        </div>
      }
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
  if (carregando || carregandoApolices) {
    return (
      <>
        {cabecalho}
        <Carregando texto="Carregando o painel…" />
      </>
    );
  }

  const nomeProdutor = (id: string) => (id === CORRETORA ? 'Corretora (sem produtor)' : nomeDe(id));
  const minhaProducao = painel.porProdutor.find((g) => g.chave === usuario.id);
  const producao = gestao ? painel.producao : (minhaProducao?.premio ?? 0);
  const quantidade = painel.quantidade;
  const aguardando = gestao ? pendentesGestao : dados.propostas.filter((p) => p.status === 'pendente').length;
  const meuRepasse = painel.pendentes.find((g) => g.produtorId === usuario.id)?.repasseProjetado ?? 0;
  const pagamentoTotal = gestao
    ? fechamento.reduce((t, l) => t + l.liquido, 0)
    : (fechamento.find((l) => l.produtorId === usuario.id)?.liquido ?? 0);
  const produtoresNoPagamento = fechamento.filter((l) => l.liquido !== 0).length;
  const semProducao = !dados.propostas.some((p) => p.status === 'aprovada');
  const destaquePill =
    filtro === 'mes'
      ? { valor: variacoes.mes, texto: 'sobre o mês anterior' }
      : filtro === 'ano'
        ? { valor: variacoes.acumulado, texto: `sobre ${Number(anoAtual) - 1} (até ${mesCurto(mesAtual)})` }
        : null;
  const textoPeriodo = filtro === 'mes' ? nomeMes(mesAtual) : filtro === 'ano' ? anoAtual : 'todo o período';

  return (
    <>
      {cabecalho}

      {aguardando > 0 && (
        <div className={styles.aviso} role="status">
          <span className={styles.avisoNumero} aria-hidden="true">
            {aguardando}
          </span>
          <span className={styles.avisoTexto}>
            <strong>
              {aguardando} proposta{aguardando === 1 ? '' : 's'}
            </strong>{' '}
            {gestao
              ? 'aguardando aprovação'
              : `sua${aguardando === 1 ? '' : 's'} aguarda${aguardando === 1 ? '' : 'm'} aprovação`}
          </span>
          <Link className={styles.avisoAcao} to={gestao ? ROTA_APROVACOES : '/propostas'}>
            {gestao ? 'Revisar e aprovar' : 'Ver minhas propostas'}
          </Link>
        </div>
      )}

      <div className={styles.bento}>
        <Cartao className={`${styles.cartao} ${styles.heroi}`} aria-labelledby="painel-producao">
          <span id="painel-producao" className={styles.rotulo}>
            {gestao ? 'Produção' : 'Minha produção'} · prêmio líquido · {textoPeriodo}
          </span>
          <strong className={styles.valorHeroi}>
            <Dinheiro centavos={producao} />
          </strong>
          <span className={styles.heroiDetalhe}>
            {destaquePill && (
              <span className={`${styles.pilula} ${tomVariacao(destaquePill.valor)}`}>
                {destaquePill.valor == null ? 'sem base' : pct(destaquePill.valor)}
              </span>
            )}
            {destaquePill && destaquePill.valor != null && <span>{destaquePill.texto} · </span>}
            {quantidade} proposta{quantidade === 1 ? '' : 's'}
          </span>
          <MiniGrafico serie={serie} />
        </Cartao>

        <Cartao className={`${styles.cartao} ${styles.comissoes}`} aria-label="Comissões">
          <dl className={styles.trio}>
            {gestao ? (
              <>
                <div>
                  <dt>Comissão recebida</dt>
                  <dd>
                    <Dinheiro centavos={painel.comissaoRecebida} />
                  </dd>
                  <dd className={styles.nota}>pela data do recebimento</dd>
                </div>
                <div>
                  <dt>Repassada aos produtores</dt>
                  <dd>
                    <Dinheiro centavos={painel.comissaoRepassada} />
                  </dd>
                  <dd className={styles.nota}>
                    {painel.comissaoRecebida
                      ? `${Math.round((painel.comissaoRepassada / painel.comissaoRecebida) * 1000) / 10}% da recebida`.replace(
                          '.',
                          ',',
                        )
                      : 'nada recebido no período'}
                  </dd>
                </div>
                <div>
                  <dt>Saldo a receber</dt>
                  <dd className={styles.ouro}>
                    <Dinheiro centavos={painel.saldoReceber} />
                  </dd>
                  <dd className={styles.nota}>todas as propostas, sem filtro</dd>
                </div>
              </>
            ) : (
              <>
                <div>
                  <dt>Meu repasse a receber</dt>
                  <dd className={styles.ouro}>
                    <Dinheiro centavos={meuRepasse} />
                  </dd>
                  <dd className={styles.nota}>das propostas com saldo, sem filtro</dd>
                </div>
                <div>
                  <dt>Meu pagamento de {nomeMes(mesAtual).toLowerCase()}</dt>
                  <dd>{formatarDinheiro(pagamentoTotal)}</dd>
                  <dd className={styles.nota}>repasse − estornos − vales</dd>
                </div>
                <div>
                  <dt>Aguardando aprovação</dt>
                  <dd>{aguardando}</dd>
                  <dd className={styles.nota}>{aguardando === 1 ? 'proposta sua' : 'propostas suas'}</dd>
                </div>
              </>
            )}
          </dl>
          <dl className={styles.variacoes} aria-label="Crescimento da produção">
            <div>
              <dt>{nomeMes(mesAtual)} × mês anterior</dt>
              <dd className={tomVariacao(variacoes.mes)}>{pct(variacoes.mes)}</dd>
            </div>
            <div>
              <dt>
                {nomeMes(mesAtual)} × {mesCurto(mesAtual)}/{String(Number(anoAtual) - 1).slice(2)}
              </dt>
              <dd className={tomVariacao(variacoes.mesAnoAnterior)}>{pct(variacoes.mesAnoAnterior)}</dd>
            </div>
            <div>
              <dt>
                {anoAtual} × {Number(anoAtual) - 1} (até {mesCurto(mesAtual)})
              </dt>
              <dd className={tomVariacao(variacoes.acumulado)}>{pct(variacoes.acumulado)}</dd>
            </div>
          </dl>
        </Cartao>

        <Cartao
          className={`${styles.cartao} ${styles.largo}`}
          titulo="Crescimento da produção"
          acoes={
            <span className={styles.nota}>
              <span className={styles.soLargo}>últimos 12 meses</span>
              <span className={styles.soCompacto}>últimos 6 meses</span> · produção de cada mês
            </span>
          }
        >
          {semProducao ? (
            <EstadoVazio titulo="Sem produção ainda">
              Lance e aprove propostas, ou importe a planilha.
            </EstadoVazio>
          ) : (
            <>
              <GraficoMeses serie={serie} className={styles.soLargo} />
              <GraficoMeses serie={serie.slice(-6)} compacto className={styles.soCompacto} />
            </>
          )}
        </Cartao>

        {gestao && (
          <Cartao
            className={`${styles.cartao} ${styles.produtores}`}
            titulo="Por produtor"
            acoes={<span className={styles.nota}>saldo e repasse sem filtro de período</span>}
          >
            <TabelaProdutores linhas={linhasPorProdutor(painel)} nome={nomeProdutor} painel={painel} />
          </Cartao>
        )}

        <div className={`${styles.coluna} ${gestao ? '' : styles.colunaLarga}`}>
          <Cartao className={`${styles.cartao} ${styles.pagamento}`} aria-labelledby="painel-pagamento">
            <h2 id="painel-pagamento" className={styles.pagamentoTitulo}>
              {gestao ? 'Pagamento' : 'Meu pagamento'} de {nomeMes(mesAtual).toLowerCase()}
            </h2>
            <strong className={styles.pagamentoValor}>{formatarDinheiro(pagamentoTotal)}</strong>
            <span className={styles.pagamentoDetalhe}>
              {gestao
                ? `líquido a ${produtoresNoPagamento} produtor${produtoresNoPagamento === 1 ? '' : 'es'} · `
                : ''}
              repasse − estornos − vales
            </span>
            <Link to="/relatorios" className={styles.pagamentoAcao}>
              Abrir o fechamento
            </Link>
          </Cartao>
          <Cartao className={styles.cartao} titulo="Novo × renovação">
            <NovoRenovacao painel={painel} />
          </Cartao>
        </div>

        <Cartao
          className={`${styles.cartao} ${styles.terco}`}
          titulo="Por produto"
          acoes={<Link to="/producao">Detalhes</Link>}
        >
          <ListaBarras
            rotulo="Prêmio líquido por produto"
            itens={maioresEOutros(painel.porProduto, 5, () => 'Outros')}
          />
        </Cartao>
        <Cartao
          className={`${styles.cartao} ${styles.terco}`}
          titulo="Por seguradora"
          acoes={<Link to="/producao">Todas</Link>}
        >
          <ListaBarras
            rotulo="Prêmio líquido por seguradora"
            itens={maioresEOutros(painel.porCompanhia, 5, (q) => `Outras ${q}`)}
          />
        </Cartao>
        <Cartao className={`${styles.cartao} ${styles.terco} ${styles.renovacoes}`} titulo="Renovações">
          <strong className={styles.numeroGrande}>{renovar30}</strong>
          <span className={styles.nota}>
            apólice{renovar30 === 1 ? ' vence' : 's vencem'} nos próximos 30 dias
          </span>
          <Link to="/renovacoes" className={styles.botaoSuave}>
            Abrir a fila
          </Link>
        </Cartao>
      </div>
    </>
  );
}

type Serie = Array<{ mes: string; premio: number }>;

function MiniGrafico({ serie }: { serie: Serie }) {
  const max = Math.max(...serie.map((s) => s.premio), 1);
  const pontos = serie.map((s, i) => [(i / (serie.length - 1)) * 660, 104 - (s.premio / max) * 92] as const);
  const linha = pontos.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return (
    <svg className={styles.mini} viewBox="0 0 660 110" aria-hidden="true" preserveAspectRatio="none">
      <path className={styles.miniArea} d={`${linha} L660 110 L0 110 Z`} />
      <path className={styles.miniLinha} d={linha} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Topo redondo do eixo: 80 mil, 1,5 mi… */
/** Passos "redondos" para o topo do eixo; a metade (a outra linha da grade) também fica redonda. */
const PASSOS = [1, 1.2, 1.4, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10];

/** Menor valor redondo acima do máximo: 10,1 mil → 12 mil (antes 20 mil, com metade do gráfico vazia). */
function topoDoEixo(maxReais: number) {
  if (maxReais <= 0) return 1000;
  const casa = 10 ** Math.floor(Math.log10(maxReais));
  return PASSOS.find((p) => p * casa >= maxReais)! * casa;
}

/** Barras por mês; `compacto` (celular) usa menos meses e letras maiores no mesmo desenho. */
function GraficoMeses({
  serie,
  compacto,
  className,
}: {
  serie: Serie;
  compacto?: boolean;
  className?: string;
}) {
  const topo = topoDoEixo(Math.max(...serie.map((s) => s.premio / 100)));
  const largura = compacto ? 600 : 1100;
  const altura = compacto ? 200 : 160;
  const base = compacto ? 240 : 180;
  const inicio = compacto ? 96 : 70;
  const larguraBarra = compacto ? 60 : 54;
  const fonte = compacto ? 22 : 12;
  const passo = (largura - inicio) / serie.length;
  const ultimo = serie[serie.length - 1]!;
  const idOuro = `ouro-${useId().replace(/:/g, '')}`;
  const resumo = `Produção mensal de ${mesCurto(serie[0]!.mes)} a ${mesCurto(ultimo.mes)}: ${serie
    .map((s) => `${mesCurto(s.mes)} ${inteiro(s.premio)}`)
    .join(', ')}.`;
  return (
    <>
      <svg
        className={`${styles.barras} ${className ?? ''}`}
        viewBox={`0 0 ${largura} ${base + fonte * 2}`}
        role="img"
        aria-label={resumo}
        style={compacto ? { fontSize: fonte } : undefined}
      >
        <defs>
          <linearGradient id={idOuro} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className={styles.ouroClaro} />
            <stop offset="1" className={styles.ouroEscuro} />
          </linearGradient>
        </defs>
        {[1, 0.5].map((f) => (
          <g key={f}>
            <line
              className={styles.grade}
              x1={inicio - 6}
              x2={largura}
              y1={base - altura * f}
              y2={base - altura * f}
            />
            <text className={styles.eixo} x="0" y={base - altura * f + fonte / 3}>
              {mil(topo * f)}
            </text>
          </g>
        ))}
        <line className={styles.grade} x1={inicio - 6} x2={largura} y1={base} y2={base} />
        {serie.map((s, i) => {
          const h = s.premio ? Math.max(2, (s.premio / 100 / topo) * altura) : 0;
          const x = inicio + i * passo + (passo - larguraBarra) / 2;
          const atual = i === serie.length - 1;
          return (
            <g key={s.mes}>
              <rect
                className={atual ? undefined : styles.barra}
                fill={atual ? `url(#${idOuro})` : undefined}
                x={x}
                y={base - h}
                width={larguraBarra}
                height={h}
                rx={Math.min(6, h / 2)}
              >
                <title>{`${nomeMes(s.mes)} de ${s.mes.slice(0, 4)}: ${formatarDinheiro(s.premio)}`}</title>
              </rect>
              <text
                className={atual ? styles.eixoAtual : styles.eixo}
                x={x + larguraBarra / 2}
                y={base + fonte * 1.6}
                textAnchor="middle"
              >
                {mesCurto(s.mes)}
              </text>
              {atual && (
                <text
                  className={styles.eixoAtual}
                  x={x + larguraBarra / 2}
                  y={Math.max(fonte, base - h - fonte * 0.7)}
                  textAnchor="middle"
                >
                  {mil(s.premio / 100)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </>
  );
}

function TabelaProdutores({
  linhas,
  nome,
  painel,
}: {
  linhas: ReturnType<typeof linhasPorProdutor>;
  nome: (id: string) => string;
  painel: ReturnType<typeof montarPainel>;
}) {
  if (!linhas.length) return <p className={styles.nota}>Nada no período.</p>;
  const max = Math.max(...linhas.map((l) => l.producao), 1);
  const totalProducao = linhas.reduce((t, l) => t + l.producao, 0);
  const totalRepasse = linhas.reduce((t, l) => t + l.repasse, 0);
  return (
    <>
      <table className={styles.tabela}>
        <thead>
          <tr>
            <th scope="col">Produtor</th>
            <th scope="col">Produção</th>
            <th scope="col">Saldo pendente</th>
            <th scope="col">Repasse previsto</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => {
            const corretora = l.produtorId === CORRETORA;
            return (
              <tr key={l.produtorId || 'corretora'}>
                <th scope="row">
                  <span className={styles.produtor}>
                    <span
                      className={`${styles.avatar} ${corretora ? styles.avatarNeutro : ''}`}
                      aria-hidden="true"
                    >
                      {corretora ? 'PC' : iniciais(nome(l.produtorId))}
                    </span>
                    <span className={styles.produtorNome}>
                      <span className={corretora ? styles.suave : undefined}>{nome(l.produtorId)}</span>
                      <span className={styles.trilho} aria-hidden="true">
                        <i
                          className={corretora ? styles.trilhoNeutro : undefined}
                          style={{ width: `${(l.producao / max) * 100}%` }}
                        />
                      </span>
                    </span>
                  </span>
                </th>
                <td data-rotulo="Produção">
                  <Dinheiro centavos={l.producao} />
                </td>
                <td data-rotulo="Saldo pendente">
                  <Dinheiro centavos={l.saldo} />
                </td>
                <td data-rotulo="Repasse previsto">{corretora ? '—' : <Dinheiro centavos={l.repasse} />}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <td data-rotulo="Produção">
              <Dinheiro centavos={totalProducao} />
            </td>
            <td data-rotulo="Saldo a receber">
              <Dinheiro centavos={painel.saldoReceber} />
            </td>
            <td data-rotulo="Repasse previsto">
              <Dinheiro centavos={totalRepasse} />
            </td>
          </tr>
        </tfoot>
      </table>
      <p className={styles.nota}>
        Produção dividida pelo % de cada produtor na proposta. Uma proposta dividida entra no saldo de cada
        produtor; o total conta cada proposta uma vez.
      </p>
    </>
  );
}

function NovoRenovacao({ painel }: { painel: ReturnType<typeof montarPainel> }) {
  const { novo, renovacao, endosso, nao_informado: semTipo } = painel.porTipo;
  const total = novo.premio + renovacao.premio;
  if (!total && !semTipo.quantidade && !endosso.quantidade)
    return <p className={styles.nota}>Nada no período.</p>;
  const circ = 2 * Math.PI * 40;
  const parteNovo = total ? novo.premio / total : 0;
  const folga = novo.premio && renovacao.premio ? 4 : 0;
  const pctTexto = (v: number) => `${Math.round(v * 1000) / 10}%`.replace('.', ',');
  return (
    <div className={styles.rosca}>
      <svg
        width="108"
        height="108"
        viewBox="0 0 104 104"
        role="img"
        aria-label={`Seguro novo ${pctTexto(parteNovo)}, renovação ${pctTexto(1 - parteNovo)} do prêmio`}
      >
        <circle className={styles.roscaFundo} cx="52" cy="52" r="40" />
        <g transform="rotate(-90 52 52)">
          {novo.premio > 0 && (
            <circle
              className={styles.roscaNovo}
              cx="52"
              cy="52"
              r="40"
              strokeDasharray={`${Math.max(0, parteNovo * circ - folga)} ${circ}`}
            />
          )}
          {renovacao.premio > 0 && (
            <circle
              className={styles.roscaRenovacao}
              cx="52"
              cy="52"
              r="40"
              strokeDasharray={`${Math.max(0, (1 - parteNovo) * circ - folga)} ${circ}`}
              strokeDashoffset={-parteNovo * circ}
            />
          )}
        </g>
        <text className={styles.roscaCentro} x="52" y="57" textAnchor="middle">
          {novo.quantidade + renovacao.quantidade}
        </text>
      </svg>
      <dl className={styles.roscaLegenda}>
        <div>
          <dt>
            <span className={`${styles.marca} ${styles.marcaNovo}`} aria-hidden="true" />
            Seguro novo
          </dt>
          <dd>
            <Dinheiro centavos={novo.premio} /> <small>· {novo.quantidade}</small>
          </dd>
        </div>
        <div>
          <dt>
            <span className={`${styles.marca} ${styles.marcaRenovacao}`} aria-hidden="true" />
            Renovação
          </dt>
          <dd>
            <Dinheiro centavos={renovacao.premio} /> <small>· {renovacao.quantidade}</small>
          </dd>
        </div>
        {endosso.quantidade > 0 && (
          <div>
            <dt className={styles.nota}>Endosso</dt>
            <dd className={styles.nota}>
              <Dinheiro centavos={endosso.premio} /> · {endosso.quantidade}
            </dd>
          </div>
        )}
        {semTipo.quantidade > 0 && (
          <div>
            <dt className={styles.nota}>Sem tipo informado</dt>
            <dd className={styles.nota}>
              <Dinheiro centavos={semTipo.premio} /> · {semTipo.quantidade}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

function ListaBarras({
  rotulo,
  itens,
}: {
  rotulo: string;
  itens: Array<{ chave: string; premio: number; quantidade: number; outros: boolean }>;
}) {
  if (!itens.length) return <p className={styles.nota}>Nada no período.</p>;
  const max = Math.max(...itens.map((i) => i.premio), 1);
  return (
    <ul className={styles.lista} aria-label={rotulo}>
      {itens.map((i) => (
        <li key={i.chave}>
          <span className={styles.listaNome}>
            {i.chave}
            <span className={styles.trilho} aria-hidden="true">
              <i
                className={i.outros ? styles.trilhoNeutro : undefined}
                style={{ width: `${(i.premio / max) * 100}%` }}
              />
            </span>
          </span>
          <strong>
            <Dinheiro centavos={i.premio} />
          </strong>
        </li>
      ))}
    </ul>
  );
}
