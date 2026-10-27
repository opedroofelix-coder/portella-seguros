import type { ReactNode } from 'react';
import { useState } from 'react';
import { Abas } from './Abas';
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
  // Celular: uma etapa por vez, escolhida no seletor com a contagem (as colunas não cabem lado a lado).
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const ativa =
    colunas.find((c) => c.id === escolhida)?.id ?? colunas.find((c) => c.itens.length)?.id ?? colunas[0]?.id;
  return (
    <>
      <div className={styles.seletor}>
        <Abas
          rotulo={`Etapas de ${rotulo}`}
          ativa={ativa ?? ''}
          aoTrocar={setEscolhida}
          abas={colunas.map((c) => ({ id: c.id, rotulo: `${c.titulo} · ${c.itens.length}` }))}
        />
      </div>
      <div className={styles.quadro} aria-label={rotulo} role="region" tabIndex={0}>
        {colunas.map((col) => (
          <section
            key={col.id}
            className={styles.coluna}
            data-ativa={col.id === ativa || undefined}
            aria-labelledby={`coluna-${col.id}`}
          >
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
    </>
  );
}
