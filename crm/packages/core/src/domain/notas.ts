import { dataValida } from './datas';
import { ErroValidacao } from './erros';
import type { DataISO, Registro } from './registro';

/**
 * Checklist pessoal (bloco de notas da reunião de 30/10/2026): cada item é só de quem o criou,
 * nem a administração vê o checklist dos outros.
 */
export interface ItemChecklist extends Registro {
  texto: string;
  feito?: boolean;
  /** Quando foi marcado como feito (data e hora ISO). */
  feitoEm?: DataISO;
}

/** Destinatário de um recado para toda a equipe. */
export const PARA_TODOS = '*';

/**
 * Recado da administração para um produtor ou para toda a equipe. O responsável é quem escreveu.
 * Cada destinatário marca o próprio "feito": num recado para todos, cada um tem o seu.
 */
export interface Recado extends Registro {
  texto: string;
  /** Id do usuário que recebe, ou PARA_TODOS. */
  para: string;
  prazo?: DataISO;
  /** Quem já fez, com a data e hora (ISO). */
  feitos?: Record<string, DataISO>;
}

const TAMANHO_MAXIMO = 500;

export function validarItemChecklist(i: Pick<ItemChecklist, 'texto'>): void {
  const texto = i.texto.trim();
  if (!texto) throw new ErroValidacao('Escreva o item.', { texto: 'Escreva o item.' });
  if (texto.length > TAMANHO_MAXIMO)
    throw new ErroValidacao('Item muito longo.', { texto: `Até ${TAMANHO_MAXIMO} caracteres.` });
}

export function validarRecado(r: Pick<Recado, 'texto' | 'para' | 'prazo'>): void {
  const campos: Record<string, string> = {};
  const texto = r.texto.trim();
  if (!texto) campos.texto = 'Escreva o recado.';
  else if (texto.length > TAMANHO_MAXIMO) campos.texto = `Até ${TAMANHO_MAXIMO} caracteres.`;
  if (!r.para) campos.para = 'Escolha para quem.';
  if (r.prazo && !dataValida(r.prazo)) campos.prazo = 'Data inválida.';
  if (Object.keys(campos).length) throw new ErroValidacao('Confira o recado.', campos);
}

/** O recado é para esta pessoa (diretamente ou para toda a equipe)? */
export const recadoPara = (r: Pick<Recado, 'para'>, usuarioId: string) =>
  r.para === PARA_TODOS || r.para === usuarioId;

/** Esta pessoa já marcou o recado como feito? */
export const recadoFeitoPor = (r: Pick<Recado, 'feitos'>, usuarioId: string) =>
  Boolean(r.feitos?.[usuarioId]);
