import { telefoneValido } from './documento';
import type { Centavos } from './dinheiro';
import { ErroValidacao } from './erros';
import type { DataISO, Registro } from './registro';

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

/** Origens sugeridas do lead (lista editável em Configurações). */
export const ORIGENS_LEAD_PADRAO = [
  'Indicação',
  'Instagram',
  'Google',
  'Facebook',
  'Site',
  'WhatsApp',
  'Cliente da carteira',
  'Outro',
];
/** Origem que pede o nome de quem indicou. */
export const ORIGEM_INDICACAO = 'Indicação';

/** Movimentação registrada no histórico da cotação (para o acompanhamento da administração). */
export interface MovimentacaoOportunidade {
  /** Data e hora (ISO). */
  em: DataISO;
  usuarioId: string;
  acao: 'criada' | 'etapa' | 'responsavel';
  de?: string;
  para?: string;
}

export interface Oportunidade extends Registro {
  nomeContato: string;
  telefone?: string;
  email?: string;
  /** Cadastro do cliente, quando o lead já é (ou virou) cliente. */
  clienteId?: string;
  produto: string;
  etapa: Etapa;
  valorEstimado?: Centavos;
  motivoPerda?: string;
  /** Como o lead chegou (Indicação, Instagram, Google…). */
  origem?: string;
  /** Quem indicou: texto livre, porque quem indica pode ainda não ser cliente. */
  indicadoPor?: string;
  historico?: MovimentacaoOportunidade[];
  observacoes?: string;
}

/**
 * Acrescenta ao histórico o que mudou entre a versão salva e a nova: criação, etapa e responsável.
 */
export function registrarMovimentacoes(
  anterior: Pick<Oportunidade, 'etapa' | 'responsavelId' | 'historico'> | null,
  nova: Pick<Oportunidade, 'etapa' | 'responsavelId'>,
  usuarioId: string,
  em: DataISO,
): MovimentacaoOportunidade[] {
  const historico = [...(anterior?.historico ?? [])];
  if (!anterior) {
    historico.push({ em, usuarioId, acao: 'criada', para: nova.etapa });
    return historico;
  }
  if (anterior.etapa !== nova.etapa)
    historico.push({ em, usuarioId, acao: 'etapa', de: anterior.etapa, para: nova.etapa });
  if (anterior.responsavelId !== nova.responsavelId)
    historico.push({
      em,
      usuarioId,
      acao: 'responsavel',
      de: anterior.responsavelId,
      para: nova.responsavelId,
    });
  return historico;
}

export function validarOportunidade(
  o: Pick<Oportunidade, 'nomeContato' | 'produto' | 'etapa' | 'telefone'>,
): void {
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
