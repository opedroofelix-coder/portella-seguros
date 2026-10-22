import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import styles from './Botao.module.css';
import type { NomeIcone } from './Icone';
import { Icone } from './Icone';

export type VarianteBotao = 'primario' | 'secundario' | 'fantasma' | 'perigo';

export interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBotao;
  pequeno?: boolean;
  blocoInteiro?: boolean;
  carregando?: boolean;
  icone?: NomeIcone;
  /** Botão só com ícone: o texto vira o rótulo acessível. */
  soIcone?: boolean;
  children?: ReactNode;
}

export function classesBotao({
  variante = 'primario',
  pequeno,
  blocoInteiro,
  soIcone,
}: Pick<BotaoProps, 'variante' | 'pequeno' | 'blocoInteiro' | 'soIcone'> = {}): string {
  return [
    styles.botao,
    styles[variante],
    pequeno && styles.pequeno,
    blocoInteiro && styles.blocoInteiro,
    soIcone && styles.soIcone,
  ]
    .filter(Boolean)
    .join(' ');
}

export const Botao = forwardRef<HTMLButtonElement, BotaoProps>(function Botao(
  {
    variante,
    pequeno,
    blocoInteiro,
    carregando,
    icone,
    soIcone,
    className,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={[classesBotao({ variante, pequeno, blocoInteiro, soIcone }), className]
        .filter(Boolean)
        .join(' ')}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      aria-label={soIcone && typeof children === 'string' ? children : props['aria-label']}
      title={soIcone && typeof children === 'string' ? children : props.title}
      {...props}
    >
      {carregando ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : (
        icone && <Icone nome={icone} tamanho={18} />
      )}
      {soIcone ? null : children}
    </button>
  );
});
