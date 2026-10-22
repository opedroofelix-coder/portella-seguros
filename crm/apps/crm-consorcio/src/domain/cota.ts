import type { Centavos, DataISO, Registro } from '@portella/core';
import { dataValida, ErroValidacao } from '@portella/core';

export const TIPOS_BEM = [
  { id: 'imovel', nome: 'Imóvel' },
  { id: 'automovel', nome: 'Automóvel' },
  { id: 'moto', nome: 'Moto' },
  { id: 'pesados', nome: 'Pesados' },
  { id: 'servicos', nome: 'Serviços' },
  { id: 'outros', nome: 'Outros' },
] as const;
export type TipoBem = (typeof TIPOS_BEM)[number]['id'];
const nomesTipo = new Map<string, string>(TIPOS_BEM.map((t) => [t.id, t.nome]));
export const nomeTipoBem = (id: string) => nomesTipo.get(id) ?? id;

export const STATUS_COTA = ['ativa', 'contemplada', 'quitada', 'cancelada'] as const;
export type StatusCota = (typeof STATUS_COTA)[number];
export const ROTULO_STATUS_COTA: Record<StatusCota, string> = {
  ativa: 'Ativa',
  contemplada: 'Contemplada',
  quitada: 'Quitada',
  cancelada: 'Cancelada',
};

export type FormaContemplacao = 'sorteio' | 'lance';

export interface Cota extends Registro {
  clienteId: string;
  administradora: string;
  numeroProposta?: string;
  /** Grupo, cota e prazo podem ficar pendentes (vendas importadas da planilha de comissões). */
  grupo?: string;
  cota?: string;
  tipoBem: TipoBem;
  valorCredito: Centavos;
  prazoMeses?: number;
  valorParcela?: Centavos;
  dataAdesao: DataISO;
  parcelasPagas?: number;
  status: StatusCota;
  contemplacao?: { data: DataISO; forma: FormaContemplacao };
  observacoes?: string;
}

export function validarCota(c: Partial<Cota>): void {
  const campos: Record<string, string> = {};
  if (!c.clienteId) campos.clienteId = 'Escolha o cliente.';
  if (!c.administradora?.trim()) campos.administradora = 'Informe a administradora.';
  if (!c.valorCredito || c.valorCredito <= 0) campos.valorCredito = 'Informe o crédito.';
  if (c.prazoMeses != null && (c.prazoMeses <= 0 || !Number.isInteger(c.prazoMeses))) {
    campos.prazoMeses = 'Prazo inválido.';
  }
  if (!c.dataAdesao || !dataValida(c.dataAdesao)) campos.dataAdesao = 'Data inválida.';
  if (c.parcelasPagas != null && (c.parcelasPagas < 0 || (c.prazoMeses && c.parcelasPagas > c.prazoMeses))) {
    campos.parcelasPagas = 'Não pode passar do prazo.';
  }
  if (c.status === 'contemplada' && !c.contemplacao)
    campos.contemplacao = 'Informe a data e a forma da contemplação.';
  if (Object.keys(campos).length) throw new ErroValidacao('Confira os dados da cota.', campos);
}

/** Campos que faltam para completar o cadastro da cota. */
export function camposPendentes(c: Pick<Cota, 'grupo' | 'cota' | 'prazoMeses'>): string[] {
  return [!c.grupo?.trim() && 'grupo', !c.cota?.trim() && 'cota', !c.prazoMeses && 'prazo'].filter(Boolean) as string[];
}

/** "1020 / 33", ou o nº da proposta enquanto grupo e cota estão pendentes. */
export function identificacaoCota(c: Pick<Cota, 'grupo' | 'cota' | 'numeroProposta'>): string {
  if (c.grupo || c.cota) return `${c.grupo ?? '?'} / ${c.cota ?? '?'}`;
  return c.numeroProposta ? `Proposta ${c.numeroProposta}` : 'A completar';
}

export function parcelasRestantes(c: Pick<Cota, 'prazoMeses' | 'parcelasPagas'>): number | null {
  return c.prazoMeses ? Math.max(0, c.prazoMeses - (c.parcelasPagas ?? 0)) : null;
}

/** Percentual do prazo já pago (0 a 1). */
export function progresso(c: Pick<Cota, 'prazoMeses' | 'parcelasPagas'>): number {
  return c.prazoMeses ? Math.min(1, (c.parcelasPagas ?? 0) / c.prazoMeses) : 0;
}

export interface ResumoCotas {
  ativas: number;
  contempladas: number;
  pendentes: number;
  creditoAtivo: Centavos;
  creditoContemplado: Centavos;
  porAdministradora: Array<{ administradora: string; quantidade: number; credito: Centavos }>;
  porTipo: Array<{ tipo: string; quantidade: number }>;
}

/** "Em carteira" = ativas + contempladas (cotas que ainda geram relacionamento). */
export function resumirCotas(cotas: Cota[]): ResumoCotas {
  const emCarteira = cotas.filter((c) => c.status === 'ativa' || c.status === 'contemplada');
  const adm = new Map<string, { quantidade: number; credito: Centavos }>();
  const tipo = new Map<string, number>();
  for (const c of emCarteira) {
    const a = adm.get(c.administradora) ?? { quantidade: 0, credito: 0 };
    adm.set(c.administradora, { quantidade: a.quantidade + 1, credito: a.credito + c.valorCredito });
    tipo.set(c.tipoBem, (tipo.get(c.tipoBem) ?? 0) + 1);
  }
  const soma = (lista: Cota[]) => lista.reduce((t, c) => t + c.valorCredito, 0);
  const ativas = cotas.filter((c) => c.status === 'ativa');
  const contempladas = cotas.filter((c) => c.status === 'contemplada');
  return {
    ativas: ativas.length,
    contempladas: contempladas.length,
    pendentes: emCarteira.filter((c) => camposPendentes(c).length > 0).length,
    creditoAtivo: soma(ativas),
    creditoContemplado: soma(contempladas),
    porAdministradora: [...adm]
      .map(([administradora, v]) => ({ administradora, ...v }))
      .sort((a, b) => b.quantidade - a.quantidade),
    porTipo: [...tipo]
      .map(([t, quantidade]) => ({ tipo: t, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade),
  };
}
