import type { Centavos } from './dinheiro';
import { porcentagem } from './dinheiro';
import { dataValida } from './datas';
import { ErroValidacao } from './erros';
import type { DataISO, Registro } from './registro';

/**
 * Proposta transmitida à seguradora (ou administradora de consórcio): é o centro do controle de
 * comissões. A comissão é controlada por saldo: comissão a receber − recebimentos = saldo a receber.
 */
export type TipoNegocio = 'novo' | 'renovacao';
export const ROTULO_TIPO_NEGOCIO: Record<TipoNegocio, string> = {
  novo: 'Seguro novo',
  renovacao: 'Renovação da carteira',
};

export type StatusProposta = 'pendente' | 'aprovada';
export const ROTULO_STATUS_PROPOSTA: Record<StatusProposta, string> = {
  pendente: 'Pendente de aprovação',
  aprovada: 'Aprovada',
};

/** Produtor que participa da venda, com o % da comissão recebida que lhe cabe (repasse). */
export interface Participacao {
  produtorId: string;
  percentual: number;
}

/** Pagamento de comissão feito pela seguradora (baixa), em qualquer quantidade e ordem. */
export interface Recebimento {
  id: string;
  data: DataISO;
  valor: Centavos;
  /** Texto livre, como na planilha: "1ª", "6.6", "9.12", "156". */
  parcela?: string;
  /** Recebimento do vitalício (depois de quitada a comissão principal): não abate o saldo. */
  vitalicio?: boolean;
  /** Repasse já definido por produtor (dados importados); sem ele, vale valor × %. */
  repasses?: Record<string, Centavos>;
}

export interface Proposta extends Registro {
  clienteNome: string;
  clienteId?: string;
  numero?: string;
  data: DataISO;
  /** Seguradora ou administradora. */
  companhia: string;
  produto: string;
  tipoNegocio?: TipoNegocio;
  /** Prêmio líquido (no consórcio, o valor do crédito). */
  premioLiquido?: Centavos;
  /** Comissão trabalhada sobre o prêmio líquido; pode passar de 100% (ex.: saúde 300%). */
  comissaoPercentual?: number;
  /** Comissão total a receber da seguradora. */
  comissaoReceber: Centavos;
  /** % vitalício sobre o prêmio líquido, pago depois da comissão principal. */
  percentualVitalicio?: number;
  produtores: Participacao[];
  recebimentos: Recebimento[];
  status: StatusProposta;
  aprovadaEm?: DataISO;
  aprovadaPor?: string;
  observacoes?: string;
}

export const somaRecebimentos = (rs: Recebimento[]) => rs.reduce((t, r) => t + r.valor, 0);

/** Recebido que abate a comissão principal (sem o vitalício). */
export const recebidoPrincipal = (p: Pick<Proposta, 'recebimentos'>) =>
  somaRecebimentos(p.recebimentos.filter((r) => !r.vitalicio));
export const recebidoTotal = (p: Pick<Proposta, 'recebimentos'>) => somaRecebimentos(p.recebimentos);
export const saldoReceber = (p: Pick<Proposta, 'comissaoReceber' | 'recebimentos'>) =>
  Math.max(0, p.comissaoReceber - recebidoPrincipal(p));

export function comissaoCalculada(
  premio: Centavos | undefined,
  percentual: number | undefined,
): Centavos | undefined {
  return premio != null && percentual != null ? porcentagem(premio, percentual) : undefined;
}

/** Valor do vitalício por ciclo (prêmio líquido × % vitalício). */
export function valorVitalicio(
  p: Pick<Proposta, 'premioLiquido' | 'percentualVitalicio'>,
): Centavos | undefined {
  return comissaoCalculada(p.premioLiquido, p.percentualVitalicio);
}

export const participa = (p: Pick<Proposta, 'produtores'>, produtorId: string) =>
  p.produtores.some((x) => x.produtorId === produtorId);

export function percentualDe(p: Pick<Proposta, 'produtores'>, produtorId: string): number {
  return p.produtores.find((x) => x.produtorId === produtorId)?.percentual ?? 0;
}

/** Quanto do recebimento cabe ao produtor. */
export function repasseDoRecebimento(r: Recebimento, produtorId: string, percentual: number): Centavos {
  return r.repasses?.[produtorId] ?? porcentagem(r.valor, percentual);
}

/**
 * Troca o % do produtor na proposta sem mexer no que já foi recebido: os recebimentos anteriores
 * guardam o repasse calculado com o % antigo, e o novo % vale para os próximos.
 */
export function alterarPercentualProdutor(p: Proposta, produtorId: string, percentual: number): Proposta {
  const antigo = p.produtores.find((x) => x.produtorId === produtorId);
  if (!antigo || antigo.percentual === percentual) return p;
  return {
    ...p,
    produtores: p.produtores.map((x) => (x.produtorId === produtorId ? { ...x, percentual } : x)),
    recebimentos: p.recebimentos.map((r) =>
      r.repasses?.[produtorId] != null
        ? r
        : { ...r, repasses: { ...r.repasses, [produtorId]: porcentagem(r.valor, antigo.percentual) } },
    ),
  };
}

/** "Receberá R$ X": o repasse sobre a comissão total a receber. */
export function repassePrevisto(p: Pick<Proposta, 'comissaoReceber'>, percentual: number): Centavos {
  return porcentagem(p.comissaoReceber, percentual);
}

/** Parte da produção (prêmio) atribuída ao produtor: proporcional ao % dele dentro da divisão. */
export function fatiaProducao(p: Pick<Proposta, 'produtores'>, produtorId: string): number {
  const soma = p.produtores.reduce((t, x) => t + x.percentual, 0);
  if (!soma) return p.produtores.length ? (participa(p, produtorId) ? 1 / p.produtores.length : 0) : 0;
  return percentualDe(p, produtorId) / soma;
}

export function validarProposta(p: Partial<Proposta>): void {
  const campos: Record<string, string> = {};
  if (!p.clienteNome?.trim()) campos.clienteNome = 'Informe o nome do cliente.';
  if (!p.companhia?.trim()) campos.companhia = 'Informe a seguradora.';
  if (!p.produto?.trim()) campos.produto = 'Informe o produto.';
  if (!p.data || !dataValida(p.data)) campos.data = 'Data inválida.';
  if (p.premioLiquido != null && p.premioLiquido < 0) campos.premioLiquido = 'Valor inválido.';
  if (p.comissaoPercentual != null && (p.comissaoPercentual < 0 || p.comissaoPercentual > 1000))
    campos.comissaoPercentual = 'Percentual inválido.';
  if (p.comissaoReceber == null || p.comissaoReceber < 0)
    campos.comissaoReceber = 'Informe a comissão a receber.';
  if (p.percentualVitalicio != null && (p.percentualVitalicio < 0 || p.percentualVitalicio > 100))
    campos.percentualVitalicio = 'Entre 0 e 100%.';
  const produtores = p.produtores ?? [];
  if (produtores.some((x) => x.percentual < 0 || x.percentual > 100))
    campos.produtores = 'O % de cada produtor vai de 0 a 100.';
  else if (produtores.reduce((t, x) => t + x.percentual, 0) > 100)
    campos.produtores = 'A soma dos repasses passa de 100% da comissão.';
  else if (new Set(produtores.map((x) => x.produtorId)).size !== produtores.length)
    campos.produtores = 'Produtor repetido.';
  if ((p.recebimentos ?? []).some((r) => !dataValida(r.data) || r.valor < 0))
    campos.recebimentos = 'Confira data e valor dos recebimentos.';
  if (Object.keys(campos).length) throw new ErroValidacao('Confira os dados da proposta.', campos);
}

/** Estorno (cancelamento): desconta da comissão da corretora e do pagamento do produtor. */
export interface Estorno extends Registro {
  /** O produtor que sofre o desconto é o responsável pelo registro. */
  segurado: string;
  numeroApolice?: string;
  companhia: string;
  produto: string;
  data: DataISO;
  /** Comissão devolvida à seguradora. */
  valor: Centavos;
  /** Quanto desconta do pagamento do produtor. */
  descontoProdutor: Centavos;
  observacoes?: string;
}

/** Adiantamento ao produtor, descontado no pagamento do mês. */
export interface Vale extends Registro {
  data: DataISO;
  valor: Centavos;
  motivo?: string;
}

/** Pagamento mensal feito ao produtor (fechamento do mês). */
export interface PagamentoProdutor extends Registro {
  mes: string;
  data: DataISO;
  valor: Centavos;
  observacoes?: string;
}

export function validarEstorno(e: Partial<Estorno>): void {
  const campos: Record<string, string> = {};
  if (!e.segurado?.trim()) campos.segurado = 'Informe o segurado.';
  if (!e.companhia?.trim()) campos.companhia = 'Informe a seguradora.';
  if (!e.produto?.trim()) campos.produto = 'Informe o produto.';
  if (!e.data || !dataValida(e.data)) campos.data = 'Data inválida.';
  if (e.valor == null || e.valor < 0) campos.valor = 'Valor inválido.';
  if (e.descontoProdutor == null || e.descontoProdutor < 0) campos.descontoProdutor = 'Valor inválido.';
  if (Object.keys(campos).length) throw new ErroValidacao('Confira o estorno.', campos);
}

export function validarVale(v: Partial<Vale>): void {
  const campos: Record<string, string> = {};
  if (!v.data || !dataValida(v.data)) campos.data = 'Data inválida.';
  if (!v.valor || v.valor <= 0) campos.valor = 'Informe o valor.';
  if (Object.keys(campos).length) throw new ErroValidacao('Confira o vale.', campos);
}

export function validarPagamento(p: Partial<PagamentoProdutor>): void {
  const campos: Record<string, string> = {};
  if (!p.mes || !/^\d{4}-(0[1-9]|1[0-2])$/.test(p.mes)) campos.mes = 'Mês inválido.';
  if (!p.data || !dataValida(p.data)) campos.data = 'Data inválida.';
  if (p.valor == null) campos.valor = 'Informe o valor.';
  if (Object.keys(campos).length) throw new ErroValidacao('Confira o pagamento.', campos);
}

/**
 * Marca como vitalícios os recebimentos que chegam depois de quitada a comissão principal
 * (só quando a proposta tem % vitalício). Usado ao salvar a lista editada no formulário.
 */
export function marcarVitalicios(
  p: Pick<Proposta, 'comissaoReceber' | 'percentualVitalicio' | 'recebimentos'>,
): Recebimento[] {
  let acumulado = 0;
  return [...p.recebimentos]
    .sort((a, b) => a.data.localeCompare(b.data))
    .map((r) => {
      const { vitalicio: _anterior, ...semMarca } = r;
      const vitalicio = p.percentualVitalicio != null && acumulado >= p.comissaoReceber;
      if (!vitalicio) acumulado += r.valor;
      return vitalicio ? { ...semMarca, vitalicio: true } : semMarca;
    });
}
