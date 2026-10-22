import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Cartao.module.css';
import type { NomeIcone } from './Icone';
import { Icone } from './Icone';

export type TomIndicador = 'primaria' | 'destaque' | 'sucesso' | 'alerta' | 'perigo' | 'info';

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

/** Número de destaque com faixa e ícone na cor do tom. O valor aparece acima do rótulo. */
export function Indicador({
  rotulo,
  valor,
  detalhe,
  tom = 'primaria',
  icone,
}: {
  rotulo: string;
  valor: ReactNode;
  detalhe?: ReactNode;
  tom?: TomIndicador;
  icone?: NomeIcone;
}) {
  return (
    <div className={`${styles.cartao} ${styles.indicador} ${styles[tom]}`}>
      {icone && (
        <span className={styles.indicadorIcone} aria-hidden="true">
          <Icone nome={icone} tamanho={18} />
        </span>
      )}
      <span className={styles.indicadorRotulo}>{rotulo}</span>
      <strong
        className={styles.indicadorValor}
        data-longo={typeof valor === 'string' && (valor.length > 8 || valor.includes('R$')) ? '' : undefined}
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
