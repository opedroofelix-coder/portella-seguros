import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Cartao.module.css';

export function Cartao({
  titulo,
  acoes,
  children,
  className,
  ...props
}: { titulo?: ReactNode; acoes?: ReactNode } & HTMLAttributes<HTMLElement>) {
  return (
    <section className={[styles.cartao, className].filter(Boolean).join(' ')} {...props}>
      {(titulo || acoes) && (
        <header className={styles.cabecalho}>
          {titulo && <h2 className={styles.titulo}>{titulo}</h2>}
          {acoes}
        </header>
      )}
      {children}
    </section>
  );
}

export function Indicador({
  rotulo,
  valor,
  detalhe,
}: {
  rotulo: string;
  valor: ReactNode;
  detalhe?: ReactNode;
}) {
  return (
    <div className={`${styles.cartao} ${styles.indicador}`}>
      <span className={styles.indicadorRotulo}>{rotulo}</span>
      <strong
        className={styles.indicadorValor}
        data-longo={typeof valor === 'string' && valor.length > 8 ? '' : undefined}
      >
        {valor}
      </strong>
      {detalhe && <span className={styles.indicadorDetalhe}>{detalhe}</span>}
    </div>
  );
}

export function EstadoVazio({
  titulo,
  children,
  acao,
}: {
  titulo: string;
  children?: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <div className={styles.vazio}>
      <h3>{titulo}</h3>
      {children && <p>{children}</p>}
      {acao}
    </div>
  );
}

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div className={styles.carregando} role="status">
      <span className={styles.spinner} aria-hidden="true" />
      {texto}
    </div>
  );
}
