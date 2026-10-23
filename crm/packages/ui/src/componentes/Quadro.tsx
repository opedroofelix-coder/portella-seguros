import type { ReactNode } from 'react';
import styles from './Quadro.module.css';

export interface ColunaQuadro<T> {
  id: string;
  titulo: string;
  itens: T[];
}

export function Quadro<T>({
  colunas,
  chave,
  renderItem,
  rotulo,
}: {
  colunas: ColunaQuadro<T>[];
  chave: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  rotulo: string;
}) {
  return (
    <div className={styles.quadro} aria-label={rotulo} role="region" tabIndex={0}>
      {colunas.map((col) => (
        <section key={col.id} className={styles.coluna} aria-labelledby={`coluna-${col.id}`}>
          <header className={styles.colunaCabecalho}>
            <h2 id={`coluna-${col.id}`}>{col.titulo}</h2>
            <span className={styles.contagem}>{col.itens.length}</span>
          </header>
          {col.itens.length ? (
            <ul className={styles.lista}>
              {col.itens.map((item) => (
                <li key={chave(item)}>{renderItem(item)}</li>
              ))}
            </ul>
          ) : (
            <p className={styles.vazia}>Nenhum item.</p>
          )}
        </section>
      ))}
    </div>
  );
}
