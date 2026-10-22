import type { Repositorio } from '@portella/core';
import type { IDBPDatabase } from 'idb';
import { openDB } from 'idb';

export const COLECAO_USUARIOS = 'usuarios';
export const COLECAO_CREDENCIAIS = 'credenciais';

/**
 * Banco local no navegador (IndexedDB). Cada app tem o seu banco; as coleções de usuários e
 * credenciais são criadas sempre. Aumente `versao` ao acrescentar coleções.
 */
export class BancoLocal {
  private constructor(private readonly db: IDBPDatabase) {}

  static async abrir(nome: string, colecoes: string[], versao = 1): Promise<BancoLocal> {
    const todas = [COLECAO_USUARIOS, COLECAO_CREDENCIAIS, ...colecoes];
    const db = await openDB(nome, versao, {
      upgrade(banco) {
        for (const c of todas)
          if (!banco.objectStoreNames.contains(c)) banco.createObjectStore(c, { keyPath: 'id' });
      },
    });
    return new BancoLocal(db);
  }

  repositorio<T extends { id: string }>(colecao: string): Repositorio<T> {
    return new RepositorioIndexedDB<T>(this.db, colecao);
  }

  /** Apaga todos os dados das coleções informadas (usado na reimportação). */
  async limpar(colecoes: string[]): Promise<void> {
    const tx = this.db.transaction(colecoes, 'readwrite');
    await Promise.all([...colecoes.map((c) => tx.objectStore(c).clear()), tx.done]);
  }

  fechar(): void {
    this.db.close();
  }
}

class RepositorioIndexedDB<T extends { id: string }> implements Repositorio<T> {
  constructor(
    private readonly db: IDBPDatabase,
    private readonly colecao: string,
  ) {}

  listar(): Promise<T[]> {
    return this.db.getAll(this.colecao) as Promise<T[]>;
  }

  async obter(id: string): Promise<T | null> {
    return ((await this.db.get(this.colecao, id)) as T | undefined) ?? null;
  }

  async salvar(item: T): Promise<void> {
    await this.db.put(this.colecao, item);
  }

  async salvarVarios(itens: T[]): Promise<void> {
    const tx = this.db.transaction(this.colecao, 'readwrite');
    await Promise.all([...itens.map((i) => tx.store.put(i)), tx.done]);
  }

  async remover(id: string): Promise<void> {
    await this.db.delete(this.colecao, id);
  }
}
