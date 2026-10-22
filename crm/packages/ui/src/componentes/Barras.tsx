import styles from './Barras.module.css';

export interface ItemBarra {
  rotulo: string;
  valor: number;
  /** Texto exibido no lugar do número (ex.: valor formatado). */
  valorTexto?: string;
  detalhe?: string;
  /** Identificador estável quando o rótulo pode se repetir (ex.: nome ainda carregando). */
  chave?: string;
}

/** Barras horizontais de uma série, ordenadas pelo chamador. Cada item tem rótulo e valor visíveis. */
export function Barras({ itens, rotulo }: { itens: ItemBarra[]; rotulo: string }) {
  const maximo = Math.max(1, ...itens.map((i) => i.valor));
  return (
    <ul className={styles.lista} aria-label={rotulo}>
      {itens.map((i, posicao) => {
        const texto = i.valorTexto ?? String(i.valor);
        return (
          <li
            key={i.chave ?? `${posicao}:${i.rotulo}`}
            className={styles.item}
            title={`${i.rotulo}: ${texto}${i.detalhe ? ` · ${i.detalhe}` : ''}`}
          >
            <span className={styles.rotulo}>{i.rotulo}</span>
            <span className={styles.valor}>
              {texto}
              {i.detalhe && <span className={styles.detalhe}>{i.detalhe}</span>}
            </span>
            <div className={styles.trilho} aria-hidden="true">
              <div className={styles.barra} style={{ width: `${(i.valor / maximo) * 100}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
