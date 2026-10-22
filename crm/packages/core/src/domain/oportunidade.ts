import { telefoneValido } from './documento';
import type { Centavos } from './dinheiro';
import { ErroValidacao } from './erros';
import type { Registro } from './registro';

/** Funil de vendas (cotações no CRM de seguros, propostas no CRM de consórcio). */
export const ETAPAS = ['novo', 'contato', 'proposta', 'ganho', 'perdido'] as const;
export type Etapa = (typeof ETAPAS)[number];

export const ROTULO_ETAPA: Record<Etapa, string> = {
  novo: 'Novo',
  contato: 'Em contato',
  proposta: 'Proposta enviada',
  ganho: 'Fechado',
  perdido: 'Perdido',
};

export interface Oportunidade extends Registro {
  nomeContato: string;
  telefone?: string;
  email?: string;
  clienteId?: string;
  produto: string;
  etapa: Etapa;
  valorEstimado?: Centavos;
  motivoPerda?: string;
  observacoes?: string;
}

export function validarOportunidade(o: Pick<Oportunidade, 'nomeContato' | 'produto' | 'etapa' | 'telefone'>): void {
  const campos: Record<string, string> = {};
  if (o.nomeContato.trim().length < 2) campos.nomeContato = 'Informe o nome do contato.';
  if (!o.produto.trim()) campos.produto = 'Informe o produto.';
  if (!ETAPAS.includes(o.etapa)) campos.etapa = 'Etapa inválida.';
  if (o.telefone && !telefoneValido(o.telefone)) campos.telefone = 'Telefone inválido.';
  if (Object.keys(campos).length) throw new ErroValidacao('Confira os dados da oportunidade.', campos);
}

export function etapaEncerrada(etapa: Etapa): boolean {
  return etapa === 'ganho' || etapa === 'perdido';
}

export interface ResumoFunil {
  porEtapa: Record<Etapa, number>;
  emAberto: number;
  taxaConversao: number | null;
}

export function resumirFunil(oportunidades: Oportunidade[]): ResumoFunil {
  const porEtapa = Object.fromEntries(ETAPAS.map((e) => [e, 0])) as Record<Etapa, number>;
  for (const o of oportunidades) porEtapa[o.etapa] += 1;
  const encerradas = porEtapa.ganho + porEtapa.perdido;
  return {
    porEtapa,
    emAberto: oportunidades.length - encerradas,
    taxaConversao: encerradas ? porEtapa.ganho / encerradas : null,
  };
}
