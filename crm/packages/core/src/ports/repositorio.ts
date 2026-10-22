/** Persistência genérica. Implementada por IndexedDB hoje e por um backend real no futuro. */
export interface Repositorio<T extends { id: string }> {
  listar(): Promise<T[]>;
  obter(id: string): Promise<T | null>;
  salvar(item: T): Promise<void>;
  salvarVarios(itens: T[]): Promise<void>;
  remover(id: string): Promise<void>;
}
