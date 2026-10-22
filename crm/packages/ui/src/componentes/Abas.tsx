import type { KeyboardEvent } from 'react';
import { useId, useRef } from 'react';
import styles from './Abas.module.css';

export function Abas<K extends string>({
  abas,
  ativa,
  aoTrocar,
  rotulo,
}: {
  abas: Array<{ id: K; rotulo: string }>;
  ativa: K;
  aoTrocar: (id: K) => void;
  rotulo: string;
}) {
  const base = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const teclado = (e: KeyboardEvent, i: number) => {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    const proxima = (i + delta + abas.length) % abas.length;
    const aba = abas[proxima];
    if (!aba) return;
    aoTrocar(aba.id);
    refs.current[proxima]?.focus();
  };
  return (
    <div className={styles.abas} role="tablist" aria-label={rotulo}>
      {abas.map((a, i) => (
        <button
          key={a.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          id={`${base}-${a.id}`}
          role="tab"
          type="button"
          className={styles.aba}
          aria-selected={a.id === ativa}
          tabIndex={a.id === ativa ? 0 : -1}
          onClick={() => aoTrocar(a.id)}
          onKeyDown={(e) => teclado(e, i)}
        >
          {a.rotulo}
        </button>
      ))}
    </div>
  );
}
