import type { ReactNode } from 'react';
import styles from './Selo.module.css';

export type TomSelo = 'neutro' | 'sucesso' | 'alerta' | 'perigo' | 'info' | 'dourado';

export function Selo({ tom = 'neutro', children }: { tom?: TomSelo; children: ReactNode }) {
  return <span className={`${styles.selo} ${styles[tom]}`}>{children}</span>;
}
