import type { Centavos, DataISO, Registro } from '@portella/core';
import { dataValida, diasEntre, ErroValidacao, porcentagem } from '@portella/core';
import type { Ramo } from './catalogo';

export const STATUS_RENOVACAO = ['pendente', 'em_contato', 'renovada', 'nao_renovada'] as const;
export type StatusRenovacao = (typeof STATUS_RENOVACAO)[number];
export const ROTULO_RENOVACAO: Record<StatusRenovacao, string> = {
  pendente: 'Pendente',
  em_contato: 'Em contato',
  renovada: 'Renovada',
  nao_renovada: 'Não renovada',
};

export interface Apolice extends Registro {
  clienteId: string;
  seguradora: string;
  ramo: Ramo;
  numero?: string;
  /** Bem segurado: placa e modelo do veículo, endereço do imóvel etc. */
  item?: string;
  inicioVigencia: DataISO;
  fimVigencia: DataISO;
  premioLiquido?: Centavos;
  premioTotal?: Centavos;
  comissaoPercentual?: number;
  formaPagamento?: string;
  cancelada?: boolean;
  renovacao: StatusRenovacao;
  observacoes?: string;
}

export type Situacao = 'vigente' | 'a_vencer' | 'vencida' | 'cancelada';
export const ROTULO_SITUACAO: Record<Situacao, string> = {
  vigente: 'Vigente',
  a_vencer: 'A vencer',
  vencida: 'Vencida',
  cancelada: 'Cancelada',
};

/** Janela (em dias) em que a apólice passa a ser considerada "a vencer". */
export const JANELA_A_VENCER = 30;

export function situacao(a: Pick<Apolice, 'fimVigencia' | 'cancelada'>, hoje: DataISO): Situacao {
  if (a.cancelada) return 'cancelada';
  const dias = diasEntre(hoje, a.fimVigencia);
  if (dias < 0) return 'vencida';
  return dias <= JANELA_A_VENCER ? 'a_vencer' : 'vigente';
}

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
  if (!a.fimVigencia || !dataValida(a.fimVigencia)) campos.fimVigencia = 'Data inválida.';
  else if (a.inicioVigencia && diasEntre(a.inicioVigencia, a.fimVigencia) <= 0) {
    campos.fimVigencia = 'O fim precisa ser depois do início.';
  }
  if (a.comissaoPercentual != null && (a.comissaoPercentual < 0 || a.comissaoPercentual > 100)) {
    campos.comissaoPercentual = 'Entre 0 e 100%.';
  }
  if (a.premioLiquido != null && a.premioLiquido < 0) campos.premioLiquido = 'Valor inválido.';
  if (Object.keys(campos).length) throw new ErroValidacao('Confira os dados da apólice.', campos);
}

/** Apólices que precisam de ação de renovação: vencem nos próximos `dias` ou venceram há até 30 dias. */
export function filaRenovacao(apolices: Apolice[], hoje: DataISO, dias: number): Apolice[] {
  return apolices
    .filter((a) => !a.cancelada && (a.renovacao === 'pendente' || a.renovacao === 'em_contato'))
    .filter((a) => {
      const d = diasEntre(hoje, a.fimVigencia);
      return d <= dias && d >= -30;
    })
    .sort((a, b) => a.fimVigencia.localeCompare(b.fimVigencia));
}

export interface ResumoCarteira {
  ativas: number;
  aVencer30: number;
  aVencer60: number;
  aVencer90: number;
  premioAtivo: Centavos;
  comissaoAtiva: Centavos;
  porSeguradora: Array<{ seguradora: string; quantidade: number; premio: Centavos }>;
  porRamo: Array<{ ramo: string; quantidade: number }>;
}

export function resumirCarteira(apolices: Apolice[], hoje: DataISO): ResumoCarteira {
  const ativas = apolices.filter((a) => {
    const s = situacao(a, hoje);
    return s === 'vigente' || s === 'a_vencer';
  });
  const pendentes = filaRenovacao(apolices, hoje, 90).filter((a) => diasEntre(hoje, a.fimVigencia) >= 0);
  const dentro = (n: number) => pendentes.filter((a) => diasEntre(hoje, a.fimVigencia) <= n).length;

  const seg = new Map<string, { quantidade: number; premio: Centavos }>();
  const ramo = new Map<string, number>();
  for (const a of ativas) {
    const s = seg.get(a.seguradora) ?? { quantidade: 0, premio: 0 };
    seg.set(a.seguradora, {
      quantidade: s.quantidade + 1,
      premio: s.premio + (a.premioTotal ?? a.premioLiquido ?? 0),
    });
    ramo.set(a.ramo, (ramo.get(a.ramo) ?? 0) + 1);
  }

  return {
    ativas: ativas.length,
    aVencer30: dentro(30),
    aVencer60: dentro(60),
    aVencer90: dentro(90),
    premioAtivo: ativas.reduce((t, a) => t + (a.premioTotal ?? a.premioLiquido ?? 0), 0),
    comissaoAtiva: ativas.reduce((t, a) => t + (comissao(a) ?? 0), 0),
    porSeguradora: [...seg]
      .map(([seguradora, v]) => ({ seguradora, ...v }))
      .sort((a, b) => b.quantidade - a.quantidade),
    porRamo: [...ramo]
      .map(([r, quantidade]) => ({ ramo: r, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade),
  };
}
