import { normalizar } from '../domain/cliente';
import { ErroValidacao } from '../domain/erros';
import type { Usuario } from '../domain/usuario';
import type { Ambiente } from '../ports/relogio';
import { ambientePadrao } from '../ports/relogio';
import type { Repositorio } from '../ports/repositorio';
import { exigir } from './permissoes';

export type TipoCatalogo = 'produtos' | 'seguradoras';

/** Lista editável (produtos, seguradoras). O id do registro é o tipo do catálogo. */
export interface Catalogo {
  id: TipoCatalogo;
  itens: string[];
  atualizadoEm: string;
}

/** Ordena sem diferenciar acentos e remove repetidos ("Saude" e "Saúde" contam como um só). */
export function limparItens(itens: string[]): string[] {
  const vistos = new Map<string, string>();
  for (const bruto of itens) {
    const item = bruto.trim().replace(/\s+/g, ' ');
    if (item && !vistos.has(normalizar(item))) vistos.set(normalizar(item), item);
  }
  return [...vistos.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/** Todos consultam (para preencher a proposta); só administrador e gestor alteram. */
export class ServicoCatalogos {
  constructor(
    private readonly repositorio: Repositorio<Catalogo>,
    private readonly padroes: Record<TipoCatalogo, string[]>,
    private readonly ambiente: Ambiente = ambientePadrao,
  ) {}

  async obter(tipo: TipoCatalogo): Promise<string[]> {
    return (await this.repositorio.obter(tipo))?.itens ?? limparItens(this.padroes[tipo]);
  }

  async salvar(usuario: Usuario, tipo: TipoCatalogo, itens: string[]): Promise<string[]> {
    exigir(usuario, 'financeiro:gerenciar');
    const limpos = limparItens(itens);
    if (!limpos.length) throw new ErroValidacao('A lista não pode ficar vazia.');
    await this.repositorio.salvar({
      id: tipo,
      itens: limpos,
      atualizadoEm: this.ambiente.agora().toISOString(),
    });
    return limpos;
  }

  /** Inclui itens novos (ex.: seguradoras vindas da importação) sem tirar os existentes. */
  async incluir(usuario: Usuario, tipo: TipoCatalogo, itens: string[]): Promise<string[]> {
    return this.salvar(usuario, tipo, [...(await this.obter(tipo)), ...itens]);
  }
}
