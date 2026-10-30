import type { Centavos, DataISO, Registro, TipoNegocio } from '@portella/core';
import { dataValida, diasEntre, ErroValidacao, porcentagem, somarMeses } from '@portella/core';
import type { Ramo } from './catalogo';

export const STATUS_RENOVACAO = ['pendente', 'em_contato', 'renovada', 'nao_renovada'] as const;
export type StatusRenovacao = (typeof STATUS_RENOVACAO)[number];
export const ROTULO_RENOVACAO: Record<StatusRenovacao, string> = {
  pendente: 'Pendente',
  em_contato: 'Em contato',
  renovada: 'Renovada',
  nao_renovada: 'Não renovada',
};

/** Parcela do prêmio paga pelo cliente à seguradora (acompanhamento do checklist). */
export interface ParcelaApolice {
  valor?: Centavos;
  vencimento?: DataISO;
  /** Quando a baixa foi conferida no site da seguradora (a Porto leva alguns dias para dar baixa). */
  consulta?: DataISO;
  pago?: boolean;
}

/** Ocorrência no acompanhamento da apólice (contato com o cliente, aviso de atraso, endosso…). */
export interface OcorrenciaApolice {
  data: DataISO;
  descricao: string;
  atuacao?: string;
  dataComunicado?: DataISO;
  responsavel?: string;
}

export interface Apolice extends Registro {
  clienteId: string;
  seguradora: string;
  ramo: Ramo;
  numero?: string;
  /** Seguro novo, renovação ou endosso. */
  tipo?: TipoNegocio;
  /** Nº da proposta transmitida à seguradora (liga a apólice à proposta do CRM). */
  numeroProposta?: string;
  /** Bem segurado: modelo do veículo, endereço do imóvel etc. */
  item?: string;
  /** Placa do carro ou da moto. */
  placa?: string;
  inicioVigencia: DataISO;
  /** Vazio em contratos contínuos (vida, saúde, dental…). */
  fimVigencia?: DataISO;
  /** Fim calculado (início + 12 meses) na importação; precisa ser confirmado. */
  vigenciaEstimada?: boolean;
  /** Valores financeiros da proposta: saíram do formulário (29/10/2026), ficam nos dados importados. */
  premioLiquido?: Centavos;
  premioTotal?: Centavos;
  comissaoPercentual?: number;
  /** Texto livre das apólices antigas; a forma de pagamento agora é lançada na proposta. */
  formaPagamento?: string;
  quantidadeParcelas?: number;
  parcelas?: ParcelaApolice[];
  /** Status: ativa (padrão) ou cancelada, com data e motivo. */
  cancelada?: boolean;
  dataCancelamento?: DataISO;
  motivoCancelamento?: string;
  ocorrencias?: OcorrenciaApolice[];
  /** Acompanhamento interno da tela Renovações (não aparece no formulário). */
  renovacao: StatusRenovacao;
  /** Por que o cliente não renovou (preço, outra corretora…), quando `renovacao` é "nao_renovada". */
  motivoNaoRenovacao?: string;
  observacoes?: string;
}

/** Motivos sugeridos ao marcar "Não renovou". */
export const MOTIVOS_NAO_RENOVACAO = [
  'Preço',
  'Fechou com outra corretora',
  'Vendeu ou não tem mais o bem',
  'Sem retorno do cliente',
  'Outro',
] as const;

/** Motivos sugeridos ao cancelar a apólice. */
export const MOTIVOS_CANCELAMENTO = [
  'Falta de pagamento',
  'Sinistro (perda total)',
  'Venda do bem',
  'Pedido do cliente',
  'Outro',
] as const;

/** Placa no padrão antigo (ABC1234) ou Mercosul (ABC1D23), sem hífen e em maiúsculas. */
export const normalizarPlaca = (placa: string) => placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
export const placaValida = (placa: string) => /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(normalizarPlaca(placa));
/** Placa para exibir: ABC-1234 no padrão antigo, ABC1D23 no Mercosul. */
export function formatarPlaca(placa?: string): string {
  if (!placa) return '';
  const p = normalizarPlaca(placa);
  return /^[A-Z]{3}[0-9]{4}$/.test(p) ? `${p.slice(0, 3)}-${p.slice(3)}` : p;
}

/**
 * Divide o prêmio total em parcelas mensais a partir do 1º vencimento. Os centavos que sobram da
 * divisão vão para a 1ª parcela, para a soma bater exatamente com o prêmio (sem diferença de centavos).
 */
export function gerarParcelas(total: Centavos | undefined, quantidade: number, primeiroVencimento?: DataISO) {
  const n = Math.max(0, Math.floor(quantidade));
  const base = total == null ? undefined : Math.floor(total / n);
  const sobra = total == null || base == null ? 0 : total - base * n;
  return Array.from(
    { length: n },
    (_, i): ParcelaApolice => ({
      valor: base == null ? undefined : base + (i === 0 ? sobra : 0),
      vencimento: primeiroVencimento ? somarMeses(primeiroVencimento, i) : undefined,
    }),
  );
}

export type Situacao = 'a_iniciar' | 'vigente' | 'a_vencer' | 'vencida' | 'renovada' | 'cancelada';
export const ROTULO_SITUACAO: Record<Situacao, string> = {
  a_iniciar: 'A iniciar',
  vigente: 'Vigente',
  a_vencer: 'A vencer',
  vencida: 'Vencida',
  renovada: 'Renovada',
  cancelada: 'Cancelada',
};

/** Janela (em dias) em que a apólice passa a ser considerada "a vencer". */
export const JANELA_A_VENCER = 30;

/**
 * Situação pela vigência. A apólice nova de uma renovação fica "a iniciar" até a data de início,
 * para não contar junto com a anterior; a anterior, depois do fim, aparece como "renovada".
 */
export function situacao(
  a: Pick<Apolice, 'fimVigencia' | 'cancelada'> & Partial<Pick<Apolice, 'inicioVigencia' | 'renovacao'>>,
  hoje: DataISO,
): Situacao {
  if (a.cancelada) return 'cancelada';
  if (a.inicioVigencia && diasEntre(hoje, a.inicioVigencia) > 0) return 'a_iniciar';
  if (!a.fimVigencia) return 'vigente';
  const dias = diasEntre(hoje, a.fimVigencia);
  if (dias < 0) return a.renovacao === 'renovada' ? 'renovada' : 'vencida';
  return dias <= JANELA_A_VENCER ? 'a_vencer' : 'vigente';
}

/** Situações da lista padrão de Apólices: as que estão em acompanhamento, inclusive as canceladas. */
export const EM_ACOMPANHAMENTO: ReadonlySet<Situacao> = new Set<Situacao>([
  'a_iniciar',
  'vigente',
  'a_vencer',
  'cancelada',
]);

/** Vigentes e a vencer: as apólices que estão valendo hoje. */
export const estaValendo = (a: Apolice, hoje: DataISO) => {
  const s = situacao(a, hoje);
  return s === 'vigente' || s === 'a_vencer';
};

/** Comissão da corretora sobre o prêmio líquido. */
export function comissao(a: Pick<Apolice, 'premioLiquido' | 'comissaoPercentual'>): Centavos | null {
  if (a.premioLiquido == null || a.comissaoPercentual == null) return null;
  return porcentagem(a.premioLiquido, a.comissaoPercentual);
}

export function validarApolice(a: Partial<Apolice>): void {
  const campos: Record<string, string> = {};
  if (!a.clienteId) campos.clienteId = 'Escolha o cliente.';
  if (!a.seguradora?.trim()) campos.seguradora = 'Informe a seguradora.';
  if (!a.ramo) campos.ramo = 'Escolha o ramo.';
  if (!a.inicioVigencia || !dataValida(a.inicioVigencia)) campos.inicioVigencia = 'Data inválida.';
  if (a.fimVigencia && !dataValida(a.fimVigencia)) campos.fimVigencia = 'Data inválida.';
  else if (a.fimVigencia && a.inicioVigencia && diasEntre(a.inicioVigencia, a.fimVigencia) <= 0) {
    campos.fimVigencia = 'O fim precisa ser depois do início.';
  }
  if (a.comissaoPercentual != null && (a.comissaoPercentual < 0 || a.comissaoPercentual > 100)) {
    campos.comissaoPercentual = 'Entre 0 e 100%.';
  }
  if (a.premioLiquido != null && a.premioLiquido < 0) campos.premioLiquido = 'Valor inválido.';
  if (a.premioTotal != null && a.premioTotal < 0) campos.premioTotal = 'Valor inválido.';
  if (a.placa && !placaValida(a.placa)) campos.placa = 'Placa inválida (ex.: ABC1D23).';
  if (a.quantidadeParcelas != null && (a.quantidadeParcelas < 1 || a.quantidadeParcelas > 24)) {
    campos.quantidadeParcelas = 'Entre 1 e 24.';
  }
  const somaParcelas = (a.parcelas ?? []).reduce((t, p) => t + (p.valor ?? 0), 0);
  if (a.premioTotal != null && somaParcelas > a.premioTotal) {
    campos.parcelas = 'A soma das parcelas passa do prêmio total.';
  }
  if (a.cancelada) {
    if (!a.dataCancelamento || !dataValida(a.dataCancelamento))
      campos.dataCancelamento = 'Informe a data do cancelamento.';
    if (!a.motivoCancelamento?.trim()) campos.motivoCancelamento = 'Informe o motivo.';
  }
  if (Object.keys(campos).length) throw new ErroValidacao('Confira os dados da apólice.', campos);
}

/** Apólices que precisam de ação de renovação: vencem nos próximos `dias` ou venceram há até 30 dias. */
export function filaRenovacao(apolices: Apolice[], hoje: DataISO, dias: number): Apolice[] {
  return apolices
    .filter((a) => !a.cancelada && (a.renovacao === 'pendente' || a.renovacao === 'em_contato'))
    .filter((a): a is Apolice & { fimVigencia: DataISO } => {
      if (!a.fimVigencia) return false;
      const d = diasEntre(hoje, a.fimVigencia);
      return d <= dias && d >= -30;
    })
    .sort((a, b) => a.fimVigencia.localeCompare(b.fimVigencia));
}

export interface ResumoCarteira {
  ativas: number;
  /** Apólices novas (em geral renovações) que ainda não começaram. */
  aIniciar: number;
  aVencer30: number;
  aVencer60: number;
  aVencer90: number;
  premioAtivo: Centavos;
  comissaoAtiva: Centavos;
  porSeguradora: Array<{ seguradora: string; quantidade: number; premio: Centavos }>;
  porRamo: Array<{ ramo: string; quantidade: number }>;
}

export function resumirCarteira(apolices: Apolice[], hoje: DataISO): ResumoCarteira {
  const ativas = apolices.filter((a) => estaValendo(a, hoje));
  const pendentes = filaRenovacao(apolices, hoje, 90).filter((a) => diasEntre(hoje, a.fimVigencia!) >= 0);
  const dentro = (n: number) => pendentes.filter((a) => diasEntre(hoje, a.fimVigencia!) <= n).length;

  const seg = new Map<string, { quantidade: number; premio: Centavos }>();
  const ramo = new Map<string, number>();
  for (const a of ativas) {
    const s = seg.get(a.seguradora) ?? { quantidade: 0, premio: 0 };
    seg.set(a.seguradora, {
      quantidade: s.quantidade + 1,
      premio: s.premio + (a.premioLiquido ?? 0),
    });
    ramo.set(a.ramo, (ramo.get(a.ramo) ?? 0) + 1);
  }

  return {
    ativas: ativas.length,
    aIniciar: apolices.filter((a) => situacao(a, hoje) === 'a_iniciar').length,
    aVencer30: dentro(30),
    aVencer60: dentro(60),
    aVencer90: dentro(90),
    // Prêmio líquido, a mesma base da comissão (o prêmio total inclui IOF e juros).
    premioAtivo: ativas.reduce((t, a) => t + (a.premioLiquido ?? 0), 0),
    comissaoAtiva: ativas.reduce((t, a) => t + (comissao(a) ?? 0), 0),
    porSeguradora: [...seg]
      .map(([seguradora, v]) => ({ seguradora, ...v }))
      .sort((a, b) => b.premio - a.premio || b.quantidade - a.quantidade),
    porRamo: [...ramo]
      .map(([r, quantidade]) => ({ ramo: r, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade),
  };
}
