import { normalizar } from './cliente';
import type { Centavos } from './dinheiro';
import { porcentagem } from './dinheiro';
import type { Estorno, PagamentoProdutor, Proposta, Recebimento, TipoNegocio, Vale } from './proposta';
import {
  fatiaProducao,
  participa,
  percentualDe,
  recebidoPrincipal,
  repasseDoRecebimento,
  saldoReceber,
} from './proposta';

/** Produtor "vazio": vendas da própria corretora, sem repasse. */
export const CORRETORA = '';

export interface DadosComissao {
  propostas: Proposta[];
  estornos: Estorno[];
  vales: Vale[];
  pagamentos: PagamentoProdutor[];
}

const doMes = (data: string, mes: string) => data.startsWith(mes);
const aprovadas = (ps: Proposta[]) => ps.filter((p) => p.status === 'aprovada');

// ---------------------------------------------------------------- Pagamento mensal do produtor

export interface ItemPagamento {
  proposta: Proposta;
  recebimento: Recebimento;
  percentual: number;
  repasse: Centavos;
}

export interface PagamentoMensal {
  produtorId: string;
  mes: string;
  itens: ItemPagamento[];
  estornos: Estorno[];
  vales: Vale[];
  totalRecebido: Centavos;
  totalRepasse: Centavos;
  totalEstornos: Centavos;
  totalVales: Centavos;
  /** Repasse − estornos − vales. */
  liquido: Centavos;
  pago: Centavos;
  saldo: Centavos;
}

/** Comissões recebidas no mês (pela data de cada recebimento) × % do produtor, menos estornos e vales. */
export function pagamentoMensal(produtorId: string, mes: string, d: DadosComissao): PagamentoMensal {
  const itens: ItemPagamento[] = [];
  for (const proposta of aprovadas(d.propostas)) {
    const percentual = percentualDe(proposta, produtorId);
    if (!proposta.produtores.some((x) => x.produtorId === produtorId)) continue;
    for (const recebimento of proposta.recebimentos) {
      if (!doMes(recebimento.data, mes)) continue;
      itens.push({
        proposta,
        recebimento,
        percentual,
        repasse: repasseDoRecebimento(recebimento, produtorId, percentual),
      });
    }
  }
  itens.sort(
    (a, b) =>
      a.recebimento.data.localeCompare(b.recebimento.data) ||
      a.proposta.clienteNome.localeCompare(b.proposta.clienteNome),
  );
  const estornos = d.estornos.filter((e) => e.responsavelId === produtorId && doMes(e.data, mes));
  const vales = d.vales.filter((v) => v.responsavelId === produtorId && doMes(v.data, mes));
  const totalRepasse = itens.reduce((t, i) => t + i.repasse, 0);
  const totalEstornos = estornos.reduce((t, e) => t + e.descontoProdutor, 0);
  const totalVales = vales.reduce((t, v) => t + v.valor, 0);
  const liquido = totalRepasse - totalEstornos - totalVales;
  const pago = d.pagamentos
    .filter((p) => p.responsavelId === produtorId && p.mes === mes)
    .reduce((t, p) => t + p.valor, 0);
  return {
    produtorId,
    mes,
    itens,
    estornos,
    vales,
    totalRecebido: itens.reduce((t, i) => t + i.recebimento.valor, 0),
    totalRepasse,
    totalEstornos,
    totalVales,
    liquido,
    pago,
    saldo: liquido - pago,
  };
}

/** Fechamento do mês: uma linha por produtor que teve repasse, estorno, vale ou pagamento. */
export function fechamentoDoMes(mes: string, d: DadosComissao): PagamentoMensal[] {
  const ids = new Set<string>();
  for (const p of aprovadas(d.propostas)) {
    if (p.recebimentos.some((r) => doMes(r.data, mes))) for (const x of p.produtores) ids.add(x.produtorId);
  }
  for (const e of d.estornos) if (doMes(e.data, mes)) ids.add(e.responsavelId);
  for (const v of d.vales) if (doMes(v.data, mes)) ids.add(v.responsavelId);
  for (const p of d.pagamentos) if (p.mes === mes) ids.add(p.responsavelId);
  return [...ids].map((id) => pagamentoMensal(id, mes, d));
}

// ---------------------------------------------------------------- Comissões pendentes

export interface PendenteProdutor {
  produtorId: string;
  itens: Array<{ proposta: Proposta; saldo: Centavos; percentual: number; repasseProjetado: Centavos }>;
  saldo: Centavos;
  repasseProjetado: Centavos;
}

/** O que ainda falta a seguradora pagar, por produtor (vendas sem produtor ficam em CORRETORA). */
export function pendentesPorProdutor(propostas: Proposta[]): PendenteProdutor[] {
  const grupos = new Map<string, PendenteProdutor>();
  const adicionar = (produtorId: string, proposta: Proposta, saldo: Centavos, percentual: number) => {
    const g = grupos.get(produtorId) ?? { produtorId, itens: [], saldo: 0, repasseProjetado: 0 };
    const repasseProjetado = porcentagem(saldo, percentual);
    g.itens.push({ proposta, saldo, percentual, repasseProjetado });
    g.saldo += saldo;
    g.repasseProjetado += repasseProjetado;
    grupos.set(produtorId, g);
  };
  for (const p of aprovadas(propostas)) {
    const saldo = saldoReceber(p);
    if (saldo <= 0) continue;
    if (!p.produtores.length) adicionar(CORRETORA, p, saldo, 0);
    for (const x of p.produtores) adicionar(x.produtorId, p, saldo, x.percentual);
  }
  for (const g of grupos.values()) g.itens.sort((a, b) => a.proposta.data.localeCompare(b.proposta.data));
  return [...grupos.values()].sort((a, b) => b.saldo - a.saldo);
}

export interface PendenteCliente {
  /** clienteId, ou o nome normalizado quando a proposta não está ligada a um cadastro. */
  chave: string;
  clienteId?: string;
  clienteNome: string;
  itens: Array<{
    proposta: Proposta;
    comissao: Centavos;
    recebido: Centavos;
    saldo: Centavos;
    repasses: Array<{ produtorId: string; percentual: number; repasseProjetado: Centavos }>;
  }>;
  comissao: Centavos;
  recebido: Centavos;
  saldo: Centavos;
  repasseProjetado: Centavos;
}

/**
 * O que ainda falta a seguradora pagar, por cliente (para cruzar com o controle da administradora e
 * achar atrasos). Com `produtorId`, só as vendas dele e só o repasse dele.
 * `nomeCliente` devolve o nome do cadastro, para mostrar o nome completo.
 */
export function pendentesPorCliente(
  propostas: Proposta[],
  opcoes: { produtorId?: string; nomeCliente?: (clienteId: string) => string | undefined } = {},
): PendenteCliente[] {
  const grupos = new Map<string, PendenteCliente>();
  for (const p of aprovadas(propostas)) {
    const saldo = saldoReceber(p);
    if (saldo <= 0) continue;
    if (opcoes.produtorId && !participa(p, opcoes.produtorId)) continue;
    const nome = (p.clienteId && opcoes.nomeCliente?.(p.clienteId)) || p.clienteNome;
    const chave = p.clienteId ?? `nome:${normalizar(nome)}`;
    const g = grupos.get(chave) ?? {
      chave,
      clienteId: p.clienteId,
      clienteNome: nome,
      itens: [],
      comissao: 0,
      recebido: 0,
      saldo: 0,
      repasseProjetado: 0,
    };
    const repasses = p.produtores
      .filter((x) => !opcoes.produtorId || x.produtorId === opcoes.produtorId)
      .map((x) => ({
        produtorId: x.produtorId,
        percentual: x.percentual,
        repasseProjetado: porcentagem(saldo, x.percentual),
      }));
    const recebido = recebidoPrincipal(p);
    g.itens.push({ proposta: p, comissao: p.comissaoReceber, recebido, saldo, repasses });
    g.comissao += p.comissaoReceber;
    g.recebido += recebido;
    g.saldo += saldo;
    g.repasseProjetado += repasses.reduce((t, r) => t + r.repasseProjetado, 0);
    grupos.set(chave, g);
  }
  for (const g of grupos.values()) g.itens.sort((a, b) => a.proposta.data.localeCompare(b.proposta.data));
  return [...grupos.values()].sort(
    (a, b) => b.saldo - a.saldo || a.clienteNome.localeCompare(b.clienteNome, 'pt-BR'),
  );
}

// ---------------------------------------------------------------- Painel

export interface Periodo {
  /** AAAA-MM inclusive; vazio = sem limite. */
  de?: string;
  ate?: string;
}

const noPeriodo = (data: string, { de, ate }: Periodo) =>
  (!de || data.slice(0, 7) >= de) && (!ate || data.slice(0, 7) <= ate);

export interface Agrupado {
  chave: string;
  premio: Centavos;
  quantidade: number;
}

export interface LinhaCrescimento {
  periodo: string;
  premio: Centavos;
  /** Variação sobre o período anterior (mês ou ano), em fração (0,1 = +10%); null sem base. */
  variacaoAnterior: number | null;
  /** Só no mensal: variação sobre o mesmo mês do ano anterior. */
  variacaoAnoAnterior?: number | null;
}

export interface Painel {
  producao: Centavos;
  quantidade: number;
  porTipo: Record<TipoNegocio | 'nao_informado', { premio: Centavos; quantidade: number }>;
  porProdutor: Agrupado[];
  porProduto: Agrupado[];
  porCompanhia: Agrupado[];
  comissaoRecebida: Centavos;
  comissaoRepassada: Centavos;
  /** Saldo a receber de todas as propostas aprovadas (não depende do período). */
  saldoReceber: Centavos;
  pendentes: PendenteProdutor[];
  crescimentoMensal: LinhaCrescimento[];
  crescimentoAnual: LinhaCrescimento[];
}

function agrupar(mapa: Map<string, Agrupado>, chave: string, premio: Centavos, quantidade = 1) {
  const g = mapa.get(chave) ?? { chave, premio: 0, quantidade: 0 };
  g.premio += premio;
  g.quantidade += quantidade;
  mapa.set(chave, g);
}

const variacao = (atual: number, base: number | undefined) => (base ? (atual - base) / base : null);

/** Indicadores do painel, só com propostas aprovadas. Produção = prêmio líquido pela data da proposta. */
export function montarPainel(todas: Proposta[], periodo: Periodo = {}): Painel {
  const props = aprovadas(todas);
  const doPeriodo = props.filter((p) => noPeriodo(p.data, periodo));
  const porTipo: Painel['porTipo'] = {
    novo: { premio: 0, quantidade: 0 },
    renovacao: { premio: 0, quantidade: 0 },
    endosso: { premio: 0, quantidade: 0 },
    nao_informado: { premio: 0, quantidade: 0 },
  };
  const produtores = new Map<string, Agrupado>();
  const produtos = new Map<string, Agrupado>();
  const companhias = new Map<string, Agrupado>();
  let producao = 0;

  for (const p of doPeriodo) {
    const premio = p.premioLiquido ?? 0;
    producao += premio;
    const tipo = porTipo[p.tipoNegocio ?? 'nao_informado'];
    tipo.premio += premio;
    tipo.quantidade += 1;
    agrupar(produtos, p.produto, premio);
    agrupar(companhias, p.companhia, premio);
    if (!p.produtores.length) agrupar(produtores, CORRETORA, premio);
    for (const x of p.produtores)
      agrupar(produtores, x.produtorId, Math.round(premio * fatiaProducao(p, x.produtorId)));
  }

  let comissaoRecebida = 0;
  let comissaoRepassada = 0;
  for (const p of props) {
    for (const r of p.recebimentos) {
      if (!noPeriodo(r.data, periodo)) continue;
      comissaoRecebida += r.valor;
      for (const x of p.produtores) comissaoRepassada += repasseDoRecebimento(r, x.produtorId, x.percentual);
    }
  }

  const porMes = new Map<string, Centavos>();
  const porAno = new Map<string, Centavos>();
  for (const p of props) {
    porMes.set(p.data.slice(0, 7), (porMes.get(p.data.slice(0, 7)) ?? 0) + (p.premioLiquido ?? 0));
    porAno.set(p.data.slice(0, 4), (porAno.get(p.data.slice(0, 4)) ?? 0) + (p.premioLiquido ?? 0));
  }
  const meses = [...porMes.keys()].sort();
  // A base é sempre o mês (e o ano) do calendário imediatamente anterior: sem produção nele, não há
  // variação ("—"), em vez de comparar com o último mês que teve produção.
  const crescimentoMensal = meses.map((mes) => {
    const [a, m] = mes.split('-').map(Number) as [number, number];
    const anterior = m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`;
    const mesmoMesAnoAnterior = `${Number(mes.slice(0, 4)) - 1}${mes.slice(4)}`;
    const premio = porMes.get(mes)!;
    return {
      periodo: mes,
      premio,
      variacaoAnterior: variacao(premio, porMes.get(anterior)),
      variacaoAnoAnterior: variacao(premio, porMes.get(mesmoMesAnoAnterior)),
    };
  });
  const anos = [...porAno.keys()].sort();
  const crescimentoAnual = anos.map((ano) => ({
    periodo: ano,
    premio: porAno.get(ano)!,
    variacaoAnterior: variacao(porAno.get(ano)!, porAno.get(String(Number(ano) - 1))),
  }));

  const ordenar = (m: Map<string, Agrupado>) => [...m.values()].sort((a, b) => b.premio - a.premio);
  return {
    producao,
    quantidade: doPeriodo.length,
    porTipo,
    porProdutor: ordenar(produtores),
    porProduto: ordenar(produtos),
    porCompanhia: ordenar(companhias),
    comissaoRecebida,
    comissaoRepassada,
    saldoReceber: props.reduce((t, p) => t + saldoReceber(p), 0),
    pendentes: pendentesPorProdutor(props),
    crescimentoMensal,
    crescimentoAnual,
  };
}
